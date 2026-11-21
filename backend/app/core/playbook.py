"""
TraceScope Playbook Synthesis Engine
Compiles concrete, deterministic incident containment scripts in PowerShell.
Directly targets the verified blast radius (processes, dropped files, C2 sockets).
"""

from typing import List, Dict
from ..schemas.graph import CausalGraphResponse, PlaybookResponse
from ..schemas.alert import TraceScopeAlert


class PlaybookGenerator:
    @staticmethod
    def generate_playbook(alert: TraceScopeAlert, causal_resp: CausalGraphResponse) -> PlaybookResponse:
        """Synthesizes actionable PowerShell containment commands based on graph findings."""
        pids_to_kill: List[int] = []
        files_to_quarantine: List[str] = []
        ips_to_block: List[str] = []
        actions_breakdown: List[Dict[str, str]] = []

        for node in causal_resp.nodes:
            d = node.data
            if d.entity_type == "process" and d.pid and d.pid > 4:
                # Do not kill core system processes
                image_name = (d.image or "").lower()
                if not any(crit in image_name for crit in ["system", "smss.exe", "csrss.exe", "wininit.exe"]):
                    pids_to_kill.append(d.pid)
                    actions_breakdown.append({
                        "category": "Process Containment",
                        "target": f"{d.image} (PID {d.pid})",
                        "action": f"Terminate malicious process tree for PID {d.pid}"
                    })

            elif d.entity_type == "file" and d.label:
                target_file = d.details.get("target_filename") or d.label
                files_to_quarantine.append(target_file)
                actions_breakdown.append({
                    "category": "File Remediation",
                    "target": target_file,
                    "action": f"Quarantine/Remove dropped artifact: {target_file}"
                })

            elif d.entity_type == "network":
                ip = d.details.get("ip")
                if ip and ip not in ("127.0.0.1", "0.0.0.0", "localhost"):
                    ips_to_block.append(ip)
                    actions_breakdown.append({
                        "category": "Network Isolation",
                        "target": ip,
                        "action": f"Add Windows Firewall outbound block rule for C2 IP {ip}"
                    })

        # Assemble PowerShell script
        ps_lines = [
            "# ==========================================================================",
            f"# TRACESCOPE AI INCIDENT CONTAINMENT PLAYBOOK",
            f"# Incident Alert ID : {alert.alert_id}",
            f"# Severity           : {alert.severity}",
            f"# MITRE Technique    : {alert.mitre_attack.technique_id} ({alert.mitre_attack.technique_name})",
            "# ==========================================================================",
            "",
            "$ErrorActionPreference = 'SilentlyContinue'",
            "Write-Host '[*] TraceScope: Initiating Incident Containment Protocol...' -ForegroundColor Yellow",
            ""
        ]

        if pids_to_kill:
            ps_lines.append("# --- 1. Terminate Malicious Process Lineage ---")
            for pid in set(pids_to_kill):
                ps_lines.append(f"try {{ Stop-Process -Id {pid} -Force; Write-Host '[+] Terminated PID {pid}' -ForegroundColor Green }} catch {{ Write-Warning 'Could not kill PID {pid}' }}")
            ps_lines.append("")

        if ips_to_block:
            ps_lines.append("# --- 2. Block Command & Control Network Endpoints ---")
            for ip in set(ips_to_block):
                rule_name = f"TraceScope-Block-{ip.replace('.', '_')}"
                ps_lines.append(
                    f"New-NetFirewallRule -DisplayName '{rule_name}' -Direction Outbound -Action Block -RemoteAddress '{ip}' | Out-Null; "
                    f"Write-Host '[+] Blocked outbound traffic to {ip}' -ForegroundColor Green"
                )
            ps_lines.append("")

        if files_to_quarantine:
            ps_lines.append("# --- 3. Quarantine Dropped Malicious Artifacts ---")
            ps_lines.append("$QuarantineDir = 'C:\\ProgramData\\TraceScope\\Quarantine'")
            ps_lines.append("if (!(Test-Path $QuarantineDir)) { New-Item -ItemType Directory -Path $QuarantineDir -Force | Out-Null }")
            for fpath in set(files_to_quarantine):
                ps_lines.append(
                    f"if (Test-Path '{fpath}') {{ "
                    f"Move-Item -Path '{fpath}' -Destination $QuarantineDir -Force; "
                    f"Write-Host '[+] Quarantined {fpath}' -ForegroundColor Green }}"
                )
            ps_lines.append("")

        ps_lines.append("Write-Host '[+] TraceScope: Containment Actions Complete.' -ForegroundColor Cyan")

        verification_steps = [
            f"Verify processes ({', '.join(str(p) for p in set(pids_to_kill))}) are no longer running via Get-Process.",
            f"Check Windows Firewall outbound rules for active blocks: Get-NetFirewallRule -DisplayName 'TraceScope-Block*'.",
            "Inspect C:\\ProgramData\\TraceScope\\Quarantine for quarantined binaries."
        ]

        return PlaybookResponse(
            alert_id=alert.alert_id,
            script_type="PowerShell",
            powershell_script="\n".join(ps_lines),
            actions_breakdown=actions_breakdown,
            verification_steps=verification_steps,
            safety_warning="Review containment script before running with elevated Administrator privileges."
        )

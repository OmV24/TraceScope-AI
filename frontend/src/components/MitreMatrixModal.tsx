import React from 'react';
import { X, ShieldAlert, CheckCircle2, ExternalLink, Zap, Terminal } from 'lucide-react';

interface MitreMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTechniqueIds: string[];
  onSelectTechnique: (techniqueId: string) => void;
}

interface Technique {
  id: string;
  name: string;
  tactic: string;
  description: string;
}

const ALL_TACTICS = [
  {
    name: 'Initial Access',
    techniques: [
      { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'Initial Access', description: 'Malicious Office document attachment delivered via email.' },
      { id: 'T1190', name: 'Exploit Public App', tactic: 'Initial Access', description: 'Exploiting external facing service vulnerabilities.' }
    ]
  },
  {
    name: 'Execution',
    techniques: [
      { id: 'T1059.001', name: 'PowerShell', tactic: 'Execution', description: 'PowerShell scripts with execution bypass and encoded payload flags.' },
      { id: 'T1204.002', name: 'Malicious File', tactic: 'Execution', description: 'User execution of dropped malicious binary.' },
      { id: 'T1059.003', name: 'Windows Command Shell', tactic: 'Execution', description: 'Execution via cmd.exe.' }
    ]
  },
  {
    name: 'Persistence',
    techniques: [
      { id: 'T1547.001', name: 'Registry Run Keys', tactic: 'Persistence', description: 'Autostart execution key added to HKLM/HKCU CurrentVersion\\Run.' },
      { id: 'T1053.005', name: 'Scheduled Task', tactic: 'Persistence', description: 'Persistence via Windows Task Scheduler.' }
    ]
  },
  {
    name: 'Defense Evasion',
    techniques: [
      { id: 'T1027', name: 'Obfuscated Files/Info', tactic: 'Defense Evasion', description: 'Base64 encoded commands, encrypted payloads, and packed binaries.' },
      { id: 'T1055', name: 'Process Injection', tactic: 'Defense Evasion', description: 'Memory injection, IAT hooking, or hollow process injection.' }
    ]
  },
  {
    name: 'Discovery',
    techniques: [
      { id: 'T1033', name: 'System Owner/User Discovery', tactic: 'Discovery', description: 'Querying local user account details via whoami.' },
      { id: 'T1069.002', name: 'Domain Groups Discovery', tactic: 'Discovery', description: 'Enumerating Domain Admins via net group /domain.' }
    ]
  },
  {
    name: 'Command & Control',
    techniques: [
      { id: 'T1071.001', name: 'Web Protocols (HTTP/S)', tactic: 'Command and Control', description: 'Outbound HTTP/HTTPS beaconing to remote C2 IP on port 80/443.' },
      { id: 'T1573', name: 'Encrypted Channel', tactic: 'Command and Control', description: 'Symmetric or asymmetric encryption for C2 channel.' }
    ]
  },
  {
    name: 'Impact',
    techniques: [
      { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'Impact', description: 'Mass encryption of victim data with ransom note dropped.' },
      { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'Impact', description: 'Deleting volume shadow copies via vssadmin.' }
    ]
  }
];

export const MitreMatrixModal: React.FC<MitreMatrixModalProps> = ({
  isOpen,
  onClose,
  activeTechniqueIds,
  onSelectTechnique
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0B101D] border border-slate-800/90 rounded-3xl w-full max-w-6xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-[#0E1526]/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/10">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-sm font-black uppercase tracking-wider text-white font-sans">
                  MITRE ATT&CK Enterprise Matrix Navigator
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                  {activeTechniqueIds.length} Detected Techniques Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5">
                Click any illuminated technique card to automatically pan and focus the mathematical provenance path on the canvas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Matrix Grid */}
        <div className="flex-1 overflow-x-auto p-6 bg-[#070A12]/50">
          <div className="grid grid-cols-7 gap-3.5 min-w-[1000px]">
            {ALL_TACTICS.map((tactic) => (
              <div key={tactic.name} className="flex flex-col gap-2.5">
                {/* Column Header */}
                <div className="px-3 py-2 rounded-xl bg-[#0E1526] border border-slate-800/80 text-center shadow-sm">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-300 block truncate font-mono" title={tactic.name}>
                    {tactic.name}
                  </span>
                </div>

                {/* Techniques */}
                <div className="space-y-2.5">
                  {tactic.techniques.map((tech) => {
                    const isActive = activeTechniqueIds.some(
                      (id) => id.toLowerCase() === tech.id.toLowerCase()
                    );

                    return (
                      <div
                        key={tech.id}
                        onClick={() => {
                          if (isActive) {
                            onSelectTechnique(tech.id);
                            onClose();
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition-all duration-200 select-none ${
                          isActive
                            ? 'bg-rose-950/20 border-rose-500/60 shadow-lg shadow-rose-950/40 cursor-pointer hover:border-rose-400 hover:scale-[1.02]'
                            : 'bg-[#0E1526]/40 border-slate-800/60 opacity-40 cursor-default'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[10px] font-mono font-extrabold ${
                              isActive ? 'text-rose-400' : 'text-slate-500'
                            }`}
                          >
                            {tech.id}
                          </span>
                          {isActive && (
                            <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                            </span>
                          )}
                        </div>

                        <div className={`text-xs font-bold leading-tight font-sans ${isActive ? 'text-white' : 'text-slate-500'}`}>
                          {tech.name}
                        </div>

                        <p className={`text-[10px] mt-1.5 leading-relaxed font-sans line-clamp-2 ${isActive ? 'text-slate-300' : 'text-slate-600'}`}>
                          {tech.description}
                        </p>

                        {isActive && (
                          <div className="mt-2.5 pt-2 border-t border-rose-500/20 flex items-center justify-between text-[10px] text-rose-300 font-bold font-mono">
                            <span>Locate on Graph</span>
                            <Zap className="w-3 h-3 fill-rose-400 text-rose-400" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800/80 bg-[#0E1526]/70 flex items-center justify-between text-xs text-slate-400 font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Active techniques grounded in verified Sysmon Event IDs (1, 3, 11, 13) and XGBoost classification.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition font-sans"
          >
            Close Matrix
          </button>
        </div>
      </div>
    </div>
  );
};

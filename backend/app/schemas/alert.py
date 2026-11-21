"""
TraceScope Alert Ingestion Schema (Pydantic Model)
Defines the input contract for security alerts ingested by TraceScope AI.
Solves the Windows PID reuse problem by anchoring provenance on Sysmon ProcessGuid.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field


class HostInfo(BaseModel):
    hostname: str = Field(..., description="Target machine hostname or FQDN")
    domain: Optional[str] = Field(None, description="Active Directory domain")
    ip_address: Optional[str] = Field(None, description="Primary IPv4 address")


class DetectorInfo(BaseModel):
    name: str = Field(..., description="Detector name (e.g. ICMLDE-XGBoost, Sigma, EDR)")
    version: Optional[str] = Field("1.0", description="Detector version")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Model confidence score")
    raw_anomaly_score: Optional[float] = Field(None, description="Raw model anomaly score")


class MitreAttack(BaseModel):
    tactic: str = Field(..., description="MITRE ATT&CK Tactic (e.g. Execution, Persistence)")
    technique_id: str = Field(..., description="Technique ID (e.g. T1059.001)")
    technique_name: str = Field(..., description="Technique Name (e.g. PowerShell)")


class SeedEntity(BaseModel):
    entity_type: str = Field("process", description="process | file | network_connection")
    process_guid: str = Field(..., description="Sysmon globally unique ProcessGuid {GUID}")
    pid: int = Field(..., description="Windows Process ID at alert time")
    image: str = Field(..., description="Full binary path on disk")
    command_line: Optional[str] = Field(None, description="Exact command line execution string")
    user: Optional[str] = Field(None, description="User or service account context")
    parent_process_guid: Optional[str] = Field(None, description="Parent ProcessGuid if known")
    parent_image: Optional[str] = Field(None, description="Parent binary image if known")


class EvidenceContext(BaseModel):
    sysmon_event_id: Optional[int] = Field(None, description="Sysmon Event ID (e.g. 1, 3, 11)")
    hashes: Optional[Dict[str, str]] = Field(default_factory=dict, description="File hashes (sha256, md5)")
    target_file: Optional[str] = Field(None, description="File path touched if file event")
    destination_ip: Optional[str] = Field(None, description="Remote IP for network events")
    destination_port: Optional[int] = Field(None, description="Remote Port for network events")
    extra: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Arbitrary detector metadata")


class TraceScopeAlert(BaseModel):
    alert_id: str = Field(..., description="Unique alert identifier")
    timestamp: str = Field(..., description="ISO-8601 UTC timestamp")
    host: HostInfo
    detector: DetectorInfo
    severity: str = Field(..., description="INFO | LOW | MEDIUM | HIGH | CRITICAL")
    title: str = Field(..., description="Short descriptive alert summary")
    mitre_attack: MitreAttack
    seed_entity: SeedEntity
    evidence_context: Optional[EvidenceContext] = Field(default_factory=EvidenceContext)

"""
TraceScope Graph & Response Schemas
Structures data for the React Flow frontend, the G-RAG AI investigator,
the AI SOC Copilot chat, and deterministic containment playbooks.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class NodeData(BaseModel):
    label: str
    entity_type: str  # process | file | network | registry
    process_guid: Optional[str] = None
    pid: Optional[int] = None
    image: Optional[str] = None
    command_line: Optional[str] = None
    user: Optional[str] = None
    timestamp: Optional[str] = None
    is_seed: bool = False
    is_root_cause: bool = False
    is_blast_radius: bool = False
    mitre_technique: Optional[str] = None
    step_number: Optional[int] = None
    is_active_step: Optional[bool] = False
    details: Dict[str, Any] = Field(default_factory=dict)


class NodePosition(BaseModel):
    x: float = 0.0
    y: float = 0.0


class ReactFlowNode(BaseModel):
    id: str
    type: str = "customNode"
    data: NodeData
    position: NodePosition = Field(default_factory=NodePosition)


class ReactFlowEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    animated: bool = False
    style: Optional[Dict[str, Any]] = None


class GraphSummary(BaseModel):
    total_nodes: int
    total_edges: int
    root_cause_guid: Optional[str] = None
    seed_alert_id: Optional[str] = None
    earliest_timestamp: Optional[str] = None
    latest_timestamp: Optional[str] = None
    compromised_processes_count: int
    files_dropped_count: int
    network_connections_count: int


class CausalGraphResponse(BaseModel):
    alert_id: str
    summary: GraphSummary
    nodes: List[ReactFlowNode]
    edges: List[ReactFlowEdge]


class IncidentDossier(BaseModel):
    alert_id: str
    executive_summary: str
    root_cause_analysis: str
    attack_chain_timeline: List[Dict[str, Any]]
    mitre_techniques_observed: List[Dict[str, str]]
    blast_radius_summary: str
    confidence_assessment: str


class PlaybookResponse(BaseModel):
    alert_id: str
    script_type: str = "PowerShell"
    powershell_script: str
    actions_breakdown: List[Dict[str, str]]
    verification_steps: List[str]
    safety_warning: str


class ChatMessage(BaseModel):
    role: str  # user | assistant
    content: str


class ChatQueryRequest(BaseModel):
    alert_id: str
    query: str
    history: List[ChatMessage] = Field(default_factory=list)


class ChatQueryResponse(BaseModel):
    answer: str
    cited_node_ids: List[str] = Field(default_factory=list)
    mitre_techniques: List[str] = Field(default_factory=list)

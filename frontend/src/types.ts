export interface HostInfo {
  hostname: string;
  domain?: string;
  ip_address?: string;
}

export interface DetectorInfo {
  name: string;
  version?: string;
  confidence: number;
  raw_anomaly_score?: number;
}

export interface MitreAttack {
  tactic: string;
  technique_id: string;
  technique_name: string;
}

export interface SeedEntity {
  entity_type: string;
  process_guid: string;
  pid: number;
  image: string;
  command_line?: string;
  user?: string;
  parent_process_guid?: string;
  parent_image?: string;
}

export interface TraceScopeAlert {
  alert_id: string;
  timestamp: string;
  host: HostInfo;
  detector: DetectorInfo;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  mitre_attack: MitreAttack;
  seed_entity: SeedEntity;
}

export interface NodeData {
  label: string;
  entity_type: 'process' | 'file' | 'network' | 'registry';
  process_guid?: string;
  pid?: number;
  image?: string;
  command_line?: string;
  user?: string;
  timestamp?: string;
  is_seed: boolean;
  is_root_cause: boolean;
  is_blast_radius: boolean;
  mitre_technique?: string;
  step_number?: number;
  is_active_step?: boolean;
  details?: Record<string, any>;
}

export interface ReactFlowNode {
  id: string;
  type: string;
  data: NodeData;
  position: { x: number; y: number };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface GraphSummary {
  total_nodes: number;
  total_edges: number;
  root_cause_guid?: string;
  seed_alert_id?: string;
  compromised_processes_count: number;
  files_dropped_count: number;
  network_connections_count: number;
}

export interface CausalGraphResponse {
  alert_id: string;
  summary: GraphSummary;
  nodes: ReactFlowNode[];
  edges: ReactFlowEdge[];
}

export interface TimelineEntry {
  timestamp: string;
  stage: string;
  description: string;
}

export interface IncidentDossier {
  alert_id: string;
  executive_summary: string;
  root_cause_analysis: string;
  attack_chain_timeline: TimelineEntry[];
  mitre_techniques_observed: Array<{
    technique_id: string;
    name: string;
    evidence: string;
  }>;
  blast_radius_summary: string;
  confidence_assessment: string;
}

export interface PlaybookResponse {
  alert_id: string;
  script_type: string;
  powershell_script: string;
  actions_breakdown: Array<{
    category: string;
    target: string;
    action: string;
  }>;
  verification_steps: string[];
  safety_warning: string;
}

export interface RawTelemetryLog {
  id: string;
  event_id: number;
  timestamp: string;
  image: string;
  process_guid: string;
  pid?: number;
  action: string;
  details: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

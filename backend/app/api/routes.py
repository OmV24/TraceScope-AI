"""
TraceScope FastAPI REST Routes
Handles alert ingestion, incident-clustered causal graph generation,
raw telemetry event streams, G-RAG AI investigations, interactive Copilot chat,
and deterministic containment playbooks.
"""

import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from ..schemas.alert import TraceScopeAlert
from ..schemas.graph import (
    CausalGraphResponse, 
    IncidentDossier, 
    PlaybookResponse,
    ChatQueryRequest,
    ChatQueryResponse
)
from ..core.graph_engine import ProvenanceGraphEngine
from ..core.causal_tracer import CausalTracer
from ..core.grag_engine import GRAGInvestigator
from ..core.playbook import PlaybookGenerator
from ..config import DATA_DIR, SAMPLE_ALERTS_DIR, GEMINI_API_KEY
from ..core.ingestion import TelemetryIngestor

router = APIRouter(prefix="/api/v1")

# Global state instances
graph_engine = ProvenanceGraphEngine()
investigator = GRAGInvestigator(api_key=GEMINI_API_KEY)
alerts_db: Dict[str, TraceScopeAlert] = {}
cached_raw_events: List[Dict[str, Any]] = []


def initialize_graph():
    """Initializes in-memory graph from all raw telemetry files (APT29 + Cerberus NLME) and alerts."""
    global graph_engine, cached_raw_events
    raw_dir = DATA_DIR / "raw"
    cached_raw_events = []
    
    if raw_dir.exists():
        total_evs = 0
        for raw_file in raw_dir.glob("*.jsonl"):
            events = TelemetryIngestor.load_from_json_file(str(raw_file))
            graph_engine.build_from_events(events)
            total_evs += len(events)
            
            for idx, ev in enumerate(events):
                details = ev.command_line or ev.target_filename or (f"{ev.destination_ip}:{ev.destination_port}" if ev.destination_ip else ev.image)
                cached_raw_events.append({
                    "id": f"{raw_file.stem}_{idx}",
                    "event_id": ev.event_id,
                    "timestamp": ev.timestamp.isoformat(),
                    "image": ev.image,
                    "process_guid": ev.process_guid,
                    "pid": ev.pid,
                    "action": ev.event_type,
                    "details": details
                })
        cached_raw_events.sort(key=lambda x: x["timestamp"])
        print(f"[TraceScope] Provenance DAG online: {total_evs} events across {graph_engine.graph.number_of_nodes()} entities, {graph_engine.graph.number_of_edges()} edges.")

    # Load all sample alerts
    if SAMPLE_ALERTS_DIR.exists():
        for alert_file in SAMPLE_ALERTS_DIR.glob("*.json"):
            try:
                with open(alert_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    alert = TraceScopeAlert(**data)
                    alerts_db[alert.alert_id] = alert
                    print(f"[TraceScope] Loaded alert: {alert.alert_id} ({alert.seed_entity.image.split('\\')[-1]})")
            except Exception as e:
                print(f"[TraceScope] Error loading alert {alert_file}: {e}")


@router.get("/health")
def health_check():
    return {
        "status": "online",
        "engine": "TraceScope Multi-Dataset Provenance & G-RAG Engine",
        "graph_nodes": graph_engine.graph.number_of_nodes(),
        "graph_edges": graph_engine.graph.number_of_edges(),
        "registered_alerts": len(alerts_db),
        "cached_telemetry_events": len(cached_raw_events),
        "supported_datasets": ["Mordor APT29", "Cerberus-Trace (NLME)"]
    }


@router.get("/telemetry/events")
def get_raw_telemetry_events(limit: int = 250):
    """Returns normalized telemetry events for the raw Sysmon stream table."""
    return cached_raw_events[:limit]


@router.post("/alerts/ingest", response_model=Dict[str, Any])
def ingest_alert(alert: TraceScopeAlert):
    """Ingests a new alert from ICMLDE, Sigma, or EDR detector."""
    alerts_db[alert.alert_id] = alert
    node_id = graph_engine.find_node_by_guid_or_pid(
        alert.seed_entity.process_guid,
        alert.seed_entity.pid
    )
    return {
        "status": "success",
        "alert_id": alert.alert_id,
        "seed_found_in_graph": node_id is not None,
        "matched_node_id": node_id
    }


@router.get("/alerts", response_model=List[TraceScopeAlert])
def get_alerts():
    """Returns all ingested alerts for SOC analyst triage."""
    return list(alerts_db.values())


@router.get("/alerts/{alert_id}", response_model=TraceScopeAlert)
def get_alert(alert_id: str):
    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert ID not found")
    return alerts_db[alert_id]


@router.get("/graph/all", response_model=CausalGraphResponse)
def get_all_host_graph():
    """Returns the complete process forest across all active datasets with multi-tree layout."""
    tracer = CausalTracer(graph_engine.graph)
    return tracer.build_full_graph_response()


@router.get("/graph/{alert_id}", response_model=CausalGraphResponse)
def get_causal_graph(alert_id: str):
    """
    Slices the provenance graph into a React Flow DAG for:
    - Specific Alert ID (e.g. ALT-2026-APT29-001)
    - CORRELATE_APT29 (Incident 1: APT29 Multi-Stage Kill Chain)
    - CORRELATE_CERBERUS (Incident 2: Cerberus Malware & Trojan Injection)
    - ALL / CORRELATE_ALL (All active alerts)
    """
    tracer = CausalTracer(graph_engine.graph)

    # Incident 1: APT29 Cluster
    if alert_id.upper() in ("CORRELATE_APT29", "APT29"):
        seed_nodes = []
        for a in alerts_db.values():
            if "APT29" in a.alert_id:
                s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
                if s:
                    seed_nodes.append(s)
        return tracer.build_multi_seed_response("INCIDENT-APT29-KILLCHAIN", seed_nodes)

    # Incident 2: Cerberus Cluster
    elif alert_id.upper() in ("CORRELATE_CERBERUS", "CERBERUS"):
        seed_nodes = []
        for a in alerts_db.values():
            if "CERBERUS" in a.alert_id:
                s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
                if s:
                    seed_nodes.append(s)
        return tracer.build_multi_seed_response("INCIDENT-CERBERUS-OUTBREAK", seed_nodes)

    # All active alerts
    elif alert_id.upper() in ("ALL", "CORRELATE_ALL"):
        seed_nodes = []
        for a in alerts_db.values():
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        return tracer.build_multi_seed_response("UNIFIED_MULTI_ALERT_INCIDENT", seed_nodes)

    if alert_id not in alerts_db:
        raise HTTPException(status_code=404, detail="Alert ID not found")

    alert = alerts_db[alert_id]
    seed_node = graph_engine.find_node_by_guid_or_pid(
        alert.seed_entity.process_guid,
        alert.seed_entity.pid
    )
    if not seed_node:
        raise HTTPException(status_code=400, detail=f"Seed entity {alert.seed_entity.process_guid} not found in telemetry graph.")

    return tracer.build_causal_response(alert_id, seed_node)


# NOTE: /investigate/chat MUST be declared BEFORE /investigate/{alert_id}
@router.post("/investigate/chat", response_model=ChatQueryResponse)
def copilot_chat(req: ChatQueryRequest):
    """Interactive SOC Copilot endpoint grounded exclusively in the causal graph."""
    tracer = CausalTracer(graph_engine.graph)
    target_id = req.alert_id

    if target_id.upper() in ("CORRELATE_APT29", "APT29"):
        seed_nodes = []
        target_alerts = [a for a in alerts_db.values() if "APT29" in a.alert_id]
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("INCIDENT-APT29-KILLCHAIN", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    elif target_id.upper() in ("CORRELATE_CERBERUS", "CERBERUS"):
        seed_nodes = []
        target_alerts = [a for a in alerts_db.values() if "CERBERUS" in a.alert_id]
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("INCIDENT-CERBERUS-OUTBREAK", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    elif target_id.upper() in ("ALL", "CORRELATE_ALL"):
        seed_nodes = []
        target_alerts = list(alerts_db.values())
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("UNIFIED_MULTI_ALERT_INCIDENT", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    else:
        if target_id not in alerts_db:
            raise HTTPException(status_code=404, detail="Alert ID not found")
        primary_alert = alerts_db[target_id]
        seed_node = graph_engine.find_node_by_guid_or_pid(
            primary_alert.seed_entity.process_guid,
            primary_alert.seed_entity.pid
        )
        if not seed_node:
            raise HTTPException(status_code=400, detail="Seed node not found in graph.")
        causal_resp = tracer.build_causal_response(target_id, seed_node)

    if not primary_alert:
        raise HTTPException(status_code=400, detail="No active alert context.")

    return investigator.answer_analyst_query(
        primary_alert,
        causal_resp,
        req.query,
        req.history
    )


@router.post("/investigate/{alert_id}")
def full_investigation(alert_id: str):
    """
    Complete end-to-end investigation pipeline:
    Supports clustered incident correlation or individual alerts.
    """
    tracer = CausalTracer(graph_engine.graph)

    if alert_id.upper() in ("CORRELATE_APT29", "APT29"):
        seed_nodes = []
        target_alerts = [a for a in alerts_db.values() if "APT29" in a.alert_id]
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("INCIDENT-APT29-KILLCHAIN", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    elif alert_id.upper() in ("CORRELATE_CERBERUS", "CERBERUS"):
        seed_nodes = []
        target_alerts = [a for a in alerts_db.values() if "CERBERUS" in a.alert_id]
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("INCIDENT-CERBERUS-OUTBREAK", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    elif alert_id.upper() in ("ALL", "CORRELATE_ALL"):
        seed_nodes = []
        target_alerts = list(alerts_db.values())
        for a in target_alerts:
            s = graph_engine.find_node_by_guid_or_pid(a.seed_entity.process_guid, a.seed_entity.pid)
            if s:
                seed_nodes.append(s)
        causal_resp = tracer.build_multi_seed_response("UNIFIED_MULTI_ALERT_INCIDENT", seed_nodes)
        primary_alert = target_alerts[0] if target_alerts else None

    else:
        if alert_id not in alerts_db:
            raise HTTPException(status_code=404, detail="Alert ID not found")
        primary_alert = alerts_db[alert_id]
        seed_node = graph_engine.find_node_by_guid_or_pid(
            primary_alert.seed_entity.process_guid,
            primary_alert.seed_entity.pid
        )
        if not seed_node:
            raise HTTPException(status_code=400, detail=f"Seed entity {primary_alert.seed_entity.process_guid} not found in telemetry graph.")
        causal_resp = tracer.build_causal_response(alert_id, seed_node)

    if not primary_alert:
        raise HTTPException(status_code=400, detail="No active alerts to correlate.")

    dossier = investigator.generate_dossier(primary_alert, causal_resp)
    playbook = PlaybookGenerator.generate_playbook(primary_alert, causal_resp)

    return {
        "alert": primary_alert,
        "causal_graph": causal_resp,
        "incident_dossier": dossier,
        "playbook": playbook
    }

"""
TraceScope Provenance Graph Engine
Constructs a temporal Directed Acyclic Graph (DAG) using NetworkX.
Links processes, files, sockets, and registry keys via causal event edges.
"""

import networkx as nx
from typing import Dict, Any, Optional, List, Set
from .ingestion import NormalizedEvent


class ProvenanceGraphEngine:
    def __init__(self):
        self.graph = nx.DiGraph()
        # Fast lookup indexes
        self.process_nodes: Set[str] = set()
        self.guid_to_metadata: Dict[str, Dict[str, Any]] = {}

    def build_from_events(self, events: List[NormalizedEvent]):
        """Constructs the DAG from chronologically ordered normalized events."""
        for ev in events:
            self._process_event(ev)

    def _process_event(self, ev: NormalizedEvent):
        guid = ev.process_guid

        # 1. Ensure current process node exists or update metadata
        if guid not in self.graph:
            self.graph.add_node(
                guid,
                entity_type="process",
                label=ev.image.split("\\")[-1] if "\\" in ev.image else ev.image,
                image=ev.image,
                pid=ev.pid,
                process_guid=guid,
                command_line=ev.command_line,
                user=ev.user,
                first_seen=ev.timestamp.isoformat(),
                last_seen=ev.timestamp.isoformat(),
                hashes=ev.hashes
            )
            self.process_nodes.add(guid)
        else:
            # Update last seen timestamp & any missing fields
            self.graph.nodes[guid]["last_seen"] = ev.timestamp.isoformat()
            if ev.command_line and not self.graph.nodes[guid].get("command_line"):
                self.graph.nodes[guid]["command_line"] = ev.command_line
            if ev.pid and not self.graph.nodes[guid].get("pid"):
                self.graph.nodes[guid]["pid"] = ev.pid

        # 2. Event ID 1: Process Creation (Parent -> Child edge)
        if ev.event_id == 1 and ev.parent_process_guid:
            parent_guid = ev.parent_process_guid
            if parent_guid not in self.graph:
                parent_label = ev.parent_image.split("\\")[-1] if ev.parent_image and "\\" in ev.parent_image else (ev.parent_image or "unknown.exe")
                self.graph.add_node(
                    parent_guid,
                    entity_type="process",
                    label=parent_label,
                    image=ev.parent_image or "unknown.exe",
                    pid=ev.parent_pid,
                    process_guid=parent_guid,
                    first_seen=ev.timestamp.isoformat(),
                    last_seen=ev.timestamp.isoformat()
                )
                self.process_nodes.add(parent_guid)

            edge_key = (parent_guid, guid)
            if not self.graph.has_edge(*edge_key):
                self.graph.add_edge(
                    parent_guid,
                    guid,
                    label="SPAWNED",
                    timestamp=ev.timestamp.isoformat(),
                    event_id=1
                )

        # 3. Event ID 3: Network Connection (Process -> Network Node)
        elif ev.event_id == 3 and ev.destination_ip:
            net_node_id = f"net:{ev.destination_ip}:{ev.destination_port or 0}"
            if net_node_id not in self.graph:
                self.graph.add_node(
                    net_node_id,
                    entity_type="network",
                    label=f"{ev.destination_ip}:{ev.destination_port or 0}",
                    ip=ev.destination_ip,
                    port=ev.destination_port,
                    timestamp=ev.timestamp.isoformat()
                )
            self.graph.add_edge(
                guid,
                net_node_id,
                label="NETWORK_CONNECT",
                timestamp=ev.timestamp.isoformat(),
                event_id=3
            )

        # 4. Event ID 11: File Creation (Process -> File Node)
        elif ev.event_id == 11 and ev.target_filename:
            file_node_id = f"file:{ev.target_filename.lower()}"
            file_label = ev.target_filename.split("\\")[-1] if "\\" in ev.target_filename else ev.target_filename
            if file_node_id not in self.graph:
                self.graph.add_node(
                    file_node_id,
                    entity_type="file",
                    label=file_label,
                    target_filename=ev.target_filename,
                    timestamp=ev.timestamp.isoformat()
                )
            self.graph.add_edge(
                guid,
                file_node_id,
                label="CREATED_FILE",
                timestamp=ev.timestamp.isoformat(),
                event_id=11
            )

        # 5. Event ID 12/13/14: Registry Modification (Process -> Registry Node)
        elif ev.event_id in (12, 13, 14) and ev.target_filename:
            reg_node_id = f"reg:{ev.target_filename}"
            reg_label = ev.target_filename.split("\\")[-1] if "\\" in ev.target_filename else ev.target_filename
            if reg_node_id not in self.graph:
                self.graph.add_node(
                    reg_node_id,
                    entity_type="registry",
                    label=reg_label,
                    key_path=ev.target_filename,
                    timestamp=ev.timestamp.isoformat()
                )
            self.graph.add_edge(
                guid,
                reg_node_id,
                label="MODIFIED_REG",
                timestamp=ev.timestamp.isoformat(),
                event_id=ev.event_id
            )

    def find_node_by_guid_or_pid(self, process_guid: str, pid: Optional[int] = None) -> Optional[str]:
        """Locates the node in the DAG by exact ProcessGuid, or PID match."""
        if process_guid in self.graph:
            return process_guid
        if pid:
            for node, data in self.graph.nodes(data=True):
                if data.get("entity_type") == "process" and data.get("pid") == pid:
                    return node
        return None

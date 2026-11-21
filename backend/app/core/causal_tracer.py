"""
TraceScope Causal Tracer
Implements single-seed, multi-seed incident fusion, and full multi-component forest layouts:
1. Backward Slicing: Identifies Root Cause / Patient Zero (t <= t_alert).
2. Forward Slicing: Maps Blast Radius across files, sockets, child processes (t >= t_alert).
3. Multi-Component Forest Layout: Computes independent BFS levels per tree and arranges them cleanly.
"""

import networkx as nx
from typing import Set, Tuple, List, Dict, Any, Optional
from ..schemas.graph import (
    ReactFlowNode,
    ReactFlowEdge,
    NodeData,
    NodePosition,
    GraphSummary,
    CausalGraphResponse
)


class CausalTracer:
    def __init__(self, graph: nx.DiGraph):
        self.graph = graph

    def backward_slice(self, seed_node: str, max_depth: int = 10) -> Set[str]:
        """Traverses upstream directed edges to find parent/ancestor processes."""
        visited: Set[str] = {seed_node}
        queue: List[Tuple[str, int]] = [(seed_node, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if depth >= max_depth:
                continue

            for pred in self.graph.predecessors(curr):
                if pred not in visited:
                    visited.add(pred)
                    queue.append((pred, depth + 1))

        return visited

    def forward_slice(self, seed_node: str, max_depth: int = 10) -> Set[str]:
        """Traverses downstream directed edges to find child processes, dropped files, sockets."""
        visited: Set[str] = {seed_node}
        queue: List[Tuple[str, int]] = [(seed_node, 0)]

        while queue:
            curr, depth = queue.pop(0)
            if depth >= max_depth:
                continue

            for succ in self.graph.successors(curr):
                if succ not in visited:
                    visited.add(succ)
                    queue.append((succ, depth + 1))

        return visited

    def find_patient_zero(self, backward_nodes: Set[str]) -> Optional[str]:
        """Identifies root ancestor process."""
        process_ancestors = [
            n for n in backward_nodes 
            if self.graph.nodes[n].get("entity_type") == "process"
        ]
        if not process_ancestors:
            return None

        for n in process_ancestors:
            preds = [p for p in self.graph.predecessors(n) if p in backward_nodes]
            if len(preds) == 0:
                return n

        return sorted(
            process_ancestors,
            key=lambda x: self.graph.nodes[x].get("first_seen", "")
        )[0]

    def _find_component_root(self, comp_nodes: Set[str], subgraph: nx.DiGraph) -> str:
        """Finds root node for a connected component (zero in-degree or earliest timestamp)."""
        roots = [n for n in comp_nodes if subgraph.in_degree(n) == 0]
        if roots:
            # Prefer process node if available
            proc_roots = [n for n in roots if self.graph.nodes[n].get("entity_type") == "process"]
            if proc_roots:
                return sorted(proc_roots, key=lambda x: self.graph.nodes[x].get("first_seen", "")) [0]
            return roots[0]
        return list(comp_nodes)[0]

    def _layout_subgraph(
        self, 
        subgraph_nodes: Set[str], 
        seed_nodes: Set[str], 
        patient_zero: Optional[str],
        alert_id: str
    ) -> CausalGraphResponse:
        """
        Computes multi-component hierarchical layout:
        Lays out each weakly connected tree independently so disconnected components
        never get squashed into a single vertical column.
        """
        subgraph = self.graph.subgraph(subgraph_nodes).copy()
        components = sorted(
            list(nx.weakly_connected_components(subgraph)),
            key=lambda c: len(c),
            reverse=True
        )

        positions: Dict[str, Tuple[float, float]] = {}
        current_y_offset = 0.0

        for comp in components:
            comp_set = set(comp)
            root = self._find_component_root(comp_set, subgraph)

            # BFS levels within this component
            comp_levels: Dict[str, int] = {n: 0 for n in comp_set}
            bfs_queue = [(root, 0)]
            visited_bfs = {root}

            while bfs_queue:
                curr, lvl = bfs_queue.pop(0)
                comp_levels[curr] = lvl
                for succ in subgraph.successors(curr):
                    if succ in comp_set and succ not in visited_bfs:
                        visited_bfs.add(succ)
                        bfs_queue.append((succ, lvl + 1))

            # Vertical rank per level within this component
            level_counts: Dict[int, int] = {}
            max_y_in_comp = 0.0

            for n in comp_set:
                lvl = comp_levels.get(n, 0)
                idx = level_counts.get(lvl, 0)
                level_counts[lvl] = idx + 1

                # 440px horizontal spacing gives 140px clean gap for edges & labels
                pos_x = float(lvl * 440)
                # 210px vertical spacing ensures 70px vertical gap between 140px nodes
                pos_y = current_y_offset + float(idx * 210)
                positions[n] = (pos_x, pos_y)
                if float(idx * 210) > max_y_in_comp:
                    max_y_in_comp = float(idx * 210)

            # Space out next component nicely
            current_y_offset += max_y_in_comp + 240.0

        react_nodes: List[ReactFlowNode] = []
        files_dropped_count = 0
        network_connections_count = 0
        compromised_processes_count = 0

        for n in subgraph_nodes:
            ndata = self.graph.nodes[n]
            etype = ndata.get("entity_type", "process")
            is_seed = (n in seed_nodes)
            is_root = (n == patient_zero)
            is_blast = (not is_seed and not is_root and etype != "process")

            if etype == "process":
                compromised_processes_count += 1
            elif etype == "file":
                files_dropped_count += 1
            elif etype == "network":
                network_connections_count += 1

            pos_x, pos_y = positions.get(n, (0.0, 0.0))

            node_data = NodeData(
                label=ndata.get("label", n),
                entity_type=etype,
                process_guid=ndata.get("process_guid"),
                pid=ndata.get("pid"),
                image=ndata.get("image"),
                command_line=ndata.get("command_line"),
                user=ndata.get("user"),
                timestamp=ndata.get("first_seen") or ndata.get("timestamp"),
                is_seed=is_seed,
                is_root_cause=is_root,
                is_blast_radius=is_blast,
                details=ndata
            )

            react_nodes.append(
                ReactFlowNode(
                    id=n,
                    type="customNode",
                    data=node_data,
                    position=NodePosition(x=pos_x, y=pos_y)
                )
            )

        react_edges: List[ReactFlowEdge] = []
        for u, v, edata in subgraph.edges(data=True):
            edge_id = f"e_{u}->{v}"
            is_attack_edge = (u in seed_nodes or v in seed_nodes)
            react_edges.append(
                ReactFlowEdge(
                    id=edge_id,
                    source=u,
                    target=v,
                    label=edata.get("label", "CAUSAL_LINK"),
                    animated=is_attack_edge,
                    style={
                        "stroke": "#EF4444" if is_attack_edge else "#38BDF8",
                        "strokeWidth": 2
                    }
                )
            )

        summary = GraphSummary(
            total_nodes=len(react_nodes),
            total_edges=len(react_edges),
            root_cause_guid=patient_zero,
            seed_alert_id=alert_id,
            compromised_processes_count=compromised_processes_count,
            files_dropped_count=files_dropped_count,
            network_connections_count=network_connections_count
        )

        return CausalGraphResponse(
            alert_id=alert_id,
            summary=summary,
            nodes=react_nodes,
            edges=react_edges
        )

    def build_causal_response(self, alert_id: str, seed_node: str) -> CausalGraphResponse:
        """Slices for a single seed alert."""
        backward_nodes = self.backward_slice(seed_node)
        forward_nodes = self.forward_slice(seed_node)
        all_nodes = backward_nodes.union(forward_nodes)
        patient_zero = self.find_patient_zero(backward_nodes)
        return self._layout_subgraph(all_nodes, {seed_node}, patient_zero, alert_id)

    def build_multi_seed_response(self, alert_id: str, seed_nodes: List[str]) -> CausalGraphResponse:
        """Slices and correlates multiple seed alerts within an incident."""
        all_nodes: Set[str] = set()
        all_backward: Set[str] = set()

        for s in seed_nodes:
            b = self.backward_slice(s)
            f = self.forward_slice(s)
            all_backward.update(b)
            all_nodes.update(b.union(f))

        patient_zero = self.find_patient_zero(all_backward)
        return self._layout_subgraph(all_nodes, set(seed_nodes), patient_zero, alert_id)

    def build_full_graph_response(self) -> CausalGraphResponse:
        """Renders the entire multi-component host telemetry forest."""
        all_nodes = set(self.graph.nodes())
        patient_zero = self.find_patient_zero(all_nodes)
        return self._layout_subgraph(all_nodes, set(), patient_zero, "GLOBAL_HOST_FOREST")

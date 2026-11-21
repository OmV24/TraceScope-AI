# TraceScope AI: Architectural & Research Specification

## 1. Research Context & Problem Formulation
Existing endpoint detection systems (including our accepted ICMLDE 2026 framework) excel at point-in-time anomaly detection. However, isolated alerts suffer from:
1. **Context Fragmentation:** An alert generated on `powershell.exe` does not convey the ancestral execution context (e.g., whether it was spawned by `explorer.exe` or an exploitation payload within `WINWORD.EXE`).
2. **Alert Fatigue:** SOC analysts receive thousands of unlinked alerts without causal progression.
3. **Dependency Explosion in Provenance Graphs:** Windows generates dense telemetry; naive graph traversal connects unrelated processes due to PID recycling and background Windows noise.

TraceScope AI addresses these fundamental challenges by introducing an evidence-driven, causal graph slicing and Graph-Augmented RAG (G-RAG) framework.

---

## 2. Mathematical Formalization of Causal Slicing

Let the Windows endpoint provenance graph be defined as a directed temporal graph:
$$G = (V, E, \tau)$$
where:
- $V = V_{\text{proc}} \cup V_{\text{file}} \cup V_{\text{net}} \cup V_{\text{reg}}$ represents heterogeneous endpoint entities.
- Each process vertex $v \in V_{\text{proc}}$ is keyed on a globally unique Sysmon tuple: $\text{GUID}(v)$.
- Each directed edge $e = (u, v) \in E$ represents an event occurring at timestamp $\tau(e)$.

### 2.1 Backward Slicing (Root Cause Identification)
Given a detection alert anchor node $v_{\text{seed}} \in V$ generated at alert timestamp $t_{\text{alert}}$:
$$\mathcal{S}_{\text{backward}}(v_{\text{seed}}) = \{ u \in V \mid \exists \text{ path } u \xrightarrow{e_1, e_2, \dots, e_k} v_{\text{seed}} \text{ with } \tau(e_1) \le \tau(e_2) \le \dots \le t_{\text{alert}} \}$$
The Patient Zero vertex $v_{\text{root}}$ is determined by:
$$v_{\text{root}} = \arg \min_{u \in \mathcal{S}_{\text{backward}}} \{\tau_{\text{first\_seen}}(u)\} \quad \text{such that} \quad \text{deg}^{-}(u) = 0$$

### 2.2 Forward Slicing (Blast Radius Determination)
The blast radius represents all downstream consequences initiated by the compromised seed:
$$\mathcal{S}_{\text{forward}}(v_{\text{seed}}) = \{ w \in V \mid \exists \text{ path } v_{\text{seed}} \xrightarrow{e_1, e_2, \dots, e_m} w \text{ with } t_{\text{alert}} \le \tau(e_1) \le \dots \le \tau(e_m) \}$$

The complete causal attack subgraph is given by:
$$G_{\text{attack}} = G[\mathcal{S}_{\text{backward}} \cup \mathcal{S}_{\text{forward}}]$$

---

## 3. Graph-Augmented RAG (G-RAG)
Rather than passing uncurated Sysmon logs to an LLM, TraceScope linearizes $G_{\text{attack}}$ into an unambiguous chronological evidence trace:
1. Every claim made in the generated incident dossier is anchored to an edge $(u, v)$ in $G_{\text{attack}}$.
2. Eliminates hallucination of non-existent processes or network sockets.
3. Provides deterministic confidence metrics grounded in graph connectivity.

---

## 4. Ground-Truth Benchmarking
- **Evaluation Dataset:** Mordor Project APT29 (Day 1 & Day 2 emulation).
- **Baseline Comparison:**
  - ICMLDE 2026 Detection Stage (Point-in-Time XGBoost/Random Forest).
  - TraceScope Post-Detection Reconstruction Engine.

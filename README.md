# TraceScope AI
> **An Evidence-Driven Windows Endpoint Attack Reconstruction and Incident Investigation Framework**

TraceScope AI is an advanced cybersecurity research platform and next-generation SOC investigation tool. Rather than focusing merely on point-in-time anomaly detection, TraceScope reconstructs the entire attack story after an alert occurs.

---

## 🚀 Key Capabilities

- **Temporal Provenance DAG Engine:** Ingests Windows Event Logs / Sysmon telemetry and constructs a process-aware Directed Acyclic Graph (DAG) using unique `ProcessGuid` lineage to prevent Windows PID recycling collision.
- **Dual-Directional Causal Slicing:**
  - *Backward Slicing ($t \le t_{alert}$):* Traverses upstream causality to pinpoint **Patient Zero / Root Cause** (initial access vector).
  - *Forward Slicing ($t \ge t_{alert}$):* Traverses downstream causality to establish the complete **Blast Radius** (spawned sub-processes, dropped staging/malware files, outbound C2 sockets, persistence registry keys).
- **Graph-Augmented RAG (G-RAG):** Eliminates LLM hallucination by feeding Gemini ONLY the mathematically verified causal sub-graph path rather than uncurated raw event dumps.
- **Deterministic Containment Playbook:** Automatically synthesizes actionable PowerShell remediation scripts that terminate malicious process lineages, quarantine dropped files, and block C2 IP addresses in Windows Defender Firewall.
- **Interactive SOC Canvas (React Flow):** Dark-mode interactive graph visualization with custom process, network, and file nodes, pulsed alert anchors, and an evidence dossier side-drawer.

---

## 📂 Project Structure

```
TraceScope-AI/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app & lifespan loader
│   │   ├── config.py            # Configuration & paths
│   │   ├── schemas/             # Pydantic schemas (TraceScopeAlert, ReactFlow models)
│   │   ├── core/
│   │   │   ├── ingestion.py     # Sysmon / Mordor JSON parser
│   │   │   ├── graph_engine.py  # NetworkX Temporal DAG builder
│   │   │   ├── causal_tracer.py # Dual-directional causal slicer
│   │   │   ├── grag_engine.py   # Gemini G-RAG investigator
│   │   │   └── playbook.py      # PowerShell remediation compiler
│   │   └── api/routes.py        # REST API endpoints
│   ├── data/
│   │   ├── raw/                 # Mordor APT29 sample telemetry
│   │   └── sample_alerts/       # ICMLDE / APT29 alert samples
│   └── requirements.txt
├── frontend/                    # React 18 + Vite + Tailwind + React Flow
├── docs/                        # Research documentation & architecture specs
└── README.md
```

---

## ⚡ Quick Start

### 1. Run Backend Server
```powershell
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://127.0.0.1:8000/docs`

### 2. Run Frontend Dashboard
```powershell
cd frontend
npm run dev
```
Interactive SOC Dashboard will be live at: `http://localhost:5173`

---

## 🛡️ Ground Truth Evaluation
Evaluated against the **Mordor Project APT29 Evaluation** dataset (Sysmon Event IDs 1, 3, 11, 13).
TraceScope isolates the attack path from `WINWORD.EXE` $\to$ `cmd.exe` $\to$ obfuscated `powershell.exe` $\to$ discovery tools (`whoami.exe`, `net.exe`), dropped payloads, and outbound C2 beacons.

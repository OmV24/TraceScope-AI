import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import axios from 'axios';
import { Maximize2 } from 'lucide-react';

import { CustomNode } from './components/CustomNode';
import { Navbar } from './components/Navbar';
import { MetricsBar } from './components/MetricsBar';
import { ForensicDrawer } from './components/ForensicDrawer';
import { TimelineScrubber } from './components/TimelineScrubber';
import { RawTelemetryTable } from './components/RawTelemetryTable';
import { MitreMatrixModal } from './components/MitreMatrixModal';
import { 
  TraceScopeAlert, 
  CausalGraphResponse, 
  IncidentDossier, 
  PlaybookResponse, 
  NodeData,
  RawTelemetryLog
} from './types';

const nodeTypes = {
  customNode: CustomNode,
};

const API_BASE = 'http://localhost:8000/api/v1';

export const App: React.FC = () => {
  const [alerts, setAlerts] = useState<TraceScopeAlert[]>([]);
  const [selectedAlertId, setSelectedAlertId] = useState<string>('CORRELATE_APT29');
  const [currentAlert, setCurrentAlert] = useState<TraceScopeAlert | null>(null);
  const [graphSummary, setGraphSummary] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'sliced' | 'all'>('sliced');

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [dossier, setDossier] = useState<IncidentDossier | null>(null);
  const [playbook, setPlaybook] = useState<PlaybookResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<NodeData | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isInvestigating, setIsInvestigating] = useState(false);

  // MITRE Matrix state
  const [isMitreModalOpen, setIsMitreModalOpen] = useState(false);

  // Playback & Raw Telemetry Table states
  const [isPlaybackVisible, setIsPlaybackVisible] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);
  const [rawLogs, setRawLogs] = useState<RawTelemetryLog[]>([]);

  const rfInstanceRef = useRef<any>(null);

  // Load Alerts list & Raw Telemetry Stream
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [alertsRes, logsRes] = await Promise.all([
          axios.get<TraceScopeAlert[]>(`${API_BASE}/alerts`),
          axios.get<RawTelemetryLog[]>(`${API_BASE}/telemetry/events`)
        ]);
        setAlerts(alertsRes.data);
        setRawLogs(logsRes.data);
      } catch (err) {
        console.error('Failed to fetch initial data:', err);
      }
    };
    fetchInitialData();
  }, []);

  // Compute Active MITRE Technique IDs across active alerts
  const activeMitreTechniqueIds = useMemo(() => {
    const ids = new Set<string>();
    if (selectedAlertId.includes('APT29')) {
      alerts.filter(a => a.alert_id.includes('APT29')).forEach(a => ids.add(a.mitre_attack.technique_id));
      ids.add('T1059.001');
      ids.add('T1566.001');
      ids.add('T1033');
      ids.add('T1069.002');
      ids.add('T1071.001');
    } else if (selectedAlertId.includes('CERBERUS')) {
      alerts.filter(a => a.alert_id.includes('CERBERUS')).forEach(a => ids.add(a.mitre_attack.technique_id));
      ids.add('T1204.002');
      ids.add('T1055');
    } else {
      alerts.forEach(a => ids.add(a.mitre_attack.technique_id));
    }
    return Array.from(ids);
  }, [alerts, selectedAlertId]);

  // Compute Chronological Step Sequence for Playback
  const sortedGraphNodes = useMemo(() => {
    return [...nodes].sort((a: any, b: any) => {
      const timeA = a.data?.timestamp || '';
      const timeB = b.data?.timestamp || '';
      return timeA.localeCompare(timeB);
    });
  }, [nodes]);

  const stepLabels = useMemo(() => {
    return sortedGraphNodes.map((n: any, idx: number) => {
      let stage = 'Execution';
      if (n.data?.is_root_cause) stage = 'Patient Zero';
      else if (n.data?.is_seed) stage = 'Detection Anchor';
      else if (n.data?.entity_type === 'network') stage = 'C2 Exfiltration';
      else if (n.data?.entity_type === 'file') stage = 'Staging / Dropper';
      return {
        label: n.data?.label || `Node ${idx + 1}`,
        time: n.data?.timestamp ? new Date(n.data.timestamp).toLocaleTimeString() : undefined,
        stage
      };
    });
  }, [sortedGraphNodes]);

  // Load Graph (Causal Slice or Full Host Forest)
  const loadGraph = useCallback(async (alertId: string, mode: 'sliced' | 'all') => {
    try {
      const endpoint = mode === 'all' 
        ? `${API_BASE}/graph/all` 
        : `${API_BASE}/graph/${alertId}`;
      const res = await axios.get<CausalGraphResponse>(endpoint);
      setNodes(res.data.nodes as any);
      setEdges(res.data.edges as any);
      setGraphSummary(res.data.summary);
      setCurrentStep(res.data.nodes.length > 0 ? res.data.nodes.length - 1 : 0);

      setTimeout(() => {
        if (rfInstanceRef.current) {
          rfInstanceRef.current.fitView({ 
            padding: mode === 'all' ? 0.1 : 0.25, 
            duration: 400 
          });
        }
      }, 70);
    } catch (err) {
      console.error('Failed to fetch graph:', err);
    }
  }, [setNodes, setEdges]);

  useEffect(() => {
    if (!selectedAlertId.startsWith('CORRELATE') && selectedAlertId !== 'ALL') {
      const matched = alerts.find(a => a.alert_id === selectedAlertId);
      if (matched) setCurrentAlert(matched);
    } else {
      const targetAlerts = selectedAlertId.includes('CERBERUS') 
        ? alerts.filter(a => a.alert_id.includes('CERBERUS'))
        : alerts.filter(a => a.alert_id.includes('APT29'));
      if (targetAlerts.length > 0) setCurrentAlert(targetAlerts[0]);
    }
    loadGraph(selectedAlertId, viewMode);
  }, [selectedAlertId, viewMode, alerts, loadGraph]);

  // Handle Step Change during playback
  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    if (sortedGraphNodes.length === 0) return;

    const activeNodeId = sortedGraphNodes[step]?.id;
    setNodes((prevNodes: any) =>
      prevNodes.map((n: any) => ({
        ...n,
        data: {
          ...n.data,
          is_active_step: n.id === activeNodeId
        }
      }))
    );

    if (activeNodeId && rfInstanceRef.current) {
      const activeNode = sortedGraphNodes[step];
      if (activeNode?.position) {
        rfInstanceRef.current.setCenter(
          activeNode.position.x + 130,
          activeNode.position.y + 50,
          { zoom: 1.15, duration: 300 }
        );
      }
    }
  };

  // Playback Auto-Stepper
  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= sortedGraphNodes.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          const next = prev + 1;
          handleStepChange(next);
          return next;
        });
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [isPlaying, sortedGraphNodes]);

  // Run full G-RAG Investigation
  const handleRunInvestigation = async () => {
    setIsInvestigating(true);
    try {
      const targetId = selectedAlertId || 'CORRELATE_APT29';
      const res = await axios.post(`${API_BASE}/investigate/${targetId}`);
      setDossier(res.data.incident_dossier);
      setPlaybook(res.data.playbook);
      setNodes(res.data.causal_graph.nodes as any);
      setEdges(res.data.causal_graph.edges as any);
      setGraphSummary(res.data.causal_graph.summary);
      setIsDrawerOpen(true);

      setTimeout(() => {
        if (rfInstanceRef.current) {
          rfInstanceRef.current.fitView({ padding: 0.25, duration: 400 });
        }
      }, 70);
    } catch (err) {
      console.error('Investigation failed:', err);
    } finally {
      setIsInvestigating(false);
    }
  };

  // Node Selection Handler
  const onNodeClick = (_: React.MouseEvent, node: any) => {
    setSelectedNode(node.data as NodeData);
    setIsDrawerOpen(true);
  };

  // Pan to specific node ID (from table, MITRE, or Copilot citation)
  const handlePanToNode = (targetId: string) => {
    const matchedNode = nodes.find((n: any) => 
      n.id === targetId || 
      n.data?.process_guid === targetId || 
      n.data?.label.toLowerCase().includes(targetId.toLowerCase())
    );
    if (matchedNode) {
      setSelectedNode(matchedNode.data as NodeData);
      setIsDrawerOpen(true);
      if (rfInstanceRef.current) {
        rfInstanceRef.current.setCenter(
          matchedNode.position.x + 130,
          matchedNode.position.y + 50,
          { zoom: 1.25, duration: 400 }
        );
      }
    }
  };

  // MITRE technique click locates node
  const handleSelectMitreTechnique = (techId: string) => {
    const matchedAlert = alerts.find(a => a.mitre_attack.technique_id.toLowerCase() === techId.toLowerCase());
    if (matchedAlert) {
      handlePanToNode(matchedAlert.seed_entity.process_guid);
    } else {
      if (techId === 'T1059.001') handlePanToNode('powershell.exe');
      else if (techId === 'T1566.001') handlePanToNode('WINWORD.EXE');
      else if (techId === 'T1033') handlePanToNode('whoami.exe');
      else if (techId === 'T1069.002') handlePanToNode('net.exe');
      else if (techId === 'T1071.001') handlePanToNode('192.168.0.5');
      else if (techId === 'T1204.002') handlePanToNode('VirusShare');
    }
  };

  const handleResetCanvasView = () => {
    if (rfInstanceRef.current) {
      rfInstanceRef.current.fitView({ 
        padding: viewMode === 'all' ? 0.1 : 0.25, 
        duration: 400 
      });
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#06080F] text-slate-100 font-sans selection:bg-sky-500/30">
      {/* Top Navbar */}
      <Navbar
        alerts={alerts}
        selectedAlertId={selectedAlertId}
        onSelectAlert={setSelectedAlertId}
        onRunInvestigation={handleRunInvestigation}
        isInvestigating={isInvestigating}
        onToggleDrawer={() => setIsDrawerOpen(!isDrawerOpen)}
        isDrawerOpen={isDrawerOpen}
        viewMode={viewMode}
        onToggleViewMode={setViewMode}
        isTableOpen={isTableOpen}
        onToggleTable={() => setIsTableOpen(!isTableOpen)}
        isPlaybackVisible={isPlaybackVisible}
        onTogglePlayback={() => setIsPlaybackVisible(!isPlaybackVisible)}
        onOpenMitreMatrix={() => setIsMitreModalOpen(true)}
        activeMitreCount={activeMitreTechniqueIds.length}
      />

      {/* Metrics Bar */}
      <MetricsBar summary={graphSummary} alert={currentAlert} />

      {/* Main Canvas Area */}
      <main className="flex-1 relative bg-[#06080F]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          onInit={(instance) => {
            rfInstanceRef.current = instance;
            instance.fitView({ padding: 0.25 });
          }}
          panOnScroll={true}
          panOnDrag={[1, 2]}
          zoomOnScroll={true}
          zoomOnPinch={true}
          minZoom={0.015}
          maxZoom={3.0}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: true,
          }}
        >
          <Background 
            variant={BackgroundVariant.Dots} 
            gap={24} 
            size={1.2} 
            color="#1E293B" 
          />
          <Controls className="!bg-[#0B101D]/90 !border !border-slate-800/90 !rounded-2xl" />
          <MiniMap 
            nodeColor={(n: any) => {
              if (n.data?.is_seed) return '#FF2E55';
              if (n.data?.is_root_cause) return '#F59E0B';
              if (n.data?.is_blast_radius) return '#A855F7';
              return '#00D2FF';
            }}
            maskColor="rgba(6, 8, 15, 0.85)"
            className="!bg-[#0B101D] !border !border-slate-800/90 !rounded-2xl overflow-hidden shadow-2xl cursor-pointer"
          />
        </ReactFlow>

        {/* Floating Canvas Badges: Fit View & Active Inventory */}
        <div className="absolute top-4 left-4 z-10 flex items-center gap-2 select-none">
          <button
            onClick={handleResetCanvasView}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0B101D]/90 hover:bg-slate-800 border border-slate-800/90 text-xs font-bold text-slate-300 hover:text-white shadow-xl transition backdrop-blur-md"
            title="Center and fit all nodes in view"
          >
            <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Fit View</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0B101D]/80 border border-slate-800/80 text-[11px] font-mono text-slate-400 backdrop-blur-md shadow-lg">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            <span>{nodes.length} Active Nodes</span>
            <span className="text-slate-600">•</span>
            <span>{edges.length} Causal Edges</span>
          </div>
        </div>

        {/* Attack Reconstruction Timeline Playback */}
        {isPlaybackVisible && (
          <TimelineScrubber
            totalSteps={sortedGraphNodes.length}
            currentStep={currentStep}
            onStepChange={handleStepChange}
            isPlaying={isPlaying}
            onTogglePlay={() => setIsPlaying(!isPlaying)}
            stepLabels={stepLabels}
          />
        )}

        {/* Forensic Side-Over Drawer with AI Copilot */}
        <ForensicDrawer
          selectedNode={selectedNode}
          dossier={dossier}
          playbook={playbook}
          alert={currentAlert}
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSelectNodeId={handlePanToNode}
        />

        {/* Bottom Raw Telemetry Log Stream Table */}
        <RawTelemetryTable
          logs={rawLogs}
          isOpen={isTableOpen}
          onToggle={() => setIsTableOpen(!isTableOpen)}
          onSelectNode={handlePanToNode}
          selectedGuid={selectedNode?.process_guid}
        />

        {/* Interactive MITRE ATT&CK Matrix Modal */}
        <MitreMatrixModal
          isOpen={isMitreModalOpen}
          onClose={() => setIsMitreModalOpen(false)}
          activeTechniqueIds={activeMitreTechniqueIds}
          onSelectTechnique={handleSelectMitreTechnique}
        />
      </main>
    </div>
  );
};

export default App;

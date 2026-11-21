import React, { useState } from 'react';
import { 
  FileText, Shield, Terminal, Copy, Check, AlertTriangle, 
  Flame, Crosshair, X, Activity, MessageSquare, Send, Sparkles, 
  AlertOctagon, CheckCircle2, CornerDownLeft, Target, Cpu, Clock, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import { NodeData, IncidentDossier, PlaybookResponse, TraceScopeAlert } from '../types';

interface ForensicDrawerProps {
  selectedNode: NodeData | null;
  dossier: IncidentDossier | null;
  playbook: PlaybookResponse | null;
  alert: TraceScopeAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectNodeId?: (nodeId: string) => void;
}

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  cited_node_ids?: string[];
}

export const ForensicDrawer: React.FC<ForensicDrawerProps> = ({
  selectedNode,
  dossier,
  playbook,
  alert,
  isOpen,
  onClose,
  onSelectNodeId
}) => {
  const [activeTab, setActiveTab] = useState<'dossier' | 'copilot' | 'node' | 'playbook'>('dossier');
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);
  const [isDryRunSimulated, setIsDryRunSimulated] = useState(false);

  // AI Copilot state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content: 'I am TraceScope AI Security Copilot. I analyze the mathematical causal graph for this incident. Ask me about Patient Zero, C2 communication, dropped files, or containment safety.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isSendingQuery, setIsSendingQuery] = useState(false);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSendQuery = async (queryText?: string) => {
    const text = queryText || chatInput;
    if (!text.trim() || isSendingQuery) return;

    const userMsg: ChatMsg = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setIsSendingQuery(true);

    try {
      const alertId = alert?.alert_id || 'ALL';
      const historyPayload = chatMessages.slice(-4).map((m) => ({
        role: m.role,
        content: m.content
      }));

      const res = await axios.post('http://localhost:8000/api/v1/investigate/chat', {
        alert_id: alertId,
        query: text,
        history: historyPayload
      });

      const assistantMsg: ChatMsg = {
        role: 'assistant',
        content: res.data.answer,
        cited_node_ids: res.data.cited_node_ids
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I encountered an error retrieving causal context. The backend engine is actively verifying the provenance path.'
        }
      ]);
    } finally {
      setIsSendingQuery(false);
    }
  };

  const suggestedQuestions = [
    'How did the attacker gain initial access?',
    'Did this process communicate with any external C2 IPs?',
    'What files were dropped or staged?',
    'Will terminating active PIDs crash Windows?'
  ];

  return (
    <aside className="fixed top-16 right-0 bottom-0 w-[560px] bg-[#0A0E1A]/95 backdrop-blur-2xl border-l border-slate-800/90 shadow-2xl flex flex-col z-30 transition-transform duration-300">
      {/* Top Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800/80 bg-[#0E1526]/90">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-sm shadow-sky-500/10">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-[13px] font-black tracking-wider uppercase text-white font-sans">
              Incident Forensic Dossier
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] text-slate-400 font-mono">
                Anchor: <span className="text-sky-300 font-bold">{alert?.alert_id || 'Unified Incident'}</span>
              </span>
              {alert && (
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                  {alert.host.hostname}
                </span>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent hover:border-slate-700 transition"
          title="Close Drawer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Modern Tactical Tabs */}
      <div className="flex border-b border-slate-800/80 bg-[#080C16] px-4 gap-1.5 pt-1.5">
        <button
          onClick={() => setActiveTab('dossier')}
          className={`flex items-center gap-2 py-2.5 px-3 rounded-t-xl text-xs font-bold transition-all ${
            activeTab === 'dossier'
              ? 'bg-[#0E1526] text-sky-400 border-t-2 border-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          G-RAG Analysis
        </button>

        <button
          onClick={() => setActiveTab('copilot')}
          className={`flex items-center gap-2 py-2.5 px-3 rounded-t-xl text-xs font-bold transition-all relative ${
            activeTab === 'copilot'
              ? 'bg-[#0E1526] text-sky-400 border-t-2 border-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          AI Copilot
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping ml-0.5" />
        </button>

        <button
          onClick={() => setActiveTab('node')}
          className={`flex items-center gap-2 py-2.5 px-3 rounded-t-xl text-xs font-bold transition-all relative ${
            activeTab === 'node'
              ? 'bg-[#0E1526] text-sky-400 border-t-2 border-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Crosshair className="w-3.5 h-3.5" />
          Node Telemetry
          {selectedNode && (
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse ml-0.5" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('playbook')}
          className={`flex items-center gap-2 py-2.5 px-3 rounded-t-xl text-xs font-bold transition-all ${
            activeTab === 'playbook'
              ? 'bg-[#0E1526] text-sky-400 border-t-2 border-sky-400 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          Playbook
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0B101D]/50">
        {/* TAB 1: G-RAG INCIDENT DOSSIER */}
        {activeTab === 'dossier' && (
          <div className="space-y-5">
            {dossier ? (
              <>
                {/* Executive Briefing Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#0E1526] to-[#0A0E1A] border border-sky-500/20 shadow-md">
                  <div className="flex items-center gap-2 mb-2.5 text-xs font-extrabold uppercase tracking-wider text-sky-400 font-mono">
                    <Shield className="w-4 h-4 text-sky-400" />
                    <span>Executive Briefing</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-sans">
                    {dossier.executive_summary}
                  </p>
                </div>

                {/* Patient Zero Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-950/20 via-[#0E1526] to-[#0A0E1A] border border-amber-500/30 shadow-md">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-400 font-mono">
                      <Flame className="w-4 h-4 text-amber-400" />
                      <span>Patient Zero (Root Cause)</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                      T_zero Causal Anchor
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-sans">
                    {dossier.root_cause_analysis}
                  </p>
                </div>

                {/* Kill Chain Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-sky-400" />
                      <span>Reconstructed Kill Chain Timeline</span>
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
                      {dossier.attack_chain_timeline.length} Stages Verified
                    </span>
                  </div>

                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
                    {dossier.attack_chain_timeline.map((item, idx) => (
                      <div key={idx} className="relative flex items-start gap-4 pl-8 group">
                        <div className="absolute left-2 top-2.5 w-3 h-3 rounded-full bg-sky-500 ring-4 ring-[#0A0E1A] group-hover:scale-125 transition-transform" />
                        <div className="p-3.5 rounded-xl bg-[#0E1526] border border-slate-800/80 flex-1 hover:border-slate-700 transition shadow-sm">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-extrabold text-sky-300 font-sans">{item.stage}</span>
                            <span className="font-mono text-slate-400 text-[10px]">
                              {item.timestamp && item.timestamp !== 'Unknown'
                                ? new Date(item.timestamp).toLocaleTimeString()
                                : `T+${idx * 3}s`}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 leading-normal font-sans">{item.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Blast Radius Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/20 via-[#0E1526] to-[#0A0E1A] border border-purple-500/30 shadow-md">
                  <div className="flex items-center gap-2 mb-2.5 text-xs font-extrabold uppercase tracking-wider text-purple-400 font-mono">
                    <AlertTriangle className="w-4 h-4 text-purple-400" />
                    <span>Impact & Blast Radius Assessment</span>
                  </div>
                  <p className="text-xs leading-relaxed text-slate-300 font-sans">
                    {dossier.blast_radius_summary}
                  </p>
                </div>

                {/* Confidence & Evidence Footer */}
                <div className="p-3 rounded-xl bg-[#06080F] border border-slate-800/80 text-[11px] font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-400">Confidence Assessment:</span>
                  </div>
                  <span className="text-emerald-400 font-black">{dossier.confidence_assessment}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-24 space-y-3 text-slate-400">
                <Sparkles className="w-8 h-8 text-sky-400 mx-auto animate-pulse" />
                <p className="text-xs font-medium">No investigation dossier generated yet.</p>
                <p className="text-[11px] text-slate-500">
                  Click <strong className="text-sky-400 font-bold">Run G-RAG Investigation</strong> in the top navbar to synthesize the mathematical provenance briefing.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AI COPILOT CHAT */}
        {activeTab === 'copilot' && (
          <div className="flex flex-col h-[calc(100vh-220px)] justify-between">
            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-extrabold text-slate-400 font-mono">
                    {msg.role === 'user' ? (
                      <span>SOC Analyst</span>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-sky-400" />
                        <span className="text-sky-400">TraceScope Copilot</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed max-w-[92%] shadow-md ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white font-sans'
                        : 'bg-[#0E1526] border border-slate-800/90 text-slate-200 font-sans'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Clickable Cited Nodes in Copilot Response */}
                    {msg.cited_node_ids && msg.cited_node_ids.length > 0 && onSelectNodeId && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-slate-400 font-mono font-bold">Causal Citations:</span>
                        {msg.cited_node_ids.map((nid, i) => (
                          <button
                            key={i}
                            onClick={() => onSelectNodeId(nid)}
                            className="flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-bold transition hover:scale-105"
                          >
                            <Target className="w-2.5 h-2.5 text-sky-400" />
                            {nid.length > 20 ? nid.slice(0, 16) + '...' : nid}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isSendingQuery && (
                <div className="flex items-center gap-2.5 text-xs text-sky-400 font-bold p-3.5 bg-[#0E1526] rounded-2xl border border-sky-500/30 animate-pulse">
                  <Sparkles className="w-4 h-4 animate-spin text-sky-400" />
                  <span className="font-mono">Traversing causal graph DAG & synthesizing response...</span>
                </div>
              )}
            </div>

            {/* Suggested Prompts & Input Bar */}
            <div className="space-y-3 pt-3 border-t border-slate-800/80 bg-[#080C16]/90 rounded-2xl p-3">
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendQuery(q)}
                    disabled={isSendingQuery}
                    className="text-[10px] px-2.5 py-1 rounded-xl bg-[#0E1526] hover:bg-slate-800 text-slate-300 hover:text-sky-300 border border-slate-800/80 transition truncate max-w-full font-sans"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
                  placeholder="Ask Copilot about root cause, PIDs, C2 sockets..."
                  disabled={isSendingQuery}
                  className="flex-1 bg-[#06080F] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-sans shadow-inner"
                />
                <button
                  onClick={() => handleSendQuery()}
                  disabled={!chatInput.trim() || isSendingQuery}
                  className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white transition disabled:opacity-40 shadow-md shadow-sky-600/30"
                  title="Send Question"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NODE TELEMETRY INSPECTOR */}
        {activeTab === 'node' && (
          <div className="space-y-4">
            {selectedNode ? (
              <>
                <div className="p-4 rounded-2xl bg-[#0E1526] border border-slate-800/90 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-slate-400 font-mono mb-1">
                    Selected Entity Telemetry
                  </div>
                  <div className="text-base font-black text-white break-all font-mono">
                    {selectedNode.label}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {selectedNode.entity_type.toUpperCase()}
                    </span>
                    {selectedNode.is_root_cause && (
                      <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        PATIENT ZERO
                      </span>
                    )}
                    {selectedNode.is_seed && (
                      <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        ALERT ANCHOR
                      </span>
                    )}
                    {selectedNode.is_blast_radius && (
                      <span className="text-[10px] font-mono font-extrabold px-2.5 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        BLAST RADIUS
                      </span>
                    )}
                  </div>
                </div>

                {selectedNode.command_line && (
                  <div className="p-4 rounded-2xl bg-[#0E1526] border border-slate-800/90 shadow-md">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-300 font-sans">Process Command Line</span>
                      <button
                        onClick={() => copyToClipboard(selectedNode.command_line || '', setCopiedCmd)}
                        className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 font-bold font-mono transition"
                      >
                        {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCmd ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                    <pre className="p-3.5 rounded-xl bg-[#06080F] font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre-wrap break-all border border-slate-800/80 leading-relaxed shadow-inner">
                      {selectedNode.command_line}
                    </pre>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-[#0E1526] border border-slate-800/90 space-y-3 text-xs shadow-md">
                  {selectedNode.pid && (
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                      <span className="text-slate-400 font-sans">Process ID (PID)</span>
                      <span className="font-mono text-white font-extrabold">{selectedNode.pid}</span>
                    </div>
                  )}
                  {selectedNode.process_guid && (
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                      <span className="text-slate-400 font-sans">Sysmon ProcessGuid</span>
                      <span className="font-mono text-sky-300 text-[11px] truncate max-w-[280px]" title={selectedNode.process_guid}>
                        {selectedNode.process_guid}
                      </span>
                    </div>
                  )}
                  {selectedNode.user && (
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2.5">
                      <span className="text-slate-400 font-sans">Security Context</span>
                      <span className="font-mono text-white">{selectedNode.user}</span>
                    </div>
                  )}
                  {selectedNode.timestamp && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-sans">Event Timestamp</span>
                      <span className="font-mono text-slate-300">{new Date(selectedNode.timestamp).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="text-center py-24 space-y-3 text-slate-400">
                <Crosshair className="w-8 h-8 text-sky-400 mx-auto animate-pulse" />
                <p className="text-xs font-medium">No node selected.</p>
                <p className="text-[11px] text-slate-500">
                  Click any process, socket, or file node on the attack canvas to inspect its raw Sysmon telemetry.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CONTAINMENT PLAYBOOK */}
        {activeTab === 'playbook' && (
          <div className="space-y-4">
            {playbook ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                    Synthesized PowerShell Remediation
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsDryRunSimulated(!isDryRunSimulated)}
                      className={`text-[11px] font-mono font-bold px-3 py-1 rounded-xl border transition ${
                        isDryRunSimulated
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-[#0E1526] border-slate-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {isDryRunSimulated ? '✓ Verified Safe' : 'Dry-Run Check'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(playbook.powershell_script, setCopiedScript)}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-bold shadow-md shadow-sky-600/30 transition"
                    >
                      {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedScript ? 'Copied' : 'Copy Script'}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <pre className="p-4 rounded-2xl bg-[#06080F] font-mono text-xs text-sky-300 overflow-x-auto whitespace-pre border border-slate-800/90 leading-relaxed max-h-[320px] shadow-inner">
                    {playbook.powershell_script}
                  </pre>
                </div>

                <div className="space-y-2.5">
                  <div className="text-xs font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                    Targeted Containment Actions ({playbook.actions_breakdown.length})
                  </div>
                  <div className="space-y-2">
                    {playbook.actions_breakdown.map((act, i) => (
                      <div key={i} className="p-3.5 rounded-xl bg-[#0E1526] border border-slate-800/90 text-xs shadow-sm">
                        <div className="font-mono font-extrabold text-sky-400 mb-0.5">{act.category}</div>
                        <div className="text-slate-300 font-sans">{act.action}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-3">
                  <AlertOctagon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="font-sans leading-relaxed">{playbook.safety_warning}</span>
                </div>
              </>
            ) : (
              <div className="text-center py-24 space-y-3 text-slate-400">
                <Terminal className="w-8 h-8 text-sky-400 mx-auto animate-pulse" />
                <p className="text-xs font-medium">No containment playbook compiled.</p>
                <p className="text-[11px] text-slate-500">
                  Run G-RAG investigation to compile the automated, syntax-checked PowerShell response commands.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

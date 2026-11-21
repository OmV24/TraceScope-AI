import React from 'react';
import { 
  Shield, Sparkles, Layers, Network, GitBranch, Terminal, 
  PlayCircle, RefreshCw, ShieldAlert, FolderTree
} from 'lucide-react';
import { TraceScopeAlert } from '../types';

interface NavbarProps {
  alerts: TraceScopeAlert[];
  selectedAlertId: string;
  onSelectAlert: (id: string) => void;
  onRunInvestigation: () => void;
  isInvestigating: boolean;
  onToggleDrawer: () => void;
  isDrawerOpen: boolean;
  viewMode: 'sliced' | 'all';
  onToggleViewMode: (mode: 'sliced' | 'all') => void;
  isTableOpen: boolean;
  onToggleTable: () => void;
  isPlaybackVisible: boolean;
  onTogglePlayback: () => void;
  onOpenMitreMatrix: () => void;
  activeMitreCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onRunInvestigation,
  isInvestigating,
  onToggleDrawer,
  isDrawerOpen,
  viewMode,
  onToggleViewMode,
  isTableOpen,
  onToggleTable,
  isPlaybackVisible,
  onTogglePlayback,
  onOpenMitreMatrix,
  activeMitreCount
}) => {
  const apt29Alerts = alerts.filter(a => a.alert_id.includes('APT29'));
  const cerberusAlerts = alerts.filter(a => a.alert_id.includes('CERBERUS'));

  return (
    <header className="h-16 bg-[#080C16]/95 backdrop-blur-2xl border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between z-30 select-none gap-3">
      {/* Brand & Incident Selector Cluster */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 via-indigo-600 to-purple-600 p-[1.5px] shadow-lg shadow-sky-500/20 shrink-0">
            <div className="w-full h-full bg-[#080C16] rounded-[10px] flex items-center justify-center">
              <Shield className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm md:text-base font-black tracking-tight text-white font-sans">
                TraceScope<span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">AI</span>
              </span>
              <span className="hidden sm:flex items-center gap-1 px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Ingestion
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium hidden md:block">
              Attack Reconstruction & DFIR Framework
            </p>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-800 hidden lg:block" />

        {/* Incident Selector Dropdown */}
        <div className="flex items-center gap-1.5">
          <select
            value={selectedAlertId}
            onChange={(e) => onSelectAlert(e.target.value)}
            className="bg-[#0D1322] border border-slate-700/80 hover:border-slate-600 text-xs text-white rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-sky-500 font-mono shadow-inner max-w-[200px] sm:max-w-[260px] md:max-w-[320px] truncate cursor-pointer transition"
          >
            <optgroup label="🏢 Incident 1: APT29 Nation-State Espionage">
              <option value="CORRELATE_APT29">
                ⚡ [CORRELATE APT29] Multi-Stage Kill Chain ({apt29Alerts.length} Phases)
              </option>
              {apt29Alerts.map((alt) => (
                <option key={alt.alert_id} value={alt.alert_id}>
                  └─ [{alt.severity}] {alt.seed_entity.image.split('\\').pop()} ({alt.mitre_attack.technique_id})
                </option>
              ))}
            </optgroup>

            <optgroup label="☣️ Incident 2: Cerberus Malware & Memory Injection">
              <option value="CORRELATE_CERBERUS">
                ⚡ [CORRELATE CERBERUS] Outbreak & Dropper Lineage
              </option>
              {cerberusAlerts.map((alt) => (
                <option key={alt.alert_id} value={alt.alert_id}>
                  └─ [{alt.severity}] {alt.seed_entity.image.split('\\').pop()} ({alt.mitre_attack.technique_id})
                </option>
              ))}
            </optgroup>

            <optgroup label="🌐 Multi-Tenant Overview">
              <option value="ALL">
                ⚡ Correlate Across All Incidents ({alerts.length} Total Alerts)
              </option>
            </optgroup>
          </select>
        </div>

        {/* View Mode Toggle: Sliced vs Full Forest */}
        <div className="hidden sm:flex bg-[#05070E] p-0.5 rounded-xl border border-slate-800 shadow-inner">
          <button
            onClick={() => onToggleViewMode('sliced')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
              viewMode === 'sliced'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Causal Path</span>
          </button>
          <button
            onClick={() => onToggleViewMode('all')}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-lg transition ${
              viewMode === 'all'
                ? 'bg-gradient-to-r from-sky-600 to-blue-600 text-white shadow-md shadow-sky-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>Full Forest</span>
          </button>
        </div>
      </div>

      {/* Primary Actions & Tool Toggles Cluster (ALWAYS VISIBLE) */}
      <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
        {/* MITRE ATT&CK Matrix Navigator Button */}
        <button
          onClick={onOpenMitreMatrix}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#0D1322] border border-rose-500/40 hover:border-rose-500 text-rose-300 shadow-sm transition hover:scale-105"
          title="Open MITRE ATT&CK Enterprise Matrix"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          <span className="hidden md:inline">MITRE</span>
          <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-extrabold">
            {activeMitreCount}
          </span>
        </button>

        {/* Toggle Attack Playback */}
        <button
          onClick={onTogglePlayback}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
            isPlaybackVisible
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
              : 'bg-[#0D1322] border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
          }`}
          title="Toggle Timeline Playback Scrubber"
        >
          <PlayCircle className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden lg:inline">Playback</span>
        </button>

        {/* Toggle Raw Telemetry Logs Table */}
        <button
          onClick={onToggleTable}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition ${
            isTableOpen
              ? 'bg-sky-500/20 border-sky-500/50 text-sky-300 shadow-sm'
              : 'bg-[#0D1322] border-slate-700/80 hover:border-slate-600 text-slate-300 hover:text-white'
          }`}
          title="Toggle Raw Sysmon Event Stream"
        >
          <Terminal className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">Logs</span>
        </button>

        <div className="h-5 w-px bg-slate-800" />

        {/* Primary Call to Action: Run G-RAG AI Investigation */}
        <button
          onClick={onRunInvestigation}
          disabled={isInvestigating}
          className="flex items-center gap-1.5 md:gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-sky-500/30 transition disabled:opacity-50 cursor-pointer hover:scale-105 active:scale-95"
        >
          {isInvestigating ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
              <span className="font-mono">Analyzing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-sky-200" />
              <span>G-RAG Investigate</span>
            </>
          )}
        </button>

        {/* Toggle Forensic Dossier Drawer */}
        <button
          onClick={onToggleDrawer}
          className={`flex items-center gap-1.5 px-3 py-1.5 md:py-2 rounded-xl text-xs font-bold border transition hover:scale-105 ${
            isDrawerOpen
              ? 'bg-slate-800 border-sky-500/60 text-sky-300 shadow-md'
              : 'bg-[#0D1322] border-slate-700/80 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">Dossier</span>
        </button>
      </div>
    </header>
  );
};

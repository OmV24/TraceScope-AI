import React from 'react';
import { Terminal, Globe, FileCode, Flame, Target, Shield } from 'lucide-react';
import { GraphSummary, TraceScopeAlert } from '../types';

interface MetricsBarProps {
  summary: GraphSummary | null;
  alert: TraceScopeAlert | null;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ summary, alert }) => {
  return (
    <div className="h-11 bg-[#06080F] border-b border-slate-800/80 px-4 md:px-6 flex items-center justify-between text-xs select-none overflow-x-auto scrollbar-none gap-4">
      {/* Left Target Status Badges */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Metric: Target Entity Anchor */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 shadow-sm shrink-0">
          <Target className="w-3.5 h-3.5 text-rose-400" />
          <span className="font-extrabold text-[10px] md:text-[11px] uppercase tracking-wider font-mono">Anchor:</span>
          <span className="font-mono text-white font-black text-[11px] md:text-xs">
            {alert ? alert.seed_entity.image.split('\\').pop() : 'Multi-Seed'}
          </span>
          {alert && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
              PID {alert.seed_entity.pid}
            </span>
          )}
        </div>

        {/* Metric: MITRE Technique */}
        {alert && (
          <div className="flex items-center gap-1.5 text-slate-300 text-[11px] shrink-0">
            <Shield className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-400 font-bold hidden sm:inline">MITRE:</span>
            <span className="font-black text-sky-300 font-mono px-2 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
              {alert.mitre_attack.technique_id}
            </span>
            <span className="text-slate-400 truncate max-w-[140px] md:max-w-[200px]" title={alert.mitre_attack.technique_name}>
              ({alert.mitre_attack.technique_name})
            </span>
          </div>
        )}

        {/* Metric: Root Cause Patient Zero */}
        <div className="items-center gap-1.5 text-slate-300 text-[11px] hidden md:flex shrink-0">
          <Flame className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-slate-400 font-bold">Patient Zero:</span>
          <span className="font-mono text-amber-300 font-black px-2 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20 truncate max-w-[180px]" title={summary?.root_cause_guid || 'Resolving...'}>
            {summary?.root_cause_guid ? summary.root_cause_guid.slice(0, 16) + '...' : 'Analyzing Lineage...'}
          </span>
        </div>
      </div>

      {/* Sliced Attack Inventory Counts (Right Side) */}
      {summary && (
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0D1322] border border-slate-800 text-[11px] text-slate-300 shadow-inner" title="Compromised Processes">
            <Terminal className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400 font-bold hidden sm:inline">PIDs:</span>
            <span className="font-mono font-black text-white">{summary.compromised_processes_count}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0D1322] border border-slate-800 text-[11px] text-slate-300 shadow-inner" title="Dropped Files">
            <FileCode className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400 font-bold hidden sm:inline">Files:</span>
            <span className="font-mono font-black text-white">{summary.files_dropped_count}</span>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#0D1322] border border-slate-800 text-[11px] text-slate-300 shadow-inner" title="C2 Network Sockets">
            <Globe className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400 font-bold hidden sm:inline">C2 Sockets:</span>
            <span className="font-mono font-black text-white">{summary.network_connections_count}</span>
          </div>
        </div>
      )}
    </div>
  );
};

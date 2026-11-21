import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Terminal, Globe, FileCode, ShieldAlert, Cpu, Database, Flame, Radio, Hash } from 'lucide-react';
import { NodeData } from '../types';

interface CustomNodeProps {
  data: NodeData;
  selected?: boolean;
}

export const CustomNode: React.FC<CustomNodeProps> = memo(({ data, selected }) => {
  const getIcon = () => {
    switch (data.entity_type) {
      case 'process':
        return <Terminal className="w-3.5 h-3.5 text-sky-400" />;
      case 'network':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'file':
        return <FileCode className="w-3.5 h-3.5 text-amber-400" />;
      case 'registry':
        return <Database className="w-3.5 h-3.5 text-purple-400" />;
      default:
        return <Cpu className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getBorderAndGlow = () => {
    if (data.is_active_step) {
      return 'border-[#00D2FF] animate-step-beacon ring-2 ring-[#00D2FF]/50 scale-[1.03]';
    }
    if (data.is_seed) {
      return 'border-[#FF2E55] animate-alert-pulse ring-2 ring-[#FF2E55]/40';
    }
    if (data.is_root_cause) {
      return 'border-[#F59E0B] animate-amber-glow ring-2 ring-[#F59E0B]/40';
    }
    if (data.is_blast_radius) {
      return 'border-[#A855F7]/80 shadow-lg shadow-purple-950/40';
    }
    if (selected) {
      return 'border-[#00D2FF] shadow-xl shadow-sky-950/60 ring-2 ring-[#00D2FF]/50';
    }
    return 'border-slate-800/90 hover:border-slate-600/90 hover:shadow-xl hover:shadow-black/60';
  };

  const getBadge = () => {
    if (data.is_seed) {
      return (
        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#FF2E55]/15 text-[#FF2E55] border border-[#FF2E55]/30 tracking-wider uppercase font-mono">
          <ShieldAlert className="w-2.5 h-2.5" /> Anchor
        </span>
      );
    }
    if (data.is_root_cause) {
      return (
        <span className="flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30 tracking-wider uppercase font-mono">
          <Flame className="w-2.5 h-2.5" /> Patient Zero
        </span>
      );
    }
    if (data.is_blast_radius) {
      return (
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#A855F7]/15 text-[#A855F7] border border-[#A855F7]/30 tracking-wider uppercase font-mono">
          Blast Radius
        </span>
      );
    }
    return null;
  };

  const getAccentGradient = () => {
    switch (data.entity_type) {
      case 'process':
        return 'from-sky-500/20 via-sky-500/5 to-transparent';
      case 'network':
        return 'from-emerald-500/20 via-emerald-500/5 to-transparent';
      case 'file':
        return 'from-amber-500/20 via-amber-500/5 to-transparent';
      case 'registry':
        return 'from-purple-500/20 via-purple-500/5 to-transparent';
      default:
        return 'from-slate-800/20 via-slate-800/5 to-transparent';
    }
  };

  return (
    <div
      className={`relative px-4 py-3.5 bg-[#0B101D]/95 backdrop-blur-xl border-2 rounded-2xl min-w-[270px] max-w-[300px] transition-all duration-300 cursor-pointer overflow-hidden group select-none shadow-xl ${getBorderAndGlow()}`}
    >
      {/* Top subtle lighting strip */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${getAccentGradient()}`} />

      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-[#00D2FF] !border-2 !border-[#06080F] hover:!scale-125 transition-transform"
      />

      {/* Header Row: Category Icon & Badge */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 shadow-sm">
            {getIcon()}
          </div>
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">
            {data.entity_type}
          </span>
        </div>
        {getBadge()}
      </div>

      {/* Title / Entity Name */}
      <div className="mb-2">
        <div 
          className="text-[13px] font-extrabold text-white truncate tracking-tight font-sans group-hover:text-sky-300 transition-colors" 
          title={data.label}
        >
          {data.label}
        </div>

        {data.pid && (
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mt-0.5">
            <span className="flex items-center gap-0.5">
              <span className="text-slate-500 font-bold">PID</span>{' '}
              <strong className="text-sky-300 font-bold">{data.pid}</strong>
            </span>
            {data.user && (
              <span className="text-slate-500 truncate max-w-[140px]" title={data.user}>
                • {data.user.split('\\').pop()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Command Line Preview (if available) */}
      {data.command_line && (
        <div className="mb-2 p-2 rounded-lg bg-[#05070D] border border-slate-800/80 font-mono text-[10px] text-emerald-400/90 truncate leading-tight shadow-inner" title={data.command_line}>
          <span className="text-slate-600 select-none mr-1">$</span>
          {data.command_line}
        </div>
      )}

      {/* Footer Info: UTC Timestamp & Active Step Indicator */}
      {data.timestamp && (
        <div className="text-[10px] font-mono text-slate-500 truncate flex items-center justify-between pt-2 border-t border-slate-800/60">
          <span>{new Date(data.timestamp).toLocaleTimeString()} UTC</span>
          {data.is_active_step && (
            <span className="flex items-center gap-1 text-[#00D2FF] font-extrabold animate-pulse">
              <Radio className="w-2.5 h-2.5" /> Stage Active
            </span>
          )}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-[#00D2FF] !border-2 !border-[#06080F] hover:!scale-125 transition-transform"
      />
    </div>
  );
});

CustomNode.displayName = 'CustomNode';

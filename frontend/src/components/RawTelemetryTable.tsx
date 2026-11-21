import React, { useState } from 'react';
import { Terminal, Globe, FileCode, Database, Search, ChevronUp, ChevronDown, Filter, X, ArrowUpRight } from 'lucide-react';
import { RawTelemetryLog } from '../types';

interface RawTelemetryTableProps {
  logs: RawTelemetryLog[];
  isOpen: boolean;
  onToggle: () => void;
  onSelectNode: (guid: string) => void;
  selectedGuid?: string;
}

export const RawTelemetryTable: React.FC<RawTelemetryTableProps> = ({
  logs,
  isOpen,
  onToggle,
  onSelectNode,
  selectedGuid
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEventId, setFilterEventId] = useState<number | null>(null);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.image.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.process_guid.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEventId === null || log.event_id === filterEventId;
    return matchesSearch && matchesFilter;
  });

  const getEventBadge = (eid: number) => {
    switch (eid) {
      case 1:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Terminal className="w-3 h-3 text-sky-400" /> EID 1: Process
          </span>
        );
      case 3:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Globe className="w-3 h-3 text-emerald-400" /> EID 3: Network
          </span>
        );
      case 11:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <FileCode className="w-3 h-3 text-amber-400" /> EID 11: File
          </span>
        );
      case 12:
      case 13:
      case 14:
        return (
          <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-mono font-extrabold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Database className="w-3 h-3 text-purple-400" /> EID {eid}: Registry
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold bg-slate-800 text-slate-400 border border-slate-700">
            EID {eid}
          </span>
        );
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-20 bg-[#0B101D]/95 backdrop-blur-2xl border-t border-slate-800/90 shadow-2xl transition-all duration-300 select-none ${
        isOpen ? 'h-72' : 'h-10'
      }`}
    >
      {/* Header Bar */}
      <div className="h-10 px-6 flex items-center justify-between border-b border-slate-800/80 bg-[#0E1526]/90 text-xs">
        <div className="flex items-center gap-5">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 font-bold text-slate-300 hover:text-white transition group cursor-pointer"
          >
            {isOpen ? <ChevronDown className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" /> : <ChevronUp className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />}
            <span className="uppercase tracking-wider text-[11px] font-mono font-extrabold">Sysmon Telemetry Stream</span>
            <span className="px-2 py-0.5 rounded-full bg-[#06080F] text-[10px] font-mono font-extrabold text-sky-300 border border-slate-800">
              {logs.length} Raw Events
            </span>
          </button>

          {isOpen && (
            <div className="flex items-center gap-1.5 bg-[#06080F] p-0.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setFilterEventId(null)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  filterEventId === null ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterEventId(1)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  filterEventId === 1 ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EID 1
              </button>
              <button
                onClick={() => setFilterEventId(3)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  filterEventId === 3 ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EID 3
              </button>
              <button
                onClick={() => setFilterEventId(11)}
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold transition ${
                  filterEventId === 11 ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                EID 11
              </button>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search telemetry..."
                className="pl-8 pr-3 py-1 bg-[#06080F] border border-slate-700/80 rounded-xl text-[11px] text-white focus:outline-none focus:border-sky-500 w-56 placeholder-slate-500 font-mono shadow-inner"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Logs Table */}
      {isOpen && (
        <div className="h-60 overflow-y-auto bg-[#070A12]/90">
          <table className="w-full text-left text-xs text-slate-300 font-mono">
            <thead className="bg-[#0B101D] text-slate-400 text-[10px] uppercase tracking-wider sticky top-0 border-b border-slate-800/90 z-10">
              <tr>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Process Image</th>
                <th className="py-2.5 px-4">PID</th>
                <th className="py-2.5 px-4">Causal Action / Details</th>
                <th className="py-2.5 px-4">ProcessGuid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredLogs.map((log) => {
                const isSelected = selectedGuid && log.process_guid === selectedGuid;
                return (
                  <tr
                    key={log.id}
                    onClick={() => onSelectNode(log.process_guid)}
                    className={`hover:bg-slate-800/50 cursor-pointer transition ${
                      isSelected ? 'bg-sky-500/15 border-l-2 border-sky-400' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4">{getEventBadge(log.event_id)}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4 text-white font-black truncate max-w-[200px]" title={log.image}>
                      {log.image.split('\\').pop()}
                    </td>
                    <td className="py-2.5 px-4 text-sky-300 font-bold">{log.pid || '-'}</td>
                    <td className="py-2.5 px-4 text-slate-300 truncate max-w-[420px]" title={log.details}>
                      <span className="font-bold text-slate-200">{log.action}:</span>{' '}
                      <span className="text-slate-400">{log.details}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[10px] truncate max-w-[160px]" title={log.process_guid}>
                      {log.process_guid}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

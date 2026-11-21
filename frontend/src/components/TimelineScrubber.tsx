import React from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Clock, ShieldCheck, Flame, Radio } from 'lucide-react';

interface TimelineScrubberProps {
  totalSteps: number;
  currentStep: number;
  onStepChange: (step: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  stepLabels: Array<{ label: string; time?: string; stage?: string }>;
}

export const TimelineScrubber: React.FC<TimelineScrubberProps> = ({
  totalSteps,
  currentStep,
  onStepChange,
  isPlaying,
  onTogglePlay,
  stepLabels
}) => {
  if (totalSteps <= 1) return null;

  const currentLabel = stepLabels[currentStep] || { label: 'Initial State', stage: 'Ready' };

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 bg-[#0B101D]/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl px-6 py-3.5 shadow-2xl flex flex-col gap-3 min-w-[620px] max-w-[760px] transition-all select-none">
      {/* Top Info Bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isPlaying ? 'bg-sky-400' : 'bg-slate-400'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isPlaying ? 'bg-sky-500' : 'bg-slate-500'}`} />
          </span>
          <span className="font-extrabold text-slate-300 tracking-wider uppercase text-[11px] font-mono">
            Attack Reconstruction Playback
          </span>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span className="font-bold text-slate-300">Stage {currentStep + 1} of {totalSteps}</span>
          <span className="text-slate-600">|</span>
          <span className="px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 font-bold">
            {currentLabel.stage || 'Execution'}
          </span>
        </div>
      </div>

      {/* Scrubbing Track / Progress Steps */}
      <div className="relative flex items-center gap-1.5 py-1">
        {Array.from({ length: totalSteps }).map((_, idx) => (
          <button
            key={idx}
            onClick={() => onStepChange(idx)}
            className={`flex-1 h-2 rounded-full transition-all duration-300 relative group ${
              idx <= currentStep
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 shadow-sm shadow-sky-500/40'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {/* Tooltip on hover */}
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[#06080F] border border-slate-800 text-[10px] text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition shadow-xl font-mono">
              Step {idx + 1}: {stepLabels[idx]?.label || 'Node'}
            </span>
          </button>
        ))}
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-[11px] font-mono truncate max-w-[360px]" title={currentLabel.label}>
          <Radio className="w-3 h-3 text-sky-400 shrink-0" />
          <span className="font-black text-white">{currentLabel.label}</span>
          {currentLabel.time && (
            <span className="text-slate-500 text-[10px]">({currentLabel.time})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onStepChange(Math.max(0, currentStep - 1))}
            disabled={currentStep === 0}
            className="p-1.5 rounded-xl bg-[#0E1526] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-40"
            title="Previous Step"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onTogglePlay}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white flex items-center gap-1.5 text-xs font-extrabold shadow-md shadow-sky-600/30 transition"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" /> Play Attack
              </>
            )}
          </button>

          <button
            onClick={() => onStepChange(Math.min(totalSteps - 1, currentStep + 1))}
            disabled={currentStep === totalSteps - 1}
            className="p-1.5 rounded-xl bg-[#0E1526] hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition disabled:opacity-40"
            title="Next Step"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onStepChange(totalSteps - 1)}
            className="p-1.5 rounded-xl bg-[#0E1526] hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition"
            title="Show All Steps (Full Graph)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

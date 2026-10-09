import React, { useState, useEffect } from 'react';
import { Task } from '../types/task';
import { CheckCircle2, Square, Sparkles, Clock } from 'lucide-react';
import { soundService } from '../services/soundService';

interface FocusTimerBarProps {
  task: Task;
  onComplete: (taskId: string) => void;
  onStopWorking: (taskId: string) => void;
  onViewTask: (task: Task) => void;
}

export const FocusTimerBar: React.FC<FocusTimerBarProps> = ({
  task,
  onComplete,
  onStopWorking,
  onViewTask,
}) => {
  const [secondsSpent, setSecondsSpent] = useState<number>(0);

  useEffect(() => {
    // Determine when user acknowledged 'working'
    const startTime = task.lastAcknowledgedAt ? new Date(task.lastAcknowledgedAt).getTime() : Date.now();
    const update = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setSecondsSpent(elapsed);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [task.lastAcknowledgedAt]);

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleMarkDone = () => {
    soundService.playSuccessChime();
    onComplete(task.id);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-indigo-500/40 shadow-2xl py-3 px-4 md:px-8 animate-in slide-in-from-bottom duration-200">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Left side: Active focus status */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/60 text-indigo-400 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2 text-xs text-indigo-300 font-semibold tracking-wide uppercase">
              <span>Accountability Focus Mode</span>
              <span>·</span>
              <span className="text-neutral-400 capitalize">{task.category}</span>
            </div>
            <h4 className="text-sm font-bold text-white truncate max-w-xs md:max-w-md">
              {task.title}
            </h4>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto">
          {/* Timer Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-indigo-300 font-mono text-sm font-bold tabular-nums">
            <Clock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>{formatTimer(secondsSpent)}</span>
            <span className="text-neutral-500 text-xs font-normal">/ {task.estimatedDuration}m</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onStopWorking(task.id)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Pause focus session"
            >
              <Square className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden md:inline">Pause Focus</span>
            </button>

            <button
              onClick={() => onViewTask(task)}
              className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 hidden lg:inline transition-colors cursor-pointer"
            >
              Details
            </button>

            <button
              onClick={handleMarkDone}
              className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>MARK AS DONE</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

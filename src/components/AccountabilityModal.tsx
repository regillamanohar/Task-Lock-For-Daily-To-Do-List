import React, { useState, useEffect } from 'react';
import { Task, UserSettings } from '../types/task';
import { reminderService } from '../services/reminderService';
import { soundService } from '../services/soundService';
import { AlertTriangle, CheckCircle2, Clock, Play, Volume2, VolumeX, Eye, ArrowRight } from 'lucide-react';

interface AccountabilityModalProps {
  task: Task;
  settings: UserSettings;
  onMarkDone: (taskId: string) => void;
  onWorkingOnIt: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onViewTask: (task: Task) => void;
  onDismissAlert: () => void;
}

export const AccountabilityModal: React.FC<AccountabilityModalProps> = ({
  task,
  settings,
  onMarkDone,
  onWorkingOnIt,
  onSnooze,
  onViewTask,
  onDismissAlert,
}) => {
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [customSnooze, setCustomSnooze] = useState(settings.defaultSnoozeMinutes || 5);
  const [isMutedForNow, setIsMutedForNow] = useState(false);

  // Live tick to show exact elapsed time and start continuous alarm
  useEffect(() => {
    // Start continuous non-stop ringing immediately
    soundService.startContinuousAlarm();

    const updateTime = () => {
      const deadline = reminderService.getTaskDeadline(task);
      const diffMs = Date.now() - deadline.getTime();
      setElapsedSec(Math.max(0, Math.floor(diffMs / 1000)));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      clearInterval(interval);
      soundService.stopContinuousAlarm();
    };
  }, [task]);

  const formatElapsed = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const priorityColor = {
    low: 'text-neutral-400 bg-neutral-800/80 border-neutral-700',
    medium: 'text-blue-400 bg-blue-950/60 border-blue-800/60',
    high: 'text-amber-400 bg-amber-950/60 border-amber-800/60',
    critical: 'text-rose-400 bg-rose-950/60 border-rose-800/60',
  }[task.priority];

  const handleSnooze = (minutes: number) => {
    soundService.stopContinuousAlarm();
    soundService.playSnoozeTone();
    onSnooze(task.id, minutes);
  };

  const handleMarkDone = () => {
    soundService.stopContinuousAlarm();
    soundService.playSuccessChime();
    onMarkDone(task.id);
  };

  const handleWorkingOnIt = () => {
    soundService.stopContinuousAlarm();
    onWorkingOnIt(task.id);
  };

  const handleSilenceAlarm = () => {
    setIsMutedForNow(true);
    soundService.stopContinuousAlarm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="alert-heading"
        className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl bg-neutral-900 border-t-2 sm:border-2 border-rose-500 shadow-2xl shadow-rose-950/80 p-5 sm:p-7 flex flex-col text-neutral-100 relative overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Top active alert indicator */}
        <div className="flex items-center justify-between pb-3 mb-2 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <span className="text-xs font-bold tracking-wider text-rose-400 uppercase">
              Alarm Ringing · Action Required
            </span>
          </div>

          <button
            onClick={isMutedForNow ? () => { setIsMutedForNow(false); soundService.startContinuousAlarm(); } : handleSilenceAlarm}
            className="px-2.5 py-1 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {isMutedForNow ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400 animate-bounce" />}
            <span className="text-[11px] font-medium">{isMutedForNow ? 'Alarm Muted' : 'Silence Bell'}</span>
          </button>
        </div>

        {/* Task Title & Meta */}
        <div className="mb-4">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-xs text-neutral-400">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${priorityColor} uppercase`}>
              {task.priority}
            </span>
            <span>·</span>
            <span>{task.category}</span>
            <span>·</span>
            <span>Due at <strong className="text-white">{task.dueTime}</strong></span>
          </div>
          <h2 id="alert-heading" className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
            {task.title}
          </h2>
          {task.description && (
            <p className="mt-1.5 text-xs text-neutral-300 line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Overdue live counter */}
        <div className="p-3.5 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-between font-mono mb-5">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-sans font-semibold">
              Accountability Timer
            </div>
            <div className="text-xs font-bold text-rose-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
              <span>OVERDUE NOW</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
              +{formatElapsed(elapsedSec)}
            </div>
          </div>
        </div>

        {/* Big tactile mobile-first buttons */}
        <div className="flex flex-col gap-2.5">
          {/* Primary: MARK AS DONE */}
          <button
            onClick={handleMarkDone}
            className="w-full min-h-[52px] py-3.5 px-4 rounded-2xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>MARK AS DONE</span>
          </button>

          {/* Secondary: I'M WORKING ON IT */}
          <button
            onClick={handleWorkingOnIt}
            className="w-full min-h-[48px] py-3 px-4 rounded-2xl font-semibold text-sm bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white shadow-md shadow-indigo-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>I'M WORKING ON IT (START FOCUS)</span>
          </button>

          {/* Snooze & Details */}
          <div className="grid grid-cols-2 gap-2 mt-0.5">
            <button
              onClick={() => setSnoozeOpen(!snoozeOpen)}
              className="min-h-[44px] py-2.5 px-3 rounded-xl font-medium text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-neutral-400" />
              <span>Snooze...</span>
            </button>

            <button
              onClick={() => {
                soundService.stopContinuousAlarm();
                onViewTask(task);
              }}
              className="min-h-[44px] py-2.5 px-3 rounded-xl font-medium text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4 text-neutral-400" />
              <span>Edit / Details</span>
            </button>
          </div>

          {/* Snooze drawer */}
          {snoozeOpen && (
            <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex flex-col gap-2 mt-1">
              <span className="text-[11px] text-neutral-400 font-medium">Select snooze minutes:</span>
              <div className="grid grid-cols-4 gap-1.5">
                {[5, 10, 15, 30].map((min) => (
                  <button
                    key={min}
                    onClick={() => handleSnooze(min)}
                    className="py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold tabular-nums border border-neutral-700 text-center cursor-pointer"
                  >
                    +{min}m
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Continuous alarm active</span>
          <button
            onClick={() => {
              soundService.stopContinuousAlarm();
              onDismissAlert();
            }}
            className="text-neutral-400 hover:text-white underline cursor-pointer"
          >
            Dismiss Screen
          </button>
        </div>
      </div>
    </div>
  );
};

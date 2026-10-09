import React, { useState, useEffect } from 'react';
import { Task, UserSettings } from '../types/task';
import { reminderService } from '../services/reminderService';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Plus,
  Trash2,
  BellRing,
  Volume2,
  Mic,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  tasks: Task[];
  settings: UserSettings;
  onOpenCreateTask: (defaultDate?: string) => void;
  onOpenVoiceAssistant: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onWorkingOnIt: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onTriggerTestDueAlert: () => void;
  onRequestNotificationPermission: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  settings,
  onOpenCreateTask,
  onOpenVoiceAssistant,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onWorkingOnIt,
  onTriggerTestDueAlert,
  onRequestNotificationPermission,
  notificationPermission,
}) => {
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // High-precision clock tick for countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = currentTime.toISOString().split('T')[0];

  // Tasks for today
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const completedToday = todayTasks.filter((t) => t.isCompleted);
  const pendingToday = todayTasks.filter((t) => !t.isCompleted);

  // Overdue tasks
  const overdueTasks = tasks.filter((t) => {
    if (t.isCompleted) return false;
    const status = reminderService.getTaskStatus(t, currentTime);
    return status === 'overdue' || status === 'due_now';
  });

  // Next task due
  const nextUpcomingTask = tasks
    .filter((t) => !t.isCompleted)
    .sort((a, b) => {
      const da = reminderService.getTaskDeadline(a).getTime();
      const db = reminderService.getTaskDeadline(b).getTime();
      return da - db;
    })
    .find((t) => {
      const diff = reminderService.getTaskDeadline(t).getTime() - currentTime.getTime();
      return diff > 0;
    });

  // Filter tasks list
  const filteredTasks = todayTasks.filter((t) => {
    if (filter === 'all') return true;
    if (filter === 'completed') return t.isCompleted;
    if (filter === 'pending') return !t.isCompleted;
    if (filter === 'overdue') {
      if (t.isCompleted) return false;
      const status = reminderService.getTaskStatus(t, currentTime);
      return status === 'overdue' || status === 'due_now';
    }
    return true;
  });

  const timelineTasks = [...filteredTasks].sort((a, b) => a.dueTime.localeCompare(b.dueTime));

  const handleDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === taskId) {
      onDeleteTask(taskId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(taskId);
    }
  };

  const formattedDate = currentTime.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="space-y-4 pb-20 max-w-xl mx-auto px-1 sm:px-0">
      {/* Clean Mobile App Header Bar */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider font-mono">
            {formattedDate}
          </span>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            TaskLock
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {notificationPermission !== 'granted' && (
            <button
              onClick={onRequestNotificationPermission}
              className="p-2 rounded-xl bg-amber-950/60 border border-amber-800 text-amber-400 text-xs flex items-center justify-center transition-colors cursor-pointer"
              title="Enable notifications"
            >
              <BellRing className="w-4 h-4" />
            </button>
          )}

          {/* Voice Assistant Quick Mic Button */}
          <button
            onClick={onOpenVoiceAssistant}
            className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-950/80 border border-indigo-600/80 text-indigo-300 hover:bg-indigo-900 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm shadow-indigo-950"
            title="Voice Assistant (Telugu, Hindi, English)"
          >
            <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
            <span>Voice Lock</span>
          </button>

          {/* Test Alarm Continuous Ringing Button */}
          <button
            onClick={onTriggerTestDueAlert}
            className="min-h-[40px] px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 border border-rose-900/60 text-rose-300 hover:bg-neutral-800 flex items-center gap-1 transition-colors cursor-pointer"
            title="Trigger continuous alarm to preview full-screen accountability takeover"
          >
            <Volume2 className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">Test Alarm</span>
          </button>

          {/* New Task Button */}
          <button
            onClick={() => onOpenCreateTask(todayStr)}
            className="min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 flex items-center gap-1 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </div>
      </div>

      {/* Overdue Urgent Alert Banner */}
      {overdueTasks.length > 0 && (
        <div 
          onClick={() => setFilter('overdue')}
          className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/80 shadow-lg shadow-rose-950/30 flex items-center justify-between gap-3 cursor-pointer transition-all hover:bg-rose-950/60"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-bounce" />
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-white">
                {overdueTasks.length} Overdue {overdueTasks.length === 1 ? 'Task' : 'Tasks'}!
              </h3>
              <p className="text-[11px] text-rose-300/80">
                Tap to inspect and acknowledge before next alarm
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-400 bg-rose-900/60 px-2.5 py-1 rounded-lg border border-rose-700">
            Fix Now
          </span>
        </div>
      )}

      {/* Simple 3-Metric Mobile Strip */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setFilter('pending')}
          className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
            filter === 'pending'
              ? 'bg-neutral-800 border-indigo-500 ring-1 ring-indigo-500'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <span className="text-[11px] font-medium text-neutral-400 block">Pending</span>
          <span className="text-xl font-black text-indigo-400 font-mono tabular-nums">
            {pendingToday.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('completed')}
          className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
            filter === 'completed'
              ? 'bg-neutral-800 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <span className="text-[11px] font-medium text-neutral-400 block">Completed</span>
          <span className="text-xl font-black text-emerald-400 font-mono tabular-nums">
            {completedToday.length}
          </span>
        </button>

        <button
          onClick={() => setFilter('overdue')}
          className={`p-3 rounded-2xl border text-left transition-colors cursor-pointer ${
            filter === 'overdue'
              ? 'bg-neutral-800 border-rose-500 ring-1 ring-rose-500'
              : 'bg-neutral-900 border-neutral-800'
          }`}
        >
          <span className="text-[11px] font-medium text-neutral-400 block">Overdue</span>
          <span className={`text-xl font-black font-mono tabular-nums ${overdueTasks.length > 0 ? 'text-rose-400' : 'text-neutral-500'}`}>
            {overdueTasks.length}
          </span>
        </button>
      </div>

      {/* Next Upcoming Task Countdown Card */}
      {nextUpcomingTask && (
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-sm space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Next Due</span>
            </span>
            <span className="font-mono text-indigo-300 font-bold">
              {nextUpcomingTask.dueTime}
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white truncate">
              {nextUpcomingTask.title}
            </h3>
            <p className="text-xs text-amber-400 font-mono font-bold mt-1">
              ⏳ {reminderService.formatTimeDifference(nextUpcomingTask, currentTime).label}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onWorkingOnIt(nextUpcomingTask.id)}
              className="flex-1 min-h-[40px] py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Focus On It</span>
            </button>
            <button
              onClick={() => onToggleComplete(nextUpcomingTask.id)}
              className="min-h-[40px] py-2 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-emerald-400 text-xs font-semibold border border-neutral-700 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      )}

      {/* Today's Tasks Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Today's Schedule ({timelineTasks.length})
          </h2>

          <div className="flex items-center gap-1 text-[11px]">
            {(['all', 'pending', 'completed'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors cursor-pointer ${
                  filter === tab
                    ? 'bg-neutral-800 text-white font-semibold'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {timelineTasks.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
            <p className="text-xs text-neutral-400">
              {todayTasks.length === 0
                ? 'No tasks scheduled for today.'
                : 'No tasks match the selected filter.'}
            </p>
            <button
              onClick={() => onOpenCreateTask(todayStr)}
              className="text-xs text-indigo-400 hover:underline font-medium cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Schedule a task for today</span>
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {timelineTasks.map((task) => {
              const status = reminderService.getTaskStatus(task, currentTime);
              const timeDiff = reminderService.formatTimeDifference(task, currentTime);
              const isOverdue = status === 'overdue' || status === 'due_now';
              const isConfirmingDelete = confirmDeleteId === task.id;

              return (
                <div
                  key={task.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                    task.isCompleted
                      ? 'bg-neutral-950/60 border-neutral-900 opacity-60'
                      : isOverdue
                      ? 'bg-rose-950/20 border-rose-900/60'
                      : 'bg-neutral-900 border-neutral-800'
                  }`}
                >
                  {/* Left: Checkbox */}
                  <button
                    onClick={() => onToggleComplete(task.id)}
                    className={`min-w-[36px] min-h-[36px] rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 ${
                      task.isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-neutral-700 bg-neutral-950 hover:border-emerald-500 text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 fill-current" />
                  </button>

                  {/* Center: Title & Due Time */}
                  <div className="flex-1 min-w-0" onClick={() => onEditTask(task)}>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-neutral-400">
                      <span className={`font-bold ${isOverdue ? 'text-rose-400' : 'text-neutral-300'}`}>
                        {task.dueTime}
                      </span>
                      <span>·</span>
                      <span className="truncate">{task.category}</span>
                    </div>
                    <h3
                      className={`text-sm font-bold truncate ${
                        task.isCompleted ? 'line-through text-neutral-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </h3>
                    <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                      {timeDiff.label}
                    </div>
                  </div>

                  {/* Right Actions: Focus & Direct Trash Delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    {!task.isCompleted && (
                      <button
                        onClick={() => onWorkingOnIt(task.id)}
                        className="min-w-[34px] min-h-[34px] rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-300 flex items-center justify-center cursor-pointer"
                        title="Focus timer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    )}

                    {/* DIRECT DELETE BUTTON WITH 2-STEP INLINE CONFIRM */}
                    <button
                      onClick={(e) => handleDelete(task.id, e)}
                      className={`min-h-[34px] px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isConfirmingDelete
                          ? 'bg-rose-600 text-white animate-pulse'
                          : 'bg-neutral-800 text-neutral-400 hover:text-rose-400'
                      }`}
                      title={isConfirmingDelete ? 'Tap again to delete' : 'Delete task'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isConfirmingDelete && <span className="text-[10px]">Delete?</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

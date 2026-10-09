import React, { useState, useEffect } from 'react';
import { Task, Priority, Category, TaskStatus } from '../types/task';
import { reminderService } from '../services/reminderService';
import {
  Search,
  CheckCircle2,
  Clock,
  Play,
  RotateCcw,
  Plus,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
  Mic,
} from 'lucide-react';

interface TasksViewProps {
  tasks: Task[];
  onOpenCreateTask: () => void;
  onOpenVoiceAssistant?: () => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (taskId: string) => void;
  onWorkingOnIt: (taskId: string) => void;
  onReschedule: (taskId: string, newDate: string, newTime: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({
  tasks,
  onOpenCreateTask,
  onOpenVoiceAssistant,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onWorkingOnIt,
  onReschedule,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'completed'>('all');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rescheduleTaskId, setRescheduleTaskId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter tasks
  const filtered = tasks.filter((task) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!task.title.toLowerCase().includes(q) && !task.description.toLowerCase().includes(q)) {
        return false;
      }
    }

    if (categoryFilter !== 'all' && task.category !== categoryFilter) {
      return false;
    }

    if (statusFilter === 'completed' && !task.isCompleted) return false;
    if (statusFilter === 'pending' && task.isCompleted) return false;
    if (statusFilter === 'overdue') {
      if (task.isCompleted) return false;
      const status = reminderService.getTaskStatus(task, currentTime);
      if (status !== 'overdue' && status !== 'due_now') return false;
    }

    return true;
  });

  // Sort by deadline
  const sortedTasks = [...filtered].sort((a, b) => {
    if (a.isCompleted !== b.isCompleted) {
      return a.isCompleted ? 1 : -1;
    }
    const da = reminderService.getTaskDeadline(a).getTime();
    const db = reminderService.getTaskDeadline(b).getTime();
    return da - db;
  });

  const handleDeleteClick = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirmDeleteId === taskId) {
      // Second tap: execute delete immediately!
      onDeleteTask(taskId);
      setConfirmDeleteId(null);
    } else {
      // First tap: prompt confirmation inline
      setConfirmDeleteId(taskId);
    }
  };

  const handleQuickReschedule = (taskId: string, minutes: number) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const current = reminderService.getTaskDeadline(task);
    const target = new Date(Math.max(Date.now(), current.getTime()) + minutes * 60000);
    const dateStr = target.toISOString().split('T')[0];
    const timeStr = `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}`;
    onReschedule(taskId, dateStr, timeStr);
    setRescheduleTaskId(null);
  };

  const categories: Category[] = ['Work', 'Study', 'Health', 'Personal', 'Finance', 'Urgent'];

  return (
    <div className="space-y-4 pb-20 max-w-xl mx-auto px-1 sm:px-0">
      {/* Mobile Top Header */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">Tasks</h1>
          <p className="text-xs text-neutral-400 font-mono">
            {tasks.filter((t) => !t.isCompleted).length} pending · {tasks.filter((t) => t.isCompleted).length} done
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenVoiceAssistant && (
            <button
              onClick={onOpenVoiceAssistant}
              className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-indigo-950/80 border border-indigo-600/80 text-indigo-300 hover:bg-indigo-900 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer shadow-sm shadow-indigo-950"
              title="Voice Assistant (Telugu, Hindi, English)"
            >
              <Mic className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
              <span>Voice</span>
            </button>
          )}
          <button
            onClick={onOpenCreateTask}
            className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>
      </div>

      {/* Quick Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search your tasks..."
          className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-2xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
        />
      </div>

      {/* Touch-Friendly Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
        {[
          { id: 'all', label: 'All' },
          { id: 'pending', label: 'Pending' },
          { id: 'overdue', label: 'Overdue' },
          { id: 'completed', label: 'Completed' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
            className={`min-h-[38px] px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition-colors cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                : 'bg-neutral-900/60 text-neutral-400 hover:text-white border border-neutral-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}

        <div className="ml-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as typeof categoryFilter)}
            className="min-h-[38px] px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 outline-none"
          >
            <option value="all">Category</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      {sortedTasks.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
          <Clock className="w-8 h-8 text-neutral-600 mx-auto" />
          <h3 className="text-sm font-semibold text-neutral-300">No tasks found</h3>
          <p className="text-xs text-neutral-500">
            {tasks.length === 0
              ? 'Your task list is empty. Tap "+ New Task" to schedule one!'
              : 'Try clearing your search or filter.'}
          </p>
          <button
            onClick={onOpenCreateTask}
            className="mt-1 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 text-white transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Create Task</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {sortedTasks.map((task) => {
            const status = reminderService.getTaskStatus(task, currentTime);
            const timeDiff = reminderService.formatTimeDifference(task, currentTime);
            const isOverdue = status === 'overdue' || status === 'due_now';
            const isConfirmingDelete = confirmDeleteId === task.id;
            const isExpanded = expandedId === task.id;

            return (
              <div
                key={task.id}
                className={`rounded-2xl border p-3.5 transition-all ${
                  task.isCompleted
                    ? 'bg-neutral-950/60 border-neutral-900 opacity-60'
                    : isOverdue
                    ? 'bg-rose-950/20 border-rose-900/60 shadow-md shadow-rose-950/20'
                    : 'bg-neutral-900 border-neutral-800'
                }`}
              >
                {/* Main Row */}
                <div className="flex items-start gap-3">
                  {/* Big Checkbox Target (44x44 hitbox) */}
                  <button
                    onClick={() => onToggleComplete(task.id)}
                    className={`min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center border transition-colors cursor-pointer shrink-0 mt-0.5 ${
                      task.isCompleted
                        ? 'bg-emerald-600 border-emerald-500 text-white'
                        : 'border-neutral-700 bg-neutral-950/80 hover:border-emerald-500 text-transparent hover:text-emerald-500/40'
                    }`}
                    title={task.isCompleted ? 'Mark incomplete' : 'Mark done'}
                  >
                    <CheckCircle2 className="w-5 h-5 fill-current" />
                  </button>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0" onClick={() => onEditTask(task)}>
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 font-mono mb-0.5">
                      <span className={`font-semibold ${isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-300'}`}>
                        {task.dueTime}
                      </span>
                      <span>·</span>
                      <span className="capitalize">{task.category}</span>
                      <span>·</span>
                      <span className="capitalize">{task.priority}</span>
                    </div>

                    <h3
                      className={`text-sm sm:text-base font-bold leading-snug truncate ${
                        task.isCompleted ? 'line-through text-neutral-500' : 'text-white'
                      }`}
                    >
                      {task.title}
                    </h3>

                    {task.description && (
                      <p className="text-xs text-neutral-400 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono">
                      <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-neutral-400'}>
                        {timeDiff.label}
                      </span>
                      {task.escalationCount > 0 && !task.isCompleted && (
                        <span className="text-amber-400 font-bold">
                          · {task.escalationCount} alerts
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Direct Action Buttons on Card */}
                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {!task.isCompleted && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onWorkingOnIt(task.id);
                        }}
                        className="min-w-[36px] min-h-[36px] rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-300 flex items-center justify-center transition-colors cursor-pointer"
                        title="Focus timer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTask(task);
                      }}
                      className="min-w-[36px] min-h-[36px] rounded-xl bg-neutral-800 text-neutral-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit task"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* DIRECT DELETE BUTTON */}
                    <button
                      onClick={(e) => handleDeleteClick(task.id, e)}
                      className={`min-h-[36px] px-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                        isConfirmingDelete
                          ? 'bg-rose-600 text-white animate-pulse shadow-md'
                          : 'bg-neutral-800/80 hover:bg-rose-950/60 text-neutral-400 hover:text-rose-400 border border-neutral-700/60'
                      }`}
                      title={isConfirmingDelete ? 'Tap again to delete' : 'Delete task'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {isConfirmingDelete && <span className="text-[11px]">Delete?</span>}
                    </button>
                  </div>
                </div>

                {/* Quick Reschedule & Details Drawer */}
                <div className="mt-2.5 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-neutral-400">
                    <button
                      onClick={() => setRescheduleTaskId(rescheduleTaskId === task.id ? null : task.id)}
                      className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reschedule</span>
                    </button>
                    <span>·</span>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : task.id)}
                      className="text-neutral-400 hover:text-neutral-200 flex items-center gap-1 cursor-pointer"
                    >
                      <span>Notes & History</span>
                      {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  </div>

                  <span className="text-neutral-500 font-mono text-[10px]">
                    {task.dueDate}
                  </span>
                </div>

                {/* Reschedule Drawer */}
                {rescheduleTaskId === task.id && (
                  <div className="mt-2 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-1.5 text-xs">
                    <span className="text-[10px] text-neutral-400 font-mono">Delay by:</span>
                    <button
                      onClick={() => handleQuickReschedule(task.id, 15)}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] cursor-pointer"
                    >
                      +15m
                    </button>
                    <button
                      onClick={() => handleQuickReschedule(task.id, 60)}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] cursor-pointer"
                    >
                      +1h
                    </button>
                    <button
                      onClick={() => handleQuickReschedule(task.id, 1440)}
                      className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-[11px] cursor-pointer"
                    >
                      Tomorrow
                    </button>
                  </div>
                )}

                {/* Details Drawer */}
                {isExpanded && (
                  <div className="mt-2 p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-xs space-y-2">
                    {task.notes && (
                      <div>
                        <span className="text-[10px] text-neutral-400 font-mono block">Notes:</span>
                        <p className="text-neutral-200 mt-0.5">{task.notes}</p>
                      </div>
                    )}
                    <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between pt-1 border-t border-neutral-900">
                      <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                      <span>Cadence: {task.repeatSchedule}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

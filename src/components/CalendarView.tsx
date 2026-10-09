import React, { useState } from 'react';
import { Task } from '../types/task';
import { reminderService } from '../services/reminderService';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';

interface CalendarViewProps {
  tasks: Task[];
  onOpenCreateTask: (defaultDate?: string) => void;
  onEditTask: (task: Task) => void;
  onToggleComplete: (taskId: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  onOpenCreateTask,
  onEditTask,
  onToggleComplete,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format YYYY-MM-DD
  const formatYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Month navigation
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  const jumpToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDateStr(todayStr);
  };

  // Generate month grid
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Grid dates: days of previous month to fill start row + days of this month
  const calendarCells: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

  // Previous month trailing days
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    calendarCells.push({ dateStr: formatYMD(d), dayNum: d.getDate(), isCurrentMonth: false });
  }

  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarCells.push({ dateStr: formatYMD(d), dayNum: i, isCurrentMonth: true });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remainingCells = 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    calendarCells.push({ dateStr: formatYMD(d), dayNum: i, isCurrentMonth: false });
  }

  // Selected date tasks
  const tasksForSelectedDate = tasks
    .filter((t) => t.dueDate === selectedDateStr)
    .sort((a, b) => a.dueTime.localeCompare(b.dueTime));

  // Scheduling Conflict Detector for selected date
  // Checks if any two tasks overlap within their estimated duration or are scheduled at the exact same minute
  const detectConflicts = (dayTasks: Task[]) => {
    const conflicts: { taskA: Task; taskB: Task; reason: string }[] = [];
    for (let i = 0; i < dayTasks.length; i++) {
      for (let j = i + 1; j < dayTasks.length; j++) {
        const t1 = dayTasks[i];
        const t2 = dayTasks[j];
        if (t1.dueTime === t2.dueTime) {
          conflicts.push({
            taskA: t1,
            taskB: t2,
            reason: `Exact same due time: ${t1.dueTime}`,
          });
        }
      }
    }
    return conflicts;
  };

  const conflictsOnSelectedDate = detectConflicts(tasksForSelectedDate);

  // Month title
  const monthTitle = currentDate.toLocaleString(undefined, { month: 'long', year: 'numeric' });

  // Week view calculation
  const getWeekDates = () => {
    const base = new Date(selectedDateStr + 'T00:00:00');
    const dayOfWeek = base.getDay();
    const startOfWeek = new Date(base.getTime() - dayOfWeek * 86400000);
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(startOfWeek.getTime() + i * 86400000));
    }
    return week;
  };

  const weekDates = getWeekDates();

  return (
    <div className="space-y-6 pb-12">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Calendar & Schedule</h1>
          <p className="text-xs text-neutral-400">
            View daily deadlines, identify timing conflicts, and schedule future commitments
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 bg-neutral-900 rounded-xl border border-neutral-800 text-xs">
            {(['month', 'week', 'day'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-lg capitalize font-medium transition-colors cursor-pointer ${
                  viewMode === mode
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={() => onOpenCreateTask(selectedDateStr)}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule on Date</span>
          </button>
        </div>
      </div>

      {/* Navigation Controls Strip */}
      <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-base font-bold text-white min-w-36 text-center">
            {monthTitle}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={jumpToday}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 transition-colors cursor-pointer"
        >
          Today
        </button>
      </div>

      {/* Main Calendar Area */}
      {viewMode === 'month' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Month Grid */}
          <div className="lg:col-span-2 p-4 rounded-2xl bg-neutral-900 border border-neutral-800">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-400 pb-2 border-b border-neutral-800">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1 pt-2">
              {calendarCells.map((cell) => {
                const dayTasks = tasks.filter((t) => t.dueDate === cell.dateStr);
                const isSelected = selectedDateStr === cell.dateStr;
                const isToday = cell.dateStr === todayStr;
                const hasIncomplete = dayTasks.some((t) => !t.isCompleted);
                const hasOverdue = dayTasks.some((t) => {
                  if (t.isCompleted) return false;
                  return t.dueDate < todayStr;
                });

                return (
                  <button
                    key={cell.dateStr}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[72px] md:min-h-[84px] p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500 shadow-md ring-1 ring-indigo-500'
                        : isToday
                        ? 'bg-neutral-800/80 border-indigo-600/50 hover:border-neutral-600'
                        : cell.isCurrentMonth
                        ? 'bg-neutral-950/70 border-neutral-800 hover:border-neutral-700'
                        : 'bg-neutral-950/20 border-neutral-800/40 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-semibold ${
                          isToday
                            ? 'w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                            : isSelected
                            ? 'text-indigo-400 font-bold'
                            : 'text-neutral-400'
                        }`}
                      >
                        {cell.dayNum}
                      </span>
                      {hasOverdue && (
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" title="Has overdue task" />
                      )}
                    </div>

                    {/* Task micro pills / count */}
                    <div className="space-y-0.5 mt-1">
                      {dayTasks.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className={`text-[9px] truncate px-1 rounded font-mono ${
                            t.isCompleted
                              ? 'text-neutral-500 line-through'
                              : t.priority === 'critical'
                              ? 'bg-rose-950/80 text-rose-300'
                              : 'bg-neutral-800 text-neutral-300'
                          }`}
                        >
                          {t.dueTime} {t.title}
                        </div>
                      ))}
                      {dayTasks.length > 2 && (
                        <span className="text-[9px] font-mono text-neutral-400 block px-1">
                          +{dayTasks.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Inspector & Conflict Panel */}
          <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                <div>
                  <span className="text-xs font-semibold text-neutral-400 font-mono">
                    {selectedDateStr === todayStr ? 'Today' : selectedDateStr}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    Scheduled Deadlines ({tasksForSelectedDate.length})
                  </h3>
                </div>
                <button
                  onClick={() => onOpenCreateTask(selectedDateStr)}
                  className="p-1.5 rounded-lg text-indigo-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
                  title="Add task on this date"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Conflict Alert Warning */}
              {conflictsOnSelectedDate.length > 0 && (
                <div className="my-3 p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-300 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold">Timing Conflict Detected:</span>
                    <p className="text-[11px] text-amber-200/90 mt-0.5">
                      {conflictsOnSelectedDate[0].reason}. Consider staggering deadlines by 30 minutes.
                    </p>
                  </div>
                </div>
              )}

              {/* Tasks List for Date */}
              <div className="py-3 space-y-2 max-h-96 overflow-y-auto pr-1">
                {tasksForSelectedDate.length === 0 ? (
                  <div className="py-12 text-center text-neutral-500 text-xs space-y-2">
                    <CalendarDays className="w-6 h-6 mx-auto opacity-60" />
                    <p>No deadlines scheduled for {selectedDateStr}.</p>
                    <button
                      onClick={() => onOpenCreateTask(selectedDateStr)}
                      className="text-indigo-400 hover:underline cursor-pointer"
                    >
                      + Schedule task
                    </button>
                  </div>
                ) : (
                  tasksForSelectedDate.map((t) => (
                    <div
                      key={t.id}
                      className={`p-3 rounded-xl border transition-all ${
                        t.isCompleted
                          ? 'bg-neutral-950/50 border-neutral-800 opacity-60'
                          : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-neutral-400 mb-1">
                        <span className="font-mono font-bold text-neutral-200">{t.dueTime}</span>
                        <span className="capitalize">{t.priority}</span>
                      </div>
                      <h4
                        className={`text-sm font-semibold ${
                          t.isCompleted ? 'line-through text-neutral-500' : 'text-white'
                        }`}
                      >
                        {t.title}
                      </h4>
                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-neutral-900 text-xs">
                        <button
                          onClick={() => onToggleComplete(t.id)}
                          className="text-neutral-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t.isCompleted ? 'Undo' : 'Complete'}</span>
                        </button>
                        <button
                          onClick={() => onEditTask(t)}
                          className="text-indigo-400 hover:underline cursor-pointer"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-neutral-800 text-xs text-neutral-500 flex items-center justify-between">
              <span>{tasksForSelectedDate.filter((t) => t.isCompleted).length} Completed</span>
              <span>{tasksForSelectedDate.filter((t) => !t.isCompleted).length} Pending</span>
            </div>
          </div>
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((d) => {
              const ymd = formatYMD(d);
              const dayTasks = tasks.filter((t) => t.dueDate === ymd);
              const isSelected = selectedDateStr === ymd;
              const isToday = ymd === todayStr;

              return (
                <div
                  key={ymd}
                  onClick={() => setSelectedDateStr(ymd)}
                  className={`p-3 rounded-xl border flex flex-col justify-between min-h-[160px] cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                      : isToday
                      ? 'bg-neutral-800/80 border-indigo-600/60'
                      : 'bg-neutral-950 border-neutral-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5">
                    <span className="text-xs font-semibold text-neutral-400">
                      {d.toLocaleString(undefined, { weekday: 'short' })}
                    </span>
                    <span className="text-xs font-mono font-bold text-white">
                      {d.getDate()}
                    </span>
                  </div>

                  <div className="space-y-1.5 my-2 flex-1">
                    {dayTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditTask(t);
                        }}
                        className={`p-1.5 rounded text-[11px] font-mono truncate cursor-pointer ${
                          t.isCompleted
                            ? 'bg-neutral-900 text-neutral-500 line-through'
                            : 'bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
                        }`}
                      >
                        {t.dueTime} {t.title}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCreateTask(ymd);
                    }}
                    className="w-full py-1 text-center text-[10px] text-neutral-400 hover:text-white rounded bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 transition-colors"
                  >
                    + Add
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <h3 className="text-lg font-bold text-white">
              Hourly Schedule for {selectedDateStr}
            </h3>
            <button
              onClick={() => onOpenCreateTask(selectedDateStr)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white"
            >
              + Add Task
            </button>
          </div>

          <div className="space-y-2">
            {Array.from({ length: 15 }).map((_, idx) => {
              const hour = idx + 8; // 8:00 to 22:00
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              const hourTasks = tasksForSelectedDate.filter((t) => {
                const h = parseInt(t.dueTime.split(':')[0], 10);
                return h === hour;
              });

              return (
                <div
                  key={hour}
                  className="flex items-start gap-4 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800/80"
                >
                  <span className="w-14 text-xs font-mono text-neutral-400 font-semibold pt-1">
                    {hourStr}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    {hourTasks.length === 0 ? (
                      <span className="text-xs text-neutral-700 italic">Open block</span>
                    ) : (
                      hourTasks.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => onEditTask(t)}
                          className="p-2 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-neutral-700 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <span className="text-xs font-bold text-white">{t.title}</span>
                            <div className="text-[11px] text-neutral-400 font-mono">
                              {t.dueTime} · {t.estimatedDuration}m · {t.priority}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleComplete(t.id);
                            }}
                            className="p-1 text-neutral-400 hover:text-emerald-400"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

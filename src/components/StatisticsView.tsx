import React from 'react';
import { Task, Category, Priority } from '../types/task';
import { reminderService } from '../services/reminderService';
import {
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Award,
  Calendar,
  PieChart,
} from 'lucide-react';

interface StatisticsViewProps {
  tasks: Task[];
}

export const StatisticsView: React.FC<StatisticsViewProps> = ({ tasks }) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // 1. Daily completion stats
  const todayTasks = tasks.filter((t) => t.dueDate === todayStr);
  const completedToday = todayTasks.filter((t) => t.isCompleted);
  const dailyRate = todayTasks.length > 0 ? Math.round((completedToday.length / todayTasks.length) * 100) : 0;

  // 2. Weekly completion stats (past 7 days)
  const past7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now.getTime() - i * 86400000);
    return d.toISOString().split('T')[0];
  });

  const weekTasks = tasks.filter((t) => past7Days.includes(t.dueDate));
  const completedWeek = weekTasks.filter((t) => t.isCompleted);
  const weeklyRate = weekTasks.length > 0 ? Math.round((completedWeek.length / weekTasks.length) * 100) : 0;

  // 3. Completed on time vs late
  const allCompleted = tasks.filter((t) => t.isCompleted);
  let onTimeCount = 0;
  let lateCompletedCount = 0;

  allCompleted.forEach((t) => {
    if (t.completedAt) {
      const deadline = reminderService.getTaskDeadline(t).getTime();
      const completedTime = new Date(t.completedAt).getTime();
      if (completedTime <= deadline) {
        onTimeCount++;
      } else {
        lateCompletedCount++;
      }
    } else {
      onTimeCount++;
    }
  });

  // 4. Overdue incomplete count
  const overdueCount = tasks.filter((t) => {
    if (t.isCompleted) return false;
    const status = reminderService.getTaskStatus(t, now);
    return status === 'overdue' || status === 'due_now';
  }).length;

  // 5. Productivity Streak Calculation
  // Count consecutive days ending today (or yesterday) that have at least 1 completed task
  const completedDates = new Set(
    allCompleted
      .map((t) => {
        if (t.completedAt) return t.completedAt.split('T')[0];
        return t.dueDate;
      })
      .filter(Boolean)
  );

  let streak = 0;
  let checkDate = new Date();
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (completedDates.has(dateStr)) {
      streak++;
      checkDate = new Date(checkDate.getTime() - 86400000);
    } else {
      // Check if streak broke today but was active yesterday
      if (streak === 0) {
        const yesterday = new Date(checkDate.getTime() - 86400000).toISOString().split('T')[0];
        if (completedDates.has(yesterday)) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 2 * 86400000);
          continue;
        }
      }
      break;
    }
  }

  // 6. Day of the week productivity (0=Sun, 1=Mon, ..., 6=Sat)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayCounts = [0, 0, 0, 0, 0, 0, 0];

  allCompleted.forEach((t) => {
    const d = t.completedAt ? new Date(t.completedAt) : reminderService.getTaskDeadline(t);
    const day = d.getDay();
    dayCounts[day]++;
  });

  const maxDayCount = Math.max(1, ...dayCounts);
  const bestDayIndex = dayCounts.indexOf(Math.max(...dayCounts));
  const mostProductiveDay = allCompleted.length > 0 ? dayNames[bestDayIndex] : 'N/A';

  // 7. Category distribution
  const categories: Category[] = ['Work', 'Study', 'Health', 'Personal', 'Finance', 'Urgent'];
  const categoryStats = categories.map((cat) => {
    const catTasks = tasks.filter((t) => t.category === cat);
    const completed = catTasks.filter((t) => t.isCompleted).length;
    return {
      category: cat,
      total: catTasks.length,
      completed,
      pct: catTasks.length > 0 ? Math.round((completed / catTasks.length) * 100) : 0,
    };
  }).filter((c) => c.total > 0);

  // 8. Focus time calculation (estimated duration of completed tasks)
  const completedMinutes = allCompleted.reduce((acc, t) => acc + (t.estimatedDuration || 0), 0);
  const totalPlannedMinutes = tasks.reduce((acc, t) => acc + (t.estimatedDuration || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Productivity & Accountability Insights</h1>
        <p className="text-xs text-neutral-400">
          Real metrics computed strictly from your stored task execution history
        </p>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Daily Completion</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-3xl font-extrabold text-white tabular-nums">{dailyRate}%</span>
            <span className="text-xs text-neutral-400">{completedToday.length}/{todayTasks.length} tasks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Weekly Rate (7d)</span>
            <Calendar className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-3xl font-extrabold text-emerald-400 tabular-nums">{weeklyRate}%</span>
            <span className="text-xs text-neutral-400">{completedWeek.length}/{weekTasks.length} tasks</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Focus Streak</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className="text-3xl font-extrabold text-amber-400 tabular-nums">{streak}</span>
            <span className="text-xs text-neutral-400">{streak === 1 ? 'day' : 'days'} unbroken</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400 text-xs">
            <span>Overdue Unresolved</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 flex items-baseline justify-between font-mono">
            <span className={`text-3xl font-extrabold tabular-nums ${overdueCount > 0 ? 'text-rose-400' : 'text-neutral-400'}`}>
              {overdueCount}
            </span>
            <span className={`text-xs ${overdueCount > 0 ? 'text-rose-400 font-bold' : 'text-neutral-400'}`}>
              {overdueCount > 0 ? 'NEEDS ATTENTION' : 'ZERO DEBT'}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Day of Week Velocity Chart */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white">Completion Velocity by Day</h3>
              <p className="text-xs text-neutral-400">Total completed tasks by weekday</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-neutral-400 font-mono">Peak Day: </span>
              <span className="text-xs font-bold text-indigo-400">{mostProductiveDay}</span>
            </div>
          </div>

          <div className="pt-2">
            <div className="grid grid-cols-7 gap-2 h-44 items-end pb-2">
              {dayNames.map((day, idx) => {
                const count = dayCounts[idx];
                const heightPct = maxDayCount > 0 ? Math.round((count / maxDayCount) * 100) : 0;
                return (
                  <div key={day} className="flex flex-col items-center h-full justify-end gap-2">
                    <span className="text-[11px] font-mono text-neutral-400 tabular-nums">
                      {count > 0 ? count : ''}
                    </span>
                    <div className="w-full bg-neutral-950 rounded-t-lg h-32 flex items-end p-1">
                      <div
                        className="w-full rounded-t-md bg-indigo-600 transition-all duration-500 hover:bg-indigo-500"
                        style={{ height: `${Math.max(6, heightPct)}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-neutral-400">{day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Punctuality: On-Time vs Overdue */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
            <div>
              <h3 className="text-sm font-bold text-white">Deadline Accountability</h3>
              <p className="text-xs text-neutral-400">Completed strictly before deadline vs post-escalation</p>
            </div>
            <Award className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                <span className="text-emerald-400 font-semibold">Completed On-Time</span>
                <span className="text-neutral-200 tabular-nums font-bold">
                  {onTimeCount} ({allCompleted.length > 0 ? Math.round((onTimeCount / allCompleted.length) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${allCompleted.length > 0 ? (onTimeCount / allCompleted.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5 font-mono">
                <span className="text-amber-400 font-semibold">Completed After Escalation</span>
                <span className="text-neutral-200 tabular-nums font-bold">
                  {lateCompletedCount} ({allCompleted.length > 0 ? Math.round((lateCompletedCount / allCompleted.length) * 100) : 0}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800">
                <div
                  className="h-full bg-amber-500 transition-all duration-500"
                  style={{
                    width: `${allCompleted.length > 0 ? (lateCompletedCount / allCompleted.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-300 flex items-center justify-between">
              <span>Total Focus Time Finished:</span>
              <span className="text-indigo-400 font-bold tabular-nums">
                {Math.round(completedMinutes / 60 * 10) / 10}h / {Math.round(totalPlannedMinutes / 60 * 10) / 10}h planned
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <h3 className="text-sm font-bold text-white pb-3 border-b border-neutral-800">
          Completion Rate by Category
        </h3>

        {categoryStats.length === 0 ? (
          <div className="py-8 text-center text-xs text-neutral-500">
            No categorized tasks stored yet.
          </div>
        ) : (
          <div className="space-y-3">
            {categoryStats.map((item) => (
              <div key={item.category} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-200 font-semibold">{item.category}</span>
                  <span className="text-neutral-400 font-mono tabular-nums">
                    {item.completed}/{item.total} ({item.pct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-neutral-950 overflow-hidden border border-neutral-800/80">
                  <div
                    className="h-full bg-indigo-500 transition-all duration-300"
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * TaskLock — Focus Until Done
 * Master Application Container
 */

import React, { useState, useEffect, useRef } from 'react';
import { Task, UserSettings, ViewTab } from './types/task';
import { storageService } from './services/storageService';
import { reminderService, AlertTriggerPayload } from './services/reminderService';
import { soundService } from './services/soundService';

import { Header } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { TasksView } from './components/TasksView';
import { CalendarView } from './components/CalendarView';
import { StatisticsView } from './components/StatisticsView';
import { SettingsView } from './components/SettingsView';
import { TaskModal } from './components/TaskModal';
import { AccountabilityModal } from './components/AccountabilityModal';
import { FocusTimerBar } from './components/FocusTimerBar';
import { AndroidGuideModal } from './components/AndroidGuideModal';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { Mic } from 'lucide-react';

export default function App() {
  const [tasks, setTasks] = useState<Task[]>(() => storageService.getTasks());
  const [settings, setSettings] = useState<UserSettings>(() => storageService.getSettings());
  const [currentTab, setCurrentTab] = useState<ViewTab>('dashboard');

  // Modals & Takeovers
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [defaultCreateDate, setDefaultCreateDate] = useState<string | undefined>(undefined);
  const [isAndroidGuideOpen, setIsAndroidGuideOpen] = useState(false);

  // Active Accountability Alert & Active Focus Session
  const [activeAccountabilityTask, setActiveAccountabilityTask] = useState<Task | null>(null);
  const [activeWorkingTaskId, setActiveWorkingTaskId] = useState<string | null>(null);

  // Audio & Notification State
  const [isMuted, setIsMuted] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    reminderService.getNotificationPermission()
  );

  // Keep ref to latest tasks and settings for scheduler loop
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Persist tasks whenever changed
  const updateTasksState = (newTasks: Task[]) => {
    setTasks(newTasks);
    storageService.saveTasks(newTasks);
  };

  // Synchronize Theme class (dark/light)
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    soundService.setVolume(settings.soundVolume);
  }, [settings.theme, settings.soundVolume]);

  // Start Reminder Scheduler & Alert Listener
  useEffect(() => {
    // Alert callback subscriber
    const unsubscribe = reminderService.subscribe((payload: AlertTriggerPayload) => {
      // If exact due alert or escalation, trigger full-screen modal takeover
      if (payload.type === 'due_alert' || payload.type === 'escalation') {
        if (settingsRef.current.strictMode) {
          setActiveAccountabilityTask(payload.task);
        }
      }
    });

    // Start background scheduler tick loop
    reminderService.startScheduler(
      () => tasksRef.current,
      (updatedTask: Task) => {
        setTasks((prev) => {
          const next = prev.map((t) => (t.id === updatedTask.id ? updatedTask : t));
          storageService.saveTasks(next);
          return next;
        });
      },
      () => settingsRef.current
    );

    return () => {
      unsubscribe();
      reminderService.stopScheduler();
    };
  }, []);

  // Update a single task helper
  const handleUpdateSingleTask = (updatedTask: Task) => {
    const updated = tasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    updateTasksState(updated);
  };

  // Create or Update Task from Modal
  const handleSaveTask = (
    taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'escalationCount'>,
    existingId?: string
  ) => {
    const now = new Date().toISOString();

    if (existingId) {
      // Editing existing task
      const existing = tasks.find((t) => t.id === existingId);
      if (!existing) return;

      const updatedTask: Task = {
        ...existing,
        ...taskData,
        updatedAt: now,
        // Reset notification flags if deadline or preferences were modified
        fiveMinWarningSent: false,
        dueAlertSent: false,
        history: [
          ...existing.history,
          {
            id: 'hist-' + Date.now(),
            timestamp: now,
            action: 'updated',
            note: `Deadline updated to ${taskData.dueDate} ${taskData.dueTime}`,
          },
        ],
      };
      handleUpdateSingleTask(updatedTask);
    } else {
      // Creating new task
      const newTask: Task = {
        id: 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        ...taskData,
        createdAt: now,
        updatedAt: now,
        escalationCount: 0,
        history: [
          {
            id: 'hist-' + Date.now(),
            timestamp: now,
            action: 'created',
            note: `Scheduled for ${taskData.dueDate} at ${taskData.dueTime}`,
          },
        ],
      };
      updateTasksState([newTask, ...tasks]);
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    const next = tasks.filter((t) => t.id !== taskId);
    updateTasksState(next);
    if (activeAccountabilityTask?.id === taskId) {
      setActiveAccountabilityTask(null);
    }
    if (activeWorkingTaskId === taskId) {
      setActiveWorkingTaskId(null);
    }
  };

  // Toggle Complete / Undo
  const handleToggleComplete = (taskId: string) => {
    const now = new Date().toISOString();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const isNowCompleted = !task.isCompleted;
    if (isNowCompleted) {
      soundService.playSuccessChime();
    }

    const updatedTask: Task = {
      ...task,
      isCompleted: isNowCompleted,
      completedAt: isNowCompleted ? now : undefined,
      updatedAt: now,
      history: [
        ...task.history,
        {
          id: 'hist-' + Date.now(),
          timestamp: now,
          action: isNowCompleted ? 'completed' : 'uncompleted',
          note: isNowCompleted ? 'Marked done by user' : 'Reopened task',
        },
      ],
    };

    handleUpdateSingleTask(updatedTask);

    if (activeAccountabilityTask?.id === taskId) {
      setActiveAccountabilityTask(null);
    }
    if (activeWorkingTaskId === taskId) {
      setActiveWorkingTaskId(null);
    }
  };

  // "I'm Working On It" Action
  const handleWorkingOnIt = (taskId: string) => {
    const now = new Date().toISOString();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      lastAcknowledgedAt: now,
      acknowledgementStatus: 'working',
      updatedAt: now,
      history: [
        ...task.history,
        {
          id: 'hist-' + Date.now(),
          timestamp: now,
          action: 'acknowledged_working',
          note: 'User acknowledged active focus session.',
        },
      ],
    };

    handleUpdateSingleTask(updatedTask);
    setActiveAccountabilityTask(null); // Close full screen alert
    setActiveWorkingTaskId(taskId); // Dock bottom focus bar
  };

  // Snooze Action
  const handleSnooze = (taskId: string, minutes: number) => {
    const now = new Date();
    const snoozeTarget = new Date(now.getTime() + minutes * 60000);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      snoozeUntil: snoozeTarget.toISOString(),
      acknowledgementStatus: 'snoozed',
      updatedAt: now.toISOString(),
      history: [
        ...task.history,
        {
          id: 'hist-' + Date.now(),
          timestamp: now.toISOString(),
          action: 'snoozed',
          note: `Snoozed for ${minutes} minutes until ${snoozeTarget.toLocaleTimeString()}.`,
        },
      ],
    };

    handleUpdateSingleTask(updatedTask);
    setActiveAccountabilityTask(null);
  };

  // Reschedule Action
  const handleReschedule = (taskId: string, newDate: string, newTime: string) => {
    const now = new Date().toISOString();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const updatedTask: Task = {
      ...task,
      dueDate: newDate,
      dueTime: newTime,
      fiveMinWarningSent: false,
      dueAlertSent: false,
      updatedAt: now,
      history: [
        ...task.history,
        {
          id: 'hist-' + Date.now(),
          timestamp: now,
          action: 'rescheduled',
          note: `Rescheduled to ${newDate} at ${newTime}.`,
        },
      ],
    };

    handleUpdateSingleTask(updatedTask);
  };

  // Test Due Alert: Creates an immediate task due right now to showcase accountability alert
  const handleTriggerTestDueAlert = () => {
    const now = new Date();
    const ymd = now.toISOString().split('T')[0];
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const testTask: Task = {
      id: 'test-due-' + Date.now(),
      title: 'Practice Accountability: Data Architecture Review',
      description: 'Scheduled deadline reached. Test the four action responses: Done, Working On It, Snooze, or View Task.',
      dueDate: ymd,
      dueTime: timeStr,
      priority: 'critical',
      category: 'Work',
      estimatedDuration: 20,
      reminderPreference: 'both',
      repeatSchedule: 'none',
      notes: 'Testing strict escalation and modal takeover.',
      isCompleted: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      escalationCount: 1,
      dueAlertSent: true,
      lastNotifiedAt: now.toISOString(),
      history: [
        {
          id: 'hist-test',
          timestamp: now.toISOString(),
          action: 'reminder_fired',
          note: 'Immediate test deadline triggered.',
        },
      ],
    };

    updateTasksState([testTask, ...tasks]);
    soundService.playUrgentAlert();
    setActiveAccountabilityTask(testTask);
  };

  // Request Browser Notification Permission
  const handleRequestNotificationPermission = async () => {
    const result = await reminderService.requestNotificationPermission();
    setNotificationPermission(result);
    if (result === 'granted') {
      reminderService.showSystemNotification('TaskLock Notifications Enabled', {
        body: 'You will receive timely reminders before deadlines and when tasks become due.',
      });
    }
  };

  // Audio Mute Toggle
  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    soundService.setMuted(next);
  };

  // Settings Handlers
  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  const handleExportData = () => {
    const jsonStr = storageService.exportData();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tasklock-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (jsonStr: string) => {
    const res = storageService.importData(jsonStr);
    if (res.success) {
      setTasks(storageService.getTasks());
      setSettings(storageService.getSettings());
    } else {
      throw new Error(res.error || 'Failed to import tasks');
    }
  };

  const handleResetSeedData = () => {
    const fresh = storageService.resetToSeed();
    setTasks(fresh);
    setActiveAccountabilityTask(null);
    setActiveWorkingTaskId(null);
  };

  const handleClearAllTasks = () => {
    storageService.clearAllTasks();
    setTasks([]);
    setActiveAccountabilityTask(null);
    setActiveWorkingTaskId(null);
  };

  // Active working task object
  const activeWorkingTask = activeWorkingTaskId
    ? tasks.find((t) => t.id === activeWorkingTaskId) || null
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col selection:bg-indigo-500/30">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        onOpenCreateTask={() => {
          setEditingTask(null);
          setDefaultCreateDate(undefined);
          setIsTaskModalOpen(true);
        }}
        onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
        onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-20 md:pb-12">
        {currentTab === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            settings={settings}
            onOpenCreateTask={(date) => {
              setEditingTask(null);
              setDefaultCreateDate(date);
              setIsTaskModalOpen(true);
            }}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onWorkingOnIt={handleWorkingOnIt}
            onSnooze={handleSnooze}
            onTriggerTestDueAlert={handleTriggerTestDueAlert}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            notificationPermission={notificationPermission}
          />
        )}

        {currentTab === 'tasks' && (
          <TasksView
            tasks={tasks}
            onOpenCreateTask={() => {
              setEditingTask(null);
              setDefaultCreateDate(undefined);
              setIsTaskModalOpen(true);
            }}
            onOpenVoiceAssistant={() => setIsVoiceModalOpen(true)}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onWorkingOnIt={handleWorkingOnIt}
            onReschedule={handleReschedule}
          />
        )}

        {currentTab === 'calendar' && (
          <CalendarView
            tasks={tasks}
            onOpenCreateTask={(date) => {
              setEditingTask(null);
              setDefaultCreateDate(date);
              setIsTaskModalOpen(true);
            }}
            onEditTask={(task) => {
              setEditingTask(task);
              setIsTaskModalOpen(true);
            }}
            onToggleComplete={handleToggleComplete}
          />
        )}

        {currentTab === 'statistics' && <StatisticsView tasks={tasks} />}

        {currentTab === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onExportData={handleExportData}
            onImportData={handleImportData}
            onResetSeedData={handleResetSeedData}
            onClearAllTasks={handleClearAllTasks}
            onRequestNotificationPermission={handleRequestNotificationPermission}
            notificationPermission={notificationPermission}
            onOpenAndroidGuide={() => setIsAndroidGuideOpen(true)}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav currentTab={currentTab} onTabChange={(tab) => setCurrentTab(tab)} />

      {/* Floating Quick Voice Lock FAB on Mobile (accessible anywhere with one thumb tap) */}
      <button
        onClick={() => setIsVoiceModalOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-30 w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-950/90 border border-indigo-400/40 flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
        title="Voice Lock (Telugu / Hindi / English)"
        aria-label="Voice Lock Assistant"
      >
        <Mic className="w-5 h-5 animate-pulse" />
      </button>

      {/* Floating Focus Timer Bar when user acknowledged "I'm Working On It" */}
      {activeWorkingTask && !activeWorkingTask.isCompleted && (
        <FocusTimerBar
          task={activeWorkingTask}
          onComplete={handleToggleComplete}
          onStopWorking={() => setActiveWorkingTaskId(null)}
          onViewTask={(task) => {
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
        />
      )}

      {/* Full-Screen Accountability Alert Modal */}
      {activeAccountabilityTask && (
        <AccountabilityModal
          task={activeAccountabilityTask}
          settings={settings}
          onMarkDone={handleToggleComplete}
          onWorkingOnIt={handleWorkingOnIt}
          onSnooze={handleSnooze}
          onViewTask={(task) => {
            setActiveAccountabilityTask(null);
            setEditingTask(task);
            setIsTaskModalOpen(true);
          }}
          onDismissAlert={() => setActiveAccountabilityTask(null)}
        />
      )}

      {/* Create / Edit Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        initialTask={editingTask}
        defaultDate={defaultCreateDate}
      />

      {/* Android Architecture & Companion Guide Modal */}
      <AndroidGuideModal
        isOpen={isAndroidGuideOpen}
        onClose={() => setIsAndroidGuideOpen(false)}
      />

      {/* Voice Assistant Modal (Telugu, Hindi, English) */}
      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onTaskCreated={(taskData) => {
          handleSaveTask(taskData);
        }}
      />
    </div>
  );
}

import { Task, UserSettings } from '../types/task';

const TASKS_STORAGE_KEY = 'tasklock_tasks_v1';
const SETTINGS_STORAGE_KEY = 'tasklock_settings_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'dark',
  defaultReminderPreference: 'both',
  defaultSnoozeMinutes: 5,
  escalationIntervalMinutes: 3,
  strictMode: true,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00',
  soundEnabled: true,
  soundVolume: 0.8,
  soundType: 'urgent_chime',
  vibrateEnabled: true,
};

// Generate realistic starter tasks with today's date dynamically
export function generateSeedTasks(): Task[] {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().split('T')[0];

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  
  // Task 1: Due in 5 minutes (ideal for instant live testing!)
  const in5M = new Date(today.getTime() + 5 * 60 * 1000);
  const timeIn5M = `${String(in5M.getHours()).padStart(2, '0')}:${String(in5M.getMinutes()).padStart(2, '0')}`;

  // Task 2: Due in 45 minutes
  const in45M = new Date(today.getTime() + 45 * 60 * 1000);
  const timeIn45M = `${String(in45M.getHours()).padStart(2, '0')}:${String(in45M.getMinutes()).padStart(2, '0')}`;

  // Task 3: Overdue by 30 minutes (shows overdue accountability immediately!)
  const past30M = new Date(today.getTime() - 30 * 60 * 1000);
  const timePast30M = `${String(past30M.getHours()).padStart(2, '0')}:${String(past30M.getMinutes()).padStart(2, '0')}`;

  // Task 4: Completed task from 2 hours ago
  const past2H = new Date(today.getTime() - 120 * 60 * 1000);
  const timePast2H = `${String(past2H.getHours()).padStart(2, '0')}:${String(past2H.getMinutes()).padStart(2, '0')}`;

  // Task 5: Tomorrow morning high priority
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  return [
    {
      id: 'task-seed-1',
      title: 'Review System Architecture & Escalation Rules',
      description: 'Verify Android notification intent flags and exact alarm permissions for Mode A compliance.',
      dueDate: formatYMD(today),
      dueTime: timeIn5M,
      priority: 'critical',
      category: 'Work',
      estimatedDuration: 25,
      reminderPreference: 'both',
      repeatSchedule: 'none',
      notes: 'Check AlarmManager.canScheduleExactAlarms() before setting alarms.',
      isCompleted: false,
      createdAt: new Date(today.getTime() - 3600000).toISOString(),
      updatedAt: new Date(today.getTime() - 3600000).toISOString(),
      escalationCount: 0,
      history: [
        {
          id: 'hist-1',
          timestamp: new Date(today.getTime() - 3600000).toISOString(),
          action: 'created',
          note: 'Task scheduled with 5-minute pre-alert and exact due reminder.',
        },
      ],
    },
    {
      id: 'task-seed-2',
      title: 'Client Sprint Retrospective & Deliverables',
      description: 'Prepare milestone progress deck and summarize bug triage metrics for Q4 engineering review.',
      dueDate: formatYMD(today),
      dueTime: timePast30M,
      priority: 'high',
      category: 'Work',
      estimatedDuration: 45,
      reminderPreference: 'both',
      repeatSchedule: 'none',
      notes: 'Include latency graphs and memory benchmark graphs.',
      isCompleted: false,
      createdAt: new Date(today.getTime() - 7200000).toISOString(),
      updatedAt: new Date(today.getTime() - 7200000).toISOString(),
      acknowledgementStatus: 'unacknowledged',
      escalationCount: 2,
      history: [
        {
          id: 'hist-2a',
          timestamp: new Date(today.getTime() - 7200000).toISOString(),
          action: 'created',
        },
        {
          id: 'hist-2b',
          timestamp: new Date(past30M.getTime() - 5 * 60000).toISOString(),
          action: 'reminder_fired',
          note: '5-minute advance notification dispatched.',
        },
        {
          id: 'hist-2c',
          timestamp: past30M.toISOString(),
          action: 'reminder_fired',
          note: 'Exact deadline reached. Escalation queued.',
        },
      ],
    },
    {
      id: 'task-seed-3',
      title: 'Deep Focus: Kotlin Room Database Migration',
      description: 'Write Room DAO unit tests and database migration schema v1 to v2.',
      dueDate: formatYMD(today),
      dueTime: timeIn45M,
      priority: 'medium',
      category: 'Study',
      estimatedDuration: 60,
      reminderPreference: 'five_min',
      repeatSchedule: 'none',
      notes: 'Ensure foreign keys and indexes on task_id are indexed properly.',
      isCompleted: false,
      createdAt: new Date(today.getTime() - 1800000).toISOString(),
      updatedAt: new Date(today.getTime() - 1800000).toISOString(),
      escalationCount: 0,
      history: [
        {
          id: 'hist-3',
          timestamp: new Date(today.getTime() - 1800000).toISOString(),
          action: 'created',
        },
      ],
    },
    {
      id: 'task-seed-4',
      title: 'Morning Standup & TaskLock Requirements Review',
      description: 'Discuss full-screen intent limitations on Android 14+ and user notification channels.',
      dueDate: formatYMD(today),
      dueTime: timePast2H,
      priority: 'medium',
      category: 'Work',
      estimatedDuration: 30,
      reminderPreference: 'exact',
      repeatSchedule: 'weekdays',
      notes: 'All participants agreed on explicit permission flow.',
      isCompleted: true,
      completedAt: new Date(past2H.getTime() + 20 * 60000).toISOString(),
      createdAt: new Date(today.getTime() - 14400000).toISOString(),
      updatedAt: new Date(past2H.getTime() + 20 * 60000).toISOString(),
      escalationCount: 0,
      history: [
        {
          id: 'hist-4a',
          timestamp: new Date(today.getTime() - 14400000).toISOString(),
          action: 'created',
        },
        {
          id: 'hist-4b',
          timestamp: new Date(past2H.getTime() + 20 * 60000).toISOString(),
          action: 'completed',
          note: 'Marked done on time.',
        },
      ],
    },
    {
      id: 'task-seed-5',
      title: 'Cardio & Strength Training Session',
      description: '45-minute interval run and core mobility work.',
      dueDate: formatYMD(tomorrow),
      dueTime: '07:30',
      priority: 'low',
      category: 'Health',
      estimatedDuration: 45,
      reminderPreference: 'five_min',
      repeatSchedule: 'daily',
      notes: 'Hydrate well before starting.',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      escalationCount: 0,
      history: [
        {
          id: 'hist-5',
          timestamp: new Date().toISOString(),
          action: 'created',
        },
      ],
    },
  ];
}

class StorageService {
  public getTasks(): Task[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(TASKS_STORAGE_KEY);
      if (!data) {
        this.saveTasks([]);
        return [];
      }
      const parsed = JSON.parse(data) as Task[];
      // If only containing the old initial seed tasks, purge them to satisfy user request
      if (Array.isArray(parsed) && parsed.some(t => t.id.startsWith('task-seed-'))) {
        const userCreated = parsed.filter(t => !t.id.startsWith('task-seed-'));
        this.saveTasks(userCreated);
        return userCreated;
      }
      return parsed;
    } catch {
      return [];
    }
  }

  public saveTasks(tasks: Task[]): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks to localStorage:', e);
    }
  }

  public getSettings(): UserSettings {
    if (typeof window === 'undefined') return DEFAULT_SETTINGS;
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!data) {
        this.saveSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      }
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  public saveSettings(settings: UserSettings): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }

  public resetToSeed(): Task[] {
    const fresh = generateSeedTasks();
    this.saveTasks(fresh);
    return fresh;
  }

  public clearAllTasks(): void {
    this.saveTasks([]);
  }

  public exportData(): string {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tasks: this.getTasks(),
      settings: this.getSettings(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importData(jsonString: string): { success: boolean; count: number; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed.tasks)) {
        this.saveTasks(parsed.tasks);
        if (parsed.settings) {
          this.saveSettings({ ...DEFAULT_SETTINGS, ...parsed.settings });
        }
        return { success: true, count: parsed.tasks.length };
      }
      return { success: false, count: 0, error: 'Invalid file format: missing tasks array' };
    } catch (err: unknown) {
      return { success: false, count: 0, error: err instanceof Error ? err.message : 'JSON parse error' };
    }
  }
}

export const storageService = new StorageService();

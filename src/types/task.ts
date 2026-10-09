export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type Category = 'Work' | 'Study' | 'Health' | 'Personal' | 'Finance' | 'Urgent';

export type ReminderPreference = 'five_min' | 'exact' | 'both' | 'custom';

export type RepeatSchedule = 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly';

export type TaskStatus = 'upcoming' | 'due_soon' | 'due_now' | 'overdue' | 'completed';

export type AcknowledgementStatus = 'unacknowledged' | 'working' | 'snoozed';

export interface TaskHistoryItem {
  id: string;
  timestamp: string; // ISO
  action:
    | 'created'
    | 'updated'
    | 'rescheduled'
    | 'reminder_fired'
    | 'acknowledged_working'
    | 'snoozed'
    | 'completed'
    | 'uncompleted'
    | 'escalation_fired';
  note?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM (24-hour format)
  priority: Priority;
  category: Category;
  estimatedDuration: number; // in minutes
  reminderPreference: ReminderPreference;
  customReminderMinutes?: number; // e.g. 15, 30, 60
  repeatSchedule: RepeatSchedule;
  notes: string;
  isCompleted: boolean;
  completedAt?: string; // ISO
  createdAt: string; // ISO
  updatedAt: string; // ISO
  
  // Notification and Escalation State
  lastNotifiedAt?: string; // ISO
  lastAcknowledgedAt?: string; // ISO
  acknowledgementStatus?: AcknowledgementStatus;
  snoozeUntil?: string; // ISO timestamp
  escalationCount: number;
  history: TaskHistoryItem[];
  
  // Tracking flags to prevent duplicate notifications
  fiveMinWarningSent?: boolean;
  dueAlertSent?: boolean;
}

export interface UserSettings {
  theme: 'dark' | 'light';
  defaultReminderPreference: ReminderPreference;
  defaultSnoozeMinutes: number; // 5, 10, 15, 30
  escalationIntervalMinutes: number; // 2, 5, 10
  strictMode: boolean; // Mode A
  quietHoursEnabled: boolean;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  soundEnabled: boolean;
  soundVolume: number; // 0.0 to 1.0
  soundType: 'urgent_chime' | 'pulse_alarm' | 'subtle_bell';
  vibrateEnabled: boolean;
}

export type ViewTab = 'dashboard' | 'tasks' | 'calendar' | 'statistics' | 'settings';

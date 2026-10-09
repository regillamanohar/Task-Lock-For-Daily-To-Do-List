import { Task, UserSettings, TaskStatus } from '../types/task';
import { soundService } from './soundService';

export interface AlertTriggerPayload {
  task: Task;
  type: 'five_min_warning' | 'due_alert' | 'escalation';
  overdueMinutes: number;
}

export type AlertCallback = (payload: AlertTriggerPayload) => void;

class ReminderService {
  private alertListeners: Set<AlertCallback> = new Set();
  private timerId: number | null = null;
  private isRunning: boolean = false;

  public subscribe(cb: AlertCallback): () => void {
    this.alertListeners.add(cb);
    return () => {
      this.alertListeners.delete(cb);
    };
  }

  private notifySubscribers(payload: AlertTriggerPayload) {
    this.alertListeners.forEach((cb) => {
      try {
        cb(payload);
      } catch (err) {
        console.error('Error invoking alert listener:', err);
      }
    });
  }

  /**
   * Parse task dueDate ("YYYY-MM-DD") and dueTime ("HH:MM") into an absolute local Date
   */
  public getTaskDeadline(task: Task): Date {
    const [year, month, day] = task.dueDate.split('-').map(Number);
    const [hours, minutes] = task.dueTime.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes, 0, 0);
  }

  /**
   * Determine task status relative to current timestamp
   */
  public getTaskStatus(task: Task, now: Date = new Date()): TaskStatus {
    if (task.isCompleted) {
      return 'completed';
    }

    const deadline = this.getTaskDeadline(task);
    const diffMs = deadline.getTime() - now.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // If due in the next 60 seconds or overdue by up to 2 minutes
    if (diffMinutes <= 1 && diffMinutes >= -2) {
      return 'due_now';
    }

    // Overdue if more than 2 minutes past deadline
    if (diffMinutes < -2) {
      return 'overdue';
    }

    // Due soon if within 30 minutes
    if (diffMinutes <= 30 && diffMinutes > 1) {
      return 'due_soon';
    }

    return 'upcoming';
  }

  /**
   * Formats how long until due or overdue
   */
  public formatTimeDifference(task: Task, now: Date = new Date()): {
    label: string;
    isOverdue: boolean;
    totalSecondsDiff: number;
  } {
    const deadline = this.getTaskDeadline(task);
    const diffMs = deadline.getTime() - now.getTime();
    const isOverdue = diffMs < 0;
    const absDiffSec = Math.floor(Math.abs(diffMs) / 1000);

    const hours = Math.floor(absDiffSec / 3600);
    const minutes = Math.floor((absDiffSec % 3600) / 60);
    const seconds = absDiffSec % 60;

    let timeStr = '';
    if (hours > 0) {
      timeStr = `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      timeStr = `${minutes}m ${seconds}s`;
    } else {
      timeStr = `${seconds}s`;
    }

    if (task.isCompleted) {
      return {
        label: 'Completed',
        isOverdue: false,
        totalSecondsDiff: 0,
      };
    }

    if (isOverdue) {
      return {
        label: `${timeStr} overdue`,
        isOverdue: true,
        totalSecondsDiff: -absDiffSec,
      };
    } else {
      return {
        label: `due in ${timeStr}`,
        isOverdue: false,
        totalSecondsDiff: absDiffSec,
      };
    }
  }

  /**
   * Check if current time falls within user-configured quiet hours
   */
  public isQuietHours(settings: UserSettings, now: Date = new Date()): boolean {
    if (!settings.quietHoursEnabled) return false;

    const [startH, startM] = settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = settings.quietHoursEnd.split(':').map(Number);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      // e.g. 13:00 to 15:00
      return nowMinutes >= startMinutes && nowMinutes < endMinutes;
    } else {
      // Overnight e.g. 22:00 to 07:00
      return nowMinutes >= startMinutes || nowMinutes < endMinutes;
    }
  }

  /**
   * Request browser notification permission
   */
  public async requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    try {
      return await Notification.requestPermission();
    } catch {
      return 'denied';
    }
  }

  /**
   * Check browser notification permission status
   */
  public getNotificationPermission(): NotificationPermission | 'unsupported' {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return Notification.permission;
  }

  /**
   * Send a system notification if permitted
   */
  public showSystemNotification(title: string, options: NotificationOptions = {}) {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(title, {
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            requireInteraction: true,
            ...options,
          });
        } catch (e) {
          console.warn('System notification display failed:', e);
        }
      }
    }
  }

  /**
   * Start background scheduler tick loop
   */
  public startScheduler(
    getTasks: () => Task[],
    updateTask: (task: Task) => void,
    getSettings: () => UserSettings
  ) {
    if (this.isRunning) return;
    this.isRunning = true;

    // Check every second for sub-second precision
    this.timerId = window.setInterval(() => {
      this.evaluateReminders(getTasks, updateTask, getSettings);
    }, 1000);
  }

  public stopScheduler() {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.isRunning = false;
  }

  /**
   * Evaluate all tasks and fire required alerts
   */
  public evaluateReminders(
    getTasks: () => Task[],
    updateTask: (task: Task) => void,
    getSettings: () => UserSettings
  ) {
    const tasks = getTasks();
    const settings = getSettings();
    const now = new Date();
    const isQuiet = this.isQuietHours(settings, now);

    tasks.forEach((task) => {
      if (task.isCompleted) return;

      // Check if task is currently snoozed
      if (task.snoozeUntil) {
        const snoozeDate = new Date(task.snoozeUntil);
        if (now < snoozeDate) {
          // Still in snooze window
          return;
        }
      }

      const deadline = this.getTaskDeadline(task);
      const diffMs = deadline.getTime() - now.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const overdueMinutes = Math.max(0, Math.floor((now.getTime() - deadline.getTime()) / 60000));

      // 1. Advance warning check (5 minutes or custom advance reminder)
      const shouldCheck5Min =
        task.reminderPreference === 'five_min' ||
        task.reminderPreference === 'both' ||
        task.reminderPreference === 'custom';

      const advanceWarningSeconds =
        task.reminderPreference === 'custom' && task.customReminderMinutes
          ? task.customReminderMinutes * 60
          : 5 * 60;

      // Trigger warning if within window and not yet sent
      if (
        shouldCheck5Min &&
        !task.fiveMinWarningSent &&
        diffSec <= advanceWarningSeconds &&
        diffSec > 0
      ) {
        // Mark warning as sent
        const updatedTask: Task = {
          ...task,
          fiveMinWarningSent: true,
          lastNotifiedAt: now.toISOString(),
          history: [
            ...task.history,
            {
              id: 'hist-' + Date.now(),
              timestamp: now.toISOString(),
              action: 'reminder_fired',
              note: `Advance reminder fired (${Math.round(advanceWarningSeconds / 60)} minutes before deadline).`,
            },
          ],
        };
        updateTask(updatedTask);

        if (!isQuiet && settings.soundEnabled) {
          soundService.playSubtleWarning();
        }

        this.showSystemNotification(`TaskLock: Reminder — ${task.title}`, {
          body: `Due in ${Math.round(diffSec / 60)} minutes (${task.dueTime}). Priority: ${task.priority.toUpperCase()}`,
          tag: `warning-${task.id}`,
        });

        this.notifySubscribers({
          task: updatedTask,
          type: 'five_min_warning',
          overdueMinutes: 0,
        });
      }

      // 2. Exact Due Time alert
      const shouldCheckDue =
        task.reminderPreference === 'exact' ||
        task.reminderPreference === 'both' ||
        task.reminderPreference === 'custom';

      if (shouldCheckDue && !task.dueAlertSent && diffSec <= 0) {
        // Task has just reached due time!
        const updatedTask: Task = {
          ...task,
          dueAlertSent: true,
          lastNotifiedAt: now.toISOString(),
          escalationCount: (task.escalationCount || 0) + 1,
          history: [
            ...task.history,
            {
              id: 'hist-' + Date.now(),
              timestamp: now.toISOString(),
              action: 'reminder_fired',
              note: `Deadline reached. Full accountability alert triggered.`,
            },
          ],
        };
        updateTask(updatedTask);

        if (!isQuiet && settings.soundEnabled) {
          soundService.playUrgentAlert();
        }

        this.showSystemNotification(`TASK DUE NOW: ${task.title}`, {
          body: `Scheduled for ${task.dueTime}. Action required immediately to maintain your streak!`,
          tag: `due-${task.id}`,
        });

        this.notifySubscribers({
          task: updatedTask,
          type: 'due_alert',
          overdueMinutes,
        });
        return;
      }

      // 3. Escalation check: If overdue and unacknowledged/not marked done
      if (diffSec < 0 && task.dueAlertSent) {
        const escalationIntervalMs = (settings.escalationIntervalMinutes || 3) * 60 * 1000;
        const lastNotified = task.lastNotifiedAt ? new Date(task.lastNotifiedAt).getTime() : 0;
        
        // If user hasn't marked done or snoozed, and escalation interval elapsed
        if (now.getTime() - lastNotified >= escalationIntervalMs) {
          const updatedTask: Task = {
            ...task,
            lastNotifiedAt: now.toISOString(),
            escalationCount: (task.escalationCount || 0) + 1,
            history: [
              ...task.history,
              {
                id: 'hist-' + Date.now(),
                timestamp: now.toISOString(),
                action: 'escalation_fired',
                note: `Escalation #${(task.escalationCount || 0) + 1} fired. Overdue by ${overdueMinutes}m.`,
              },
            ],
          };
          updateTask(updatedTask);

          if (!isQuiet && settings.soundEnabled) {
            soundService.playUrgentAlert();
          }

          this.showSystemNotification(`OVERDUE ESCALATION: ${task.title}`, {
            body: `Overdue by ${overdueMinutes} minutes! Please acknowledge or complete.`,
            tag: `escalation-${task.id}`,
          });

          this.notifySubscribers({
            task: updatedTask,
            type: 'escalation',
            overdueMinutes,
          });
        }
      }
    });
  }
}

export const reminderService = new ReminderService();

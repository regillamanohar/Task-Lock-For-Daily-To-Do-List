import React, { useState } from 'react';
import { X, Smartphone, ShieldCheck, Copy, Check, Terminal, ExternalLink, AlertTriangle } from 'lucide-react';

interface AndroidGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidGuideModal: React.FC<AndroidGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedCodeKey, setCopiedCodeKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'architecture' | 'modeA' | 'modeB' | 'kotlin' | 'testing'>('architecture');

  if (!isOpen) return null;

  const copyCode = (key: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeKey(key);
    setTimeout(() => setCopiedCodeKey(null), 2000);
  };

  const manifestSnippet = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.tasklock.focus">

    <!-- Permissions for Exact Alarms and Notification Wakeups -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.USE_EXACT_ALARM" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT" />
    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE" />

    <application
        android:name=".TaskLockApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/Theme.TaskLock">

        <!-- Full-screen Accountability Activity -->
        <activity
            android:name=".ui.AccountabilityAlertActivity"
            android:excludeFromRecents="true"
            android:launchMode="singleInstance"
            android:showOnLockScreen="true"
            android:turnScreenOn="true"
            android:exported="false" />

        <!-- Alarm Receiver waking the device even in Doze Mode -->
        <receiver
            android:name=".receiver.TaskAlarmReceiver"
            android:exported="false">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="com.tasklock.action.TRIGGER_ALARM" />
            </intent-filter>
        </receiver>
    </application>
</manifest>`;

  const alarmManagerSnippet = `package com.tasklock.focus.scheduler

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.tasklock.focus.data.TaskEntity
import com.tasklock.focus.receiver.TaskAlarmReceiver

class TaskLockAlarmScheduler(private val context: Context) {
    private val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager

    fun scheduleExactReminder(task: TaskEntity, triggerEpochMs: Long, isWarning: Boolean) {
        val intent = Intent(context, TaskAlarmReceiver::class.java).apply {
            action = "com.tasklock.action.TRIGGER_ALARM"
            putExtra("TASK_ID", task.id)
            putExtra("IS_WARNING", isWarning)
            putExtra("TASK_TITLE", task.title)
        }

        val requestCode = if (isWarning) (task.id.hashCode() * 31) else task.id.hashCode()
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            requestCode,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        // API 31+ exact alarm permission check
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            if (!alarmManager.canScheduleExactAlarms()) {
                // Must route user to Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM
                return
            }
        }

        // Guaranteed trigger even in deep Doze Mode
        alarmManager.setExactAndAllowWhileIdle(
            AlarmManager.RTC_WAKEUP,
            triggerEpochMs,
            pendingIntent
        )
    }

    fun cancelReminder(taskId: String) {
        val intent = Intent(context, TaskAlarmReceiver::class.java)
        val p1 = PendingIntent.getBroadcast(context, taskId.hashCode(), intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        p1?.let { alarmManager.cancel(it) }
        val p2 = PendingIntent.getBroadcast(context, taskId.hashCode() * 31, intent, PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE)
        p2?.let { alarmManager.cancel(it) }
    }
}`;

  const notificationBuilderSnippet = `package com.tasklock.focus.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import androidx.core.app.NotificationCompat
import com.tasklock.focus.R
import com.tasklock.focus.ui.AccountabilityAlertActivity

object TaskLockNotificationHelper {
    private const val CHANNEL_CRITICAL = "tasklock_critical_alarms"

    fun createNotificationChannels(context: Context) {
        val notificationManager = context.getSystemService(NotificationManager::class.java)
        val channel = NotificationChannel(
            CHANNEL_CRITICAL,
            "Critical Task Accountability Alarms",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "High-priority task alarms that override quiet notifications and trigger full screen"
            enableVibration(true)
            vibrationPattern = longArrayOf(0, 500, 200, 500, 200, 1000)
            lockscreenVisibility = NotificationCompat.VISIBILITY_PUBLIC
        }
        notificationManager.createNotificationChannel(channel)
    }

    fun buildFullScreenAlert(context: Context, taskId: String, title: String): NotificationCompat.Builder {
        val fullScreenIntent = Intent(context, AccountabilityAlertActivity::class.java).apply {
            putExtra("TASK_ID", taskId)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val fullScreenPendingIntent = PendingIntent.getActivity(
            context,
            taskId.hashCode(),
            fullScreenIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(context, CHANNEL_CRITICAL)
            .setSmallIcon(R.drawable.ic_tasklock_shield)
            .setContentTitle("TASK DUE NOW: $title")
            .setContentText("Focus Until Done · Strict acknowledgement required")
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setFullScreenIntent(fullScreenPendingIntent, true)
            .setOngoing(true) // Persistent until user marks done or acknowledges
            .setAutoCancel(false)
    }
}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        className="w-full max-w-3xl max-h-[90vh] rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 flex flex-col text-neutral-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 id="guide-title" className="text-lg font-bold text-white flex items-center gap-2">
                <span>Native Android Architecture & Implementation</span>
                <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Android 14+ Ready
                </span>
              </h2>
              <p className="text-xs text-neutral-400">
                Detailed plan bridging web prototype to native Kotlin, AlarmManager & Device Policy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-1.5 py-3 border-b border-neutral-800/80 shrink-0 overflow-x-auto text-xs">
          {[
            { id: 'architecture', label: 'Platform Boundary' },
            { id: 'modeA', label: 'Mode A: Strict Reminder' },
            { id: 'modeB', label: 'Mode B: Managed Focus' },
            { id: 'kotlin', label: 'Kotlin & Manifest Code' },
            { id: 'testing', label: 'Device Testing & APK' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 text-sm text-neutral-300">
          {activeTab === 'architecture' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Current Web Environment vs. Native Android</span>
                </h4>
                <p className="text-xs leading-relaxed text-neutral-400">
                  This current application runs as a high-precision React TypeScript dashboard in your browser.
                  Browser notifications and Web Audio synthesizers are fully functional while the app is running in an active or background tab.
                </p>
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <strong>Crucial Platform Honesty:</strong> Browsers do not support waking up a sleeping mobile phone from a cold state, cannot execute code when the browser process is killed, and cannot block other phone apps. Genuine phone waking requires Android's native <code className="text-amber-100 font-mono">AlarmManager</code> with <code className="text-amber-100 font-mono">RTC_WAKEUP</code>.
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="font-bold text-indigo-400">Web App Capabilities (Active Now)</span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-400">
                    <li>Persistent task storage with LocalStorage & JSON export</li>
                    <li>Sub-second interval deadline evaluation & countdowns</li>
                    <li>Audio alarms via Web Audio API (no external asset risk)</li>
                    <li>Browser Notification API alerts with permission status</li>
                    <li>Full-Screen Modal accountability overlay with 4 actions</li>
                    <li>Recurring escalation intervals when tasks remain overdue</li>
                  </ul>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2">
                  <span className="font-bold text-emerald-400">Native Android Requirements</span>
                  <ul className="list-disc list-inside space-y-1 text-neutral-400">
                    <li><code className="text-neutral-200 font-mono">SCHEDULE_EXACT_ALARM</code> permission for microsecond punctuality</li>
                    <li><code className="text-neutral-200 font-mono">NotificationCompat.setFullScreenIntent</code> for lockscreen alerts</li>
                    <li>Doze mode exemption (<code className="text-neutral-200 font-mono">REQUEST_IGNORE_BATTERY_OPTIMIZATIONS</code>)</li>
                    <li><code className="text-neutral-200 font-mono">Room</code> database for offline SQL persistence & migrations</li>
                    <li><code className="text-neutral-200 font-mono">WorkManager</code> for maintenance & recurring daily resets</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'modeA' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <h3 className="text-sm font-bold text-white">Mode A: Strict Reminder Specification</h3>
              <p className="text-neutral-400">
                Mode A is designed for standard consumer Android devices where users cannot and should not be forcibly locked out of their devices or emergency features.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
                <h4 className="font-semibold text-neutral-200">Mode A Rules:</h4>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                  <li><strong>Ongoing Notification:</strong> Notification uses <code className="font-mono text-neutral-200">setOngoing(true)</code> and <code className="font-mono text-neutral-200">setAutoCancel(false)</code> so swiping it away does not complete the task.</li>
                  <li><strong>Full-Screen Alert:</strong> Triggers an accountability activity with <code className="font-mono text-neutral-200">showOnLockScreen=true</code> and <code className="font-mono text-neutral-200">turnScreenOn=true</code>. Note that on Android 14+ (API 34), full-screen intents require user approval in Special App Access.</li>
                  <li><strong>Explicit Acknowledgement:</strong> "I'm Working On It" stops the blaring chime and sets status to active focus without marking complete. Only "Mark As Done" clears the task.</li>
                  <li><strong>Escalation Interval:</strong> If unacknowledged, alarms reschedule every 2, 3, or 5 minutes until dealt with.</li>
                  <li><strong>App Relaunch Sync:</strong> Upon reopening the app, all overdue unacknowledged tasks appear at the top in high-visibility alert cards.</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'modeB' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <h3 className="text-sm font-bold text-white">Mode B: Managed Device Focus Specification</h3>
              <p className="text-neutral-400">
                Mode B is the strict enterprise / kiosk lockdown mode. Standard Google Play apps cannot simulate device locking with full-screen overlays because users can always press Home or use the notification shade.
              </p>
              <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
                <h4 className="font-semibold text-neutral-200">Implementation Requirements:</h4>
                <p className="text-neutral-400">
                  To legitimately enforce device focus without malware techniques or blocking 911 calls, TaskLock must be provisioned as a <strong>Device Owner</strong> via Android Enterprise / DevicePolicyManager.
                </p>
                <div className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300">
                  val dpm = context.getSystemService(DevicePolicyManager::class.java)<br />
                  val compName = ComponentName(context, TaskLockDeviceAdminReceiver::class.java)<br />
                  // Locks navigation buttons, status bar, and other apps until task is acknowledged<br />
                  dpm.setLockTaskPackages(compName, arrayOf("com.tasklock.focus"))<br />
                  activity.startLockTask()
                </div>
                <div className="text-[11px] text-neutral-400">
                  <strong>Safety Invariants:</strong> Emergency dialer (<code className="font-mono">Intent.ACTION_DIAL</code> with 911/112) is never blocked. Safe exit PIN can be configured in settings.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'kotlin' && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-neutral-200">AndroidManifest.xml</span>
                  <button
                    onClick={() => copyCode('manifest', manifestSnippet)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedCodeKey === 'manifest' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'manifest' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-48">
                  {manifestSnippet}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-neutral-200">TaskLockAlarmScheduler.kt</span>
                  <button
                    onClick={() => copyCode('alarm', alarmManagerSnippet)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedCodeKey === 'alarm' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'alarm' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-48">
                  {alarmManagerSnippet}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-neutral-200">TaskLockNotificationHelper.kt</span>
                  <button
                    onClick={() => copyCode('notif', notificationBuilderSnippet)}
                    className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    {copiedCodeKey === 'notif' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCodeKey === 'notif' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto max-h-48">
                  {notificationBuilderSnippet}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-3 text-xs leading-relaxed">
              <h3 className="text-sm font-bold text-white">Testing Reminders on a Real Android Device</h3>
              <p className="text-neutral-400">
                To test exact alarms on physical Android devices (Pixel, Samsung, Xiaomi) without OEM background killer interference:
              </p>
              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-semibold text-indigo-300">1. Exact Alarm Permission (Android 12+)</span>
                  <p className="text-neutral-400">
                    Open device Settings &gt; Apps &gt; Special app access &gt; Alarms & reminders &gt; Toggle TaskLock to <strong>Allowed</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-semibold text-indigo-300">2. Battery Optimization Whitelist</span>
                  <p className="text-neutral-400">
                    Open Settings &gt; Battery &gt; Background usage limits / App battery usage &gt; Select <strong>Unrestricted</strong>.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-semibold text-indigo-300">3. Full-Screen Intent Access (Android 14+)</span>
                  <p className="text-neutral-400">
                    Open Settings &gt; Apps &gt; Special app access &gt; Turn screen on &gt; Enable for TaskLock.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 space-y-1">
                  <span className="font-semibold text-indigo-300">4. ADB Commands for Alarm Diagnostics</span>
                  <div className="p-2 rounded bg-neutral-900 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto">
                    adb shell dumpsys alarm | grep com.tasklock.focus<br />
                    adb shell cmd appops set com.tasklock.focus SCHEDULE_EXACT_ALARM allow<br />
                    adb shell dumpsys deviceidle force-idle
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-800 flex items-center justify-between text-xs shrink-0">
          <span className="text-neutral-400">TaskLock Android Specification v1.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { UserSettings, ReminderPreference } from '../types/task';
import { soundService } from '../services/soundService';
import {
  Bell,
  Volume2,
  Moon,
  Clock,
  Shield,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Eye,
} from 'lucide-react';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onExportData: () => void;
  onImportData: (jsonStr: string) => void;
  onResetSeedData: () => void;
  onClearAllTasks: () => void;
  onRequestNotificationPermission: () => void;
  notificationPermission: NotificationPermission | 'unsupported';
  onOpenAndroidGuide: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onExportData,
  onImportData,
  onResetSeedData,
  onClearAllTasks,
  onRequestNotificationPermission,
  notificationPermission,
  onOpenAndroidGuide,
}) => {
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSoundTest = () => {
    soundService.testSound(settings.soundType);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        onImportData(content);
        setImportSuccess('Data imported successfully!');
        setImportError(null);
        setTimeout(() => setImportSuccess(null), 3000);
      } catch (err: unknown) {
        setImportError(err instanceof Error ? err.message : 'Invalid JSON file');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 pb-12 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">System Settings & Rules</h1>
        <p className="text-xs text-neutral-400">
          Configure strict escalation rules, audio tones, quiet hours, and data backup
        </p>
      </div>

      {/* Notification Permissions Section */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <Bell className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Browser Notifications Status</h3>
              <p className="text-xs text-neutral-400">
                Delivery of desktop and background alerts
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-semibold uppercase font-mono ${
                notificationPermission === 'granted'
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : notificationPermission === 'denied'
                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {notificationPermission}
            </span>
          </div>
        </div>

        <p className="text-xs text-neutral-400 leading-relaxed">
          Browser notifications operate on a best-effort basis while this browser tab is open or running in the background. 
          When permitted, alerts will display standard system notifications with full task details and priority tags.
        </p>

        {notificationPermission !== 'granted' && (
          <button
            onClick={onRequestNotificationPermission}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span>Request Notification Permission</span>
          </button>
        )}
      </div>

      {/* Reminder & Accountability Escalation Settings */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Strict Accountability Escalation (Mode A)</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Configure default timings and escalation repeat intervals
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Default Reminder Preference */}
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Default Reminder Schedule
            </label>
            <select
              value={settings.defaultReminderPreference}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultReminderPreference: e.target.value as ReminderPreference,
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 outline-none"
            >
              <option value="both">5m Before + Exact Due Time</option>
              <option value="exact">Exact Due Time Only</option>
              <option value="five_min">5 Minutes Advance Only</option>
              <option value="custom">Custom Advance Time</option>
            </select>
          </div>

          {/* Default Snooze Duration */}
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Default Snooze Duration
            </label>
            <select
              value={settings.defaultSnoozeMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  defaultSnoozeMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 outline-none"
            >
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          {/* Escalation Interval */}
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Escalation Repeat Interval (When Overdue & Unacknowledged)
            </label>
            <select
              value={settings.escalationIntervalMinutes}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  escalationIntervalMinutes: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 outline-none"
            >
              <option value={2}>Repeat every 2 minutes (Aggressive)</option>
              <option value={3}>Repeat every 3 minutes (Standard)</option>
              <option value={5}>Repeat every 5 minutes (Moderate)</option>
              <option value={10}>Repeat every 10 minutes (Gentle)</option>
            </select>
            <span className="text-[11px] text-neutral-500 mt-1 block">
              Alarms will continue re-firing at this cadence until you explicitly mark the task done or acknowledge focus.
            </span>
          </div>

          {/* Strict Mode Toggle */}
          <div className="flex flex-col justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-semibold text-white block">Strict Reminder Mode</span>
                <span className="text-[11px] text-neutral-400">
                  Full-screen modal takeover on deadline arrival
                </span>
              </div>
              <input
                type="checkbox"
                checked={settings.strictMode}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, strictMode: e.target.checked })
                }
                className="w-4 h-4 accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sound & Audio Preferences */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-400" />
              <span>Alarm Sound & Synthesizer</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Web Audio API synthesized multi-tone alarms (zero external audio dependency)
            </p>
          </div>
          <button
            onClick={handleSoundTest}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Test Sound</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-neutral-300 mb-1.5">
              Alarm Sound Profile
            </label>
            <select
              value={settings.soundType}
              onChange={(e) => {
                const type = e.target.value as typeof settings.soundType;
                onUpdateSettings({ ...settings, soundType: type });
              }}
              className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 outline-none"
            >
              <option value="urgent_chime">Urgent Repeating Pulse (High Intensity)</option>
              <option value="pulse_alarm">Rapid Staccato Siren</option>
              <option value="subtle_bell">Subtle Chime (Low Intensity)</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-neutral-300">Volume Level</label>
              <span className="font-mono text-indigo-400 font-bold">{Math.round(settings.soundVolume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.soundVolume}
              onChange={(e) => {
                const vol = Number(e.target.value);
                soundService.setVolume(vol);
                onUpdateSettings({ ...settings, soundVolume: vol });
              }}
              className="w-full accent-indigo-500 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Quiet Hours</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Mutes audible chime during sleep or quiet periods while still logging overdue state
            </p>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.quietHoursEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  quietHoursEnabled: e.target.checked,
                })
              }
              className="w-4 h-4 accent-indigo-600"
            />
          </label>
        </div>

        {settings.quietHoursEnabled && (
          <div className="grid grid-cols-2 gap-4 text-xs pt-1">
            <div>
              <label className="block text-neutral-400 mb-1">Start Time (24h)</label>
              <input
                type="time"
                value={settings.quietHoursStart}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, quietHoursStart: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-neutral-400 mb-1">End Time (24h)</label>
              <input
                type="time"
                value={settings.quietHoursEnd}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, quietHoursEnd: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* Theme Selection */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-indigo-400" />
          <span>Interface Appearance</span>
        </h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <button
            onClick={() => onUpdateSettings({ ...settings, theme: 'dark' })}
            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              settings.theme === 'dark'
                ? 'bg-neutral-950 border-indigo-500 ring-1 ring-indigo-500 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className="font-bold block">Dark-First Charcoal (Default)</span>
            <span className="text-[11px] text-neutral-400">Deep neutral palette optimized for long focus sessions</span>
          </button>

          <button
            onClick={() => onUpdateSettings({ ...settings, theme: 'light' })}
            className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
              settings.theme === 'light'
                ? 'bg-neutral-950 border-indigo-500 ring-1 ring-indigo-500 text-white'
                : 'bg-neutral-950 border-neutral-800 text-neutral-400'
            }`}
          >
            <span className="font-bold block">Light Theme</span>
            <span className="text-[11px] text-neutral-400">High-contrast daytime clarity</span>
          </button>
        </div>
      </div>

      {/* Android Native Plan & Spec Trigger */}
      <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Native Android Companion Specification</h3>
              <p className="text-xs text-indigo-200/80">
                AlarmManager, Room database, Full-Screen Intents, and Device Owner Kiosk Mode
              </p>
            </div>
          </div>
          <button
            onClick={onOpenAndroidGuide}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
          >
            Open Specs
          </button>
        </div>
      </div>

      {/* Data Management & Backup */}
      <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="pb-3 border-b border-neutral-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-indigo-400" />
            <span>Data Storage & Portability</span>
          </h3>
          <p className="text-xs text-neutral-400">
            Export full JSON backup, restore from file, or reset sample data
          </p>
        </div>

        {importError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
            {importError}
          </div>
        )}
        {importSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs">
            {importSuccess}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Export JSON */}
          <button
            onClick={onExportData}
            className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Data (JSON)</span>
          </button>

          {/* Import JSON */}
          <label className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 flex items-center gap-1.5 transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Data (JSON)</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Reset Seed Tasks */}
          <button
            onClick={() => {
              if (confirmReset) {
                onResetSeedData();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
              }
            }}
            className={`px-4 py-2 rounded-xl text-neutral-300 border flex items-center gap-1.5 transition-colors cursor-pointer ${
              confirmReset
                ? 'bg-amber-600 text-white border-amber-500 animate-pulse'
                : 'bg-neutral-800 hover:bg-neutral-700 border-neutral-700'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{confirmReset ? 'Tap to Confirm Load' : 'Load Sample Data'}</span>
          </button>

          {/* Clear All Tasks */}
          <button
            onClick={() => {
              if (confirmClear) {
                onClearAllTasks();
                setConfirmClear(false);
              } else {
                setConfirmClear(true);
              }
            }}
            className={`px-4 py-2 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ml-auto ${
              confirmClear
                ? 'bg-rose-600 text-white border-rose-500 animate-pulse'
                : 'bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{confirmClear ? 'Tap to Confirm Delete All' : 'Clear All Data'}</span>
          </button>
        </div>
      </div>

      {/* Privacy Information */}
      <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-500 space-y-1">
        <span className="font-semibold text-neutral-400">Privacy & Data Storage Guarantee:</span>
        <p>
          All tasks, schedules, and accountability audit trails are stored 100% locally on your device in your browser's persistent storage. 
          No telemetry, third-party trackers, or cloud sync scripts are loaded. You have complete ownership of your task history.
        </p>
      </div>
    </div>
  );
};

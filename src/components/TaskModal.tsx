import React, { useState } from 'react';
import { Task, Priority, Category, ReminderPreference, RepeatSchedule } from '../types/task';
import { X, Calendar, Clock, AlertCircle, Trash2, CheckCircle } from 'lucide-react';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'escalationCount'>, existingId?: string) => void;
  onDelete?: (taskId: string) => void;
  initialTask?: Task | null;
  defaultDate?: string;
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialTask,
  defaultDate,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const in30Min = new Date(now.getTime() + 30 * 60000);
  const defaultTimeStr = `${String(in30Min.getHours()).padStart(2, '0')}:${String(in30Min.getMinutes()).padStart(2, '0')}`;

  const [title, setTitle] = useState(initialTask?.title || '');
  const [description, setDescription] = useState(initialTask?.description || '');
  const [dueDate, setDueDate] = useState(initialTask?.dueDate || defaultDate || todayStr);
  const [dueTime, setDueTime] = useState(initialTask?.dueTime || defaultTimeStr);
  const [priority, setPriority] = useState<Priority>(initialTask?.priority || 'medium');
  const [category, setCategory] = useState<Category>(initialTask?.category || 'Work');
  const [estimatedDuration, setEstimatedDuration] = useState<number>(initialTask?.estimatedDuration || 30);
  const [reminderPreference, setReminderPreference] = useState<ReminderPreference>(
    initialTask?.reminderPreference || 'both'
  );
  const [customReminderMinutes, setCustomReminderMinutes] = useState<number>(
    initialTask?.customReminderMinutes || 15
  );
  const [repeatSchedule, setRepeatSchedule] = useState<RepeatSchedule>(
    initialTask?.repeatSchedule || 'none'
  );
  const [notes, setNotes] = useState(initialTask?.notes || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Please enter a task title');
      return;
    }
    if (!dueDate) {
      setValidationError('Please select a due date');
      return;
    }
    if (!dueTime) {
      setValidationError('Please enter a due time');
      return;
    }

    setValidationError(null);
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        dueDate,
        dueTime,
        priority,
        category,
        estimatedDuration: Number(estimatedDuration) || 30,
        reminderPreference,
        customReminderMinutes: reminderPreference === 'custom' ? Number(customReminderMinutes) || 15 : undefined,
        repeatSchedule,
        notes: notes.trim(),
        isCompleted: initialTask?.isCompleted || false,
        completedAt: initialTask?.completedAt,
        lastNotifiedAt: initialTask?.lastNotifiedAt,
        lastAcknowledgedAt: initialTask?.lastAcknowledgedAt,
        acknowledgementStatus: initialTask?.acknowledgementStatus,
        snoozeUntil: initialTask?.snoozeUntil,
        fiveMinWarningSent: false,
        dueAlertSent: false,
      },
      initialTask?.id
    );
    onClose();
  };

  const categories: Category[] = ['Work', 'Study', 'Health', 'Personal', 'Finance', 'Urgent'];
  const priorities: { value: Priority; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'critical', label: 'Critical' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="w-full max-w-xl max-h-[90vh] rounded-2xl bg-neutral-900 border border-neutral-800 shadow-2xl p-6 flex flex-col text-neutral-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-800 shrink-0">
          <div>
            <h2 id="modal-title" className="text-lg font-bold text-white">
              {initialTask ? 'Edit Task & Accountability' : 'Schedule New Task'}
            </h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Set exact deadlines and multi-stage reminders
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {validationError && (
            <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Complete Systems Architecture Review"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-white placeholder-neutral-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
              Description / Deliverable
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key objectives, acceptance criteria, or context..."
              className="w-full px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none text-sm text-white placeholder-neutral-500 resize-none"
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                <span>Due Date <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                <span>Exact Due Time (24h) <span className="text-rose-500">*</span></span>
              </label>
              <input
                type="time"
                required
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 focus:border-indigo-500 text-sm text-white font-mono"
              />
            </div>
          </div>

          {/* Priority & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Priority
              </label>
              <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 rounded-xl border border-neutral-800">
                {priorities.map((p) => {
                  const isSelected = priority === p.value;
                  return (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setPriority(p.value)}
                      className={`py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                        isSelected
                          ? p.value === 'critical'
                            ? 'bg-rose-900/60 text-rose-300 border border-rose-700/60 font-semibold'
                            : p.value === 'high'
                            ? 'bg-amber-900/60 text-amber-300 border border-amber-700/60 font-semibold'
                            : p.value === 'medium'
                            ? 'bg-blue-900/60 text-blue-300 border border-blue-700/60 font-semibold'
                            : 'bg-neutral-800 text-neutral-200 border border-neutral-700 font-semibold'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:border-indigo-500 outline-none"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Estimated Duration */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Estimated Duration
              </label>
              <span className="text-xs font-mono text-indigo-400 font-bold">
                {estimatedDuration} minutes ({Math.round((estimatedDuration / 60) * 10) / 10}h)
              </span>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="5"
                max="240"
                step="5"
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(Number(e.target.value))}
                className="flex-1 accent-indigo-500 cursor-pointer"
              />
              <div className="flex gap-1">
                {[15, 25, 45, 60].map((mins) => (
                  <button
                    type="button"
                    key={mins}
                    onClick={() => setEstimatedDuration(mins)}
                    className="px-2 py-1 text-[11px] rounded bg-neutral-950 border border-neutral-800 hover:bg-neutral-800 text-neutral-300 tabular-nums"
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Reminder Preferences */}
          <div className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-800 space-y-2.5">
            <label className="block text-xs font-semibold text-neutral-200">
              Reminder Schedule (Strict Timing)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {[
                { id: 'both', label: '5m Before + Exact' },
                { id: 'exact', label: 'Exact Due Time' },
                { id: 'five_min', label: '5m Advance Only' },
                { id: 'custom', label: 'Custom Advance' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setReminderPreference(opt.id as ReminderPreference)}
                  className={`p-2 rounded-lg text-xs font-medium text-center border transition-colors ${
                    reminderPreference === opt.id
                      ? 'bg-indigo-950/60 border-indigo-600 text-indigo-300 font-semibold'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {reminderPreference === 'custom' && (
              <div className="flex items-center gap-2 pt-2 text-xs text-neutral-300">
                <span>Alert advance notice:</span>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customReminderMinutes}
                  onChange={(e) => setCustomReminderMinutes(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded bg-neutral-900 border border-neutral-700 text-center text-white"
                />
                <span>minutes before</span>
              </div>
            )}
          </div>

          {/* Repeat Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Repeat Cadence
              </label>
              <select
                value={repeatSchedule}
                onChange={(e) => setRepeatSchedule(e.target.value as RepeatSchedule)}
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:border-indigo-500 outline-none"
              >
                <option value="none">Does not repeat</option>
                <option value="daily">Daily</option>
                <option value="weekdays">Every Weekday (Mon-Fri)</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                Optional Notes & Links
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Checklists, ticket URL, etc."
                className="w-full px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-neutral-200 focus:border-indigo-500 outline-none placeholder-neutral-500"
              />
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-neutral-800 flex items-center justify-between gap-3 shrink-0">
          {initialTask && onDelete ? (
            <button
              type="button"
              onClick={() => {
                if (confirmDelete) {
                  onDelete(initialTask.id);
                  onClose();
                } else {
                  setConfirmDelete(true);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                confirmDelete
                  ? 'bg-rose-600 text-white animate-pulse'
                  : 'text-rose-400 hover:bg-rose-950/40 border border-rose-900/60'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>{confirmDelete ? 'Tap to Confirm Delete' : 'Delete Task'}</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/40 flex items-center gap-1.5 transition-colors"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{initialTask ? 'Update Task' : 'Save Task'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

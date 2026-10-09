import React from 'react';
import { ViewTab } from '../types/task';
import { Plus, Smartphone, Volume2, VolumeX, Mic } from 'lucide-react';

interface HeaderProps {
  currentTab: ViewTab;
  onTabChange: (tab: ViewTab) => void;
  onOpenCreateTask: () => void;
  onOpenVoiceAssistant: () => void;
  onOpenAndroidGuide: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  onOpenCreateTask,
  onOpenVoiceAssistant,
  onOpenAndroidGuide,
  isMuted,
  onToggleMute,
}) => {
  const navItems: { id: ViewTab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'tasks', label: 'My Tasks' },
    { id: 'calendar', label: 'Calendar' },
    { id: 'statistics', label: 'Statistics' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => onTabChange('dashboard')}
              className="text-lg md:text-xl font-extrabold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer text-left"
            >
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 shrink-0" />
              <span>TaskLock</span>
              <span className="hidden sm:inline text-xs font-normal text-neutral-400 font-mono tracking-normal">
                Focus Until Done
              </span>
            </button>
          </div>

          {/* Zone 2: Clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-neutral-400">
            {navItems.map((item) => {
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`relative py-1 whitespace-nowrap transition-colors cursor-pointer ${
                    isActive ? 'text-white font-semibold' : 'hover:text-neutral-200'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Primary action + quick utility triggers */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Audio Mute toggle */}
            <button
              onClick={onToggleMute}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
              title={isMuted ? 'Unmute Audio Alarms' : 'Mute Audio Alarms'}
              aria-label={isMuted ? 'Unmute Audio Alarms' : 'Mute Audio Alarms'}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>

            {/* Android Companion Guide */}
            <button
              onClick={onOpenAndroidGuide}
              className="px-3 py-1.5 rounded-xl text-xs font-medium bg-neutral-900 hover:bg-neutral-800 text-indigo-300 border border-neutral-800 hidden sm:flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Native Android Architecture, Kotlin code & Device policy"
            >
              <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Android Specs</span>
            </button>

            {/* Voice Assistant Mic Button */}
            <button
              onClick={onOpenVoiceAssistant}
              className="p-2 rounded-xl text-indigo-400 hover:text-white bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Voice Assistant (Telugu, Hindi, English)"
              aria-label="Voice Assistant"
            >
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-semibold">Voice Lock</span>
            </button>

            {/* Primary CTA: Create Task */}
            <button
              onClick={onOpenCreateTask}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-950/50 flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>New Task</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

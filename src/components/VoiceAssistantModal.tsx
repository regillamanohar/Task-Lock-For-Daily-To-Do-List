import React, { useState, useEffect, useRef } from 'react';
import {
  voiceAssistantService,
  SupportedLanguage,
  ParsedVoiceTask,
} from '../services/voiceAssistantService';
import { Task } from '../types/task';
import { soundService } from '../services/soundService';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  Volume2,
  Send,
  Loader2,
  Languages,
  ShieldAlert,
  RotateCcw,
  HelpCircle,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'history' | 'escalationCount'>) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en-IN');
  const [isListening, setIsListening] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [textInput, setTextInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedTask, setParsedTask] = useState<ParsedVoiceTask | null>(null);
  const [showTroubleshooting, setShowTroubleshooting] = useState(false);

  const timerRef = useRef<number | null>(null);
  const transcriptRef = useRef(transcript);
  transcriptRef.current = transcript;

  useEffect(() => {
    if (!isOpen) {
      voiceAssistantService.stopListening();
      setIsListening(false);
      setRecordingSeconds(0);
      setTranscript('');
      setTextInput('');
      setParsedTask(null);
      setErrorMessage(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (isListening) {
      setRecordingSeconds(0);
      timerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isListening]);

  if (!isOpen) return null;

  const handleRequestMicPermission = async () => {
    setErrorMessage(null);
    const result = await voiceAssistantService.requestMicrophonePermission();
    if (result.granted) {
      handleStartRecording();
    } else {
      setErrorMessage(result.error || 'Microphone access denied. Please allow in browser settings.');
      setShowTroubleshooting(true);
    }
  };

  const handleStartRecording = () => {
    setErrorMessage(null);
    setParsedTask(null);
    setTranscript('');
    setIsListening(true);

    voiceAssistantService.startListening(
      selectedLanguage,
      (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          handleStopRecording();
          processVoiceText(text);
        }
      },
      (err) => {
        setIsListening(false);
        setErrorMessage(err);
        setShowTroubleshooting(true);
      },
      (recordedAudio) => {
        setIsListening(false);
        // If we captured audio and no text was transcribed via SpeechRecognition
        if (recordedAudio && !transcriptRef.current.trim()) {
          processVoiceAudio(recordedAudio);
        }
      }
    );
  };

  const handleStopRecording = () => {
    setIsListening(false);
    voiceAssistantService.stopListening();
    if (transcript.trim()) {
      processVoiceText(transcript.trim());
    }
  };

  const handleToggleListening = () => {
    if (isListening) {
      handleStopRecording();
    } else {
      handleRequestMicPermission();
    }
  };

  const processVoiceText = async (text: string) => {
    if (!text.trim()) return;
    setErrorMessage(null);

    // 1. Instant 0ms render so the card appears right away without waiting!
    const instantTask = voiceAssistantService.quickParse(text, selectedLanguage);
    setParsedTask(instantTask);
    setIsParsing(true); // subtle background refining indicator

    try {
      const task = await voiceAssistantService.parseVoiceCommand(text, selectedLanguage);
      setParsedTask(task);

      // Speak back confirmation in the user's selected language
      if (task.confirmationMessage) {
        voiceAssistantService.speakConfirmation(task.confirmationMessage, selectedLanguage);
      }
    } catch (e: any) {
      console.warn('Background refinement note:', e);
      // Keep instantTask already displayed
    } finally {
      setIsParsing(false);
    }
  };

  const processVoiceAudio = async (audioBlob: Blob) => {
    setIsParsing(true);
    setErrorMessage(null);

    try {
      const task = await voiceAssistantService.parseVoiceCommand('', selectedLanguage, audioBlob);
      if (task.transcription) {
        setTranscript(task.transcription);
      }
      setParsedTask(task);

      if (task.confirmationMessage) {
        voiceAssistantService.speakConfirmation(task.confirmationMessage, selectedLanguage);
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Could not process audio recording');
    } finally {
      setIsParsing(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    setTranscript(textInput.trim());
    processVoiceText(textInput.trim());
  };

  const handleApplyExample = (exampleText: string) => {
    setTranscript(exampleText);
    setTextInput(exampleText);
    processVoiceText(exampleText);
  };

  const handleConfirmLock = () => {
    if (!parsedTask) return;

    soundService.playSuccessChime();
    onTaskCreated({
      title: parsedTask.title,
      description: parsedTask.description || `Voice set in ${parsedTask.detectedLanguage}`,
      dueDate: parsedTask.dueDate,
      dueTime: parsedTask.dueTime,
      priority: parsedTask.priority,
      category: parsedTask.category,
      estimatedDuration: parsedTask.estimatedDuration,
      reminderPreference: parsedTask.reminderPreference,
      repeatSchedule: 'none',
      notes: `Set via Voice Assistant (${parsedTask.detectedLanguage})`,
      isCompleted: false,
      fiveMinWarningSent: false,
      dueAlertSent: false,
    });

    onClose();
  };

  // Language specific prompt examples
  const examplesByLang: Record<SupportedLanguage, string[]> = {
    'te-IN': [
      'రేపు ఉదయం 9 గంటలకు టీమ్ మీటింగ్ టాస్క్ లాక్ చేయి',
      'ఈరోజు సాయంత్రం 7 గంటలకు జిమ్ వర్కౌట్ ముఖ్యమైనది',
      'రేపు మధ్యాహ్నం 2 గంటలకు డాక్టర్ అపాయింట్‌మెంట్',
    ],
    'hi-IN': [
      'कल सुबह 10 बजे क्लाइंट कॉल का टास्क लॉक सेट करो',
      'आज शाम 6 बजे वर्कआउट हाई प्रायोरिटी जरूरी',
      'कल दोपहर 3 बजे प्रोजेक्ट रिपोर्ट सबमिट करना है',
    ],
    'en-IN': [
      'Lock task sprint planning tomorrow at 10:00 AM',
      'Deep work session today at 6:30 PM high priority',
      'Doctor appointment on Friday at 4 PM for 45 minutes',
    ],
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="voice-modal-title"
        className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-neutral-900 border-t-2 sm:border border-indigo-500/80 shadow-2xl shadow-indigo-950/80 p-5 sm:p-6 flex flex-col text-neutral-100 relative overflow-hidden max-h-[92vh] overflow-y-auto"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-700/60 text-indigo-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="voice-modal-title" className="text-base sm:text-lg font-extrabold text-white flex items-center gap-2">
                <span>TaskLock Voice Assistant</span>
              </h2>
              <p className="text-[11px] text-neutral-400">
                Hands-free voice lock during busy times
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Selection Pills */}
        <div className="py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-300 flex items-center gap-1.5">
              <Languages className="w-3.5 h-3.5 text-indigo-400" />
              <span>Voice Language:</span>
            </span>
            <span className="text-[10px] font-mono text-neutral-400">
              Telugu · Hindi · English
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'en-IN' as SupportedLanguage, label: 'English', sub: 'English' },
              { id: 'te-IN' as SupportedLanguage, label: 'తెలుగు', sub: 'Telugu' },
              { id: 'hi-IN' as SupportedLanguage, label: 'हिन्दी', sub: 'Hindi' },
            ].map((lang) => (
              <button
                key={lang.id}
                type="button"
                onClick={() => {
                  if (isListening) handleStopRecording();
                  setSelectedLanguage(lang.id);
                }}
                className={`py-2 px-2 rounded-xl text-center border transition-all cursor-pointer ${
                  selectedLanguage === lang.id
                    ? 'bg-indigo-950/90 border-indigo-500 text-white ring-1 ring-indigo-500 font-bold'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <div className="text-xs font-semibold">{lang.label}</div>
                <div className="text-[10px] text-neutral-400 font-mono">{lang.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Permission Assistance Banner if error */}
        {errorMessage && (
          <div className="my-2 p-3.5 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-2">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-bold text-amber-300 block">Microphone Access Notice</span>
                <p className="text-[11px] text-amber-200/90 leading-relaxed mt-0.5">
                  {errorMessage}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-amber-900/60 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleRequestMicPermission}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Trigger Browser Permission Popup</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTroubleshooting(!showTroubleshooting)}
                className="text-[11px] text-amber-300 underline hover:text-white cursor-pointer"
              >
                {showTroubleshooting ? 'Hide Guide' : 'How to allow in browser 🔒'}
              </button>
            </div>

            {showTroubleshooting && (
              <div className="p-2.5 rounded-xl bg-black/40 border border-amber-900/40 text-[11px] text-amber-100/90 space-y-1">
                <p className="font-semibold text-white">How to enable in 10 seconds:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-neutral-300 pl-1">
                  <li>Click the <strong>Tune / Padlock icon (🔒)</strong> in your browser's address bar.</li>
                  <li>Toggle <strong>Microphone</strong> to <strong>Allow</strong>.</li>
                  <li>Click the button above or tap microphone again.</li>
                </ol>
                <p className="text-[10px] text-neutral-400 mt-1 italic">
                  💡 You can also test instantly by tapping any sample voice phrase below!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Microphone Button & Waveform */}
        <div className="py-4 flex flex-col items-center justify-center text-center">
          <div className="relative mb-3">
            {/* Pulsing acoustic rings when listening */}
            {isListening && (
              <>
                <span className="animate-ping absolute -inset-3 rounded-full bg-rose-500/30 opacity-75"></span>
                <span className="animate-pulse absolute -inset-6 rounded-full bg-rose-500/20"></span>
              </>
            )}

            <button
              onClick={handleToggleListening}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
                isListening
                  ? 'bg-rose-600 text-white ring-4 ring-rose-500/50 shadow-rose-950/60'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/60'
              }`}
              title={isListening ? 'Tap to finish recording and lock task' : 'Tap to speak'}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              {isListening ? (
                <MicOff className="w-8 h-8 animate-bounce" />
              ) : (
                <Mic className="w-8 h-8" />
              )}
            </button>
          </div>

          <p className="text-xs font-medium text-neutral-300">
            {isListening ? (
              <span className="text-rose-400 font-bold flex items-center justify-center gap-1.5 animate-pulse">
                <span>Listening ({recordingSeconds}s)... Tap to Finish & Lock</span>
              </span>
            ) : isParsing && !parsedTask ? (
              <span className="text-indigo-400 font-semibold flex items-center justify-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fast AI parsing...</span>
              </span>
            ) : parsedTask ? (
              <span className="text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Task ready! Review and lock below</span>
              </span>
            ) : (
              <span>Tap microphone to speak (Telugu / Hindi / English)</span>
            )}
          </p>

          {/* Transcript / Spoken Text Display */}
          {transcript && (
            <div className="mt-3 w-full p-3 rounded-2xl bg-neutral-950 border border-neutral-800 text-xs text-left">
              <span className="text-[10px] uppercase font-mono text-neutral-400 font-semibold block mb-0.5">
                Heard Voice Command:
              </span>
              <p className="text-white font-medium italic">"{transcript}"</p>
            </div>
          )}
        </div>

        {/* Parsed Task Result Preview */}
        {parsedTask && (
          <div className="my-2 p-4 rounded-2xl bg-neutral-950 border border-emerald-600/70 shadow-lg shadow-emerald-950/30 animate-in slide-in-from-bottom duration-200 space-y-3">
            <div className="flex items-center justify-between text-xs pb-2 border-b border-neutral-800">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>Parsed Tasklock Ready</span>
                {isParsing && (
                  <span className="text-[10px] text-indigo-400 font-normal font-mono flex items-center gap-1 ml-1.5 bg-indigo-950/70 px-2 py-0.5 rounded-full border border-indigo-800/60">
                    <Loader2 className="w-2.5 h-2.5 animate-spin" />
                    <span>Gemini AI refining</span>
                  </span>
                )}
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-neutral-800 text-neutral-300 capitalize">
                {parsedTask.detectedLanguage}
              </span>
            </div>

            <div>
              <h3 className="text-base font-bold text-white leading-snug">
                {parsedTask.title}
              </h3>
              {parsedTask.confirmationMessage && (
                <p className="text-xs text-emerald-300/90 italic mt-1 bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/60">
                  🗣️ "{parsedTask.confirmationMessage}"
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-neutral-300">
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="truncate">{parsedTask.dueDate}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <Clock className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                <span className="font-bold text-white">{parsedTask.dueTime}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 font-sans">Priority:</span>
                <span className="capitalize font-bold text-amber-400">{parsedTask.priority}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded-lg bg-neutral-900 border border-neutral-800">
                <span className="text-neutral-400 font-sans">Category:</span>
                <span className="capitalize">{parsedTask.category}</span>
              </div>
            </div>

            {/* Lock This Task CTA Button */}
            <button
              onClick={handleConfirmLock}
              className="w-full min-h-[48px] py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>LOCK THIS TASK NOW</span>
            </button>
          </div>
        )}

        {/* Text Input Fallback */}
        <form onSubmit={handleManualSubmit} className="pt-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder={
                selectedLanguage === 'te-IN'
                  ? 'లేదా టైప్ చేయండి (ఉదా: రేపు 10am మీటింగ్)...'
                  : selectedLanguage === 'hi-IN'
                  ? 'या यहाँ टाइप करें (उदा: कल शाम 7 बजे जिम)...'
                  : 'Or type voice command (e.g. gym today at 7pm)...'
              }
              className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!textInput.trim() || isParsing}
              className="min-h-[42px] px-3.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold disabled:opacity-50 flex items-center justify-center cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>

        {/* Quick Example Voice Chips */}
        <div className="pt-3 border-t border-neutral-800/80 mt-3">
          <span className="text-[10px] text-neutral-400 font-mono block mb-1.5">
            Quick Examples (Tap to test):
          </span>
          <div className="flex flex-col gap-1.5">
            {examplesByLang[selectedLanguage].map((example, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyExample(example)}
                className="text-left px-2.5 py-1.5 rounded-lg bg-neutral-950 hover:bg-neutral-800 text-[11px] text-neutral-300 border border-neutral-800/80 transition-colors truncate cursor-pointer"
              >
                👉 "{example}"
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

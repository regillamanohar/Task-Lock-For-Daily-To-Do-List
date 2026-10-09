import { Priority, Category, ReminderPreference } from '../types/task';

export interface ParsedVoiceTask {
  title: string;
  description: string;
  dueDate: string; // YYYY-MM-DD
  dueTime: string; // HH:MM
  priority: Priority;
  category: Category;
  estimatedDuration: number;
  reminderPreference: ReminderPreference;
  detectedLanguage: 'Telugu' | 'Hindi' | 'English' | string;
  confirmationMessage: string;
  transcription?: string;
}

export type SupportedLanguage = 'te-IN' | 'hi-IN' | 'en-IN';

class VoiceAssistantService {
  private recognition: any = null;
  private isListening: boolean = false;
  private activeStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
      }
    }
  }

  public isSpeechSupported(): boolean {
    return Boolean(this.recognition) || Boolean(typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia);
  }

  /**
   * Synchronous 0ms immediate parse for instantaneous UI rendering
   */
  public quickParse(text: string, lang: SupportedLanguage): ParsedVoiceTask {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return this.fallbackMultilingualParser(text || 'Voice Scheduled Task', lang, currentDate, currentTime);
  }

  /**
   * Explicitly request microphone permission from browser.
   * This triggers the browser's native "Allow microphone access?" prompt popup.
   */
  public async requestMicrophonePermission(): Promise<{ granted: boolean; error?: string }> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      return {
        granted: false,
        error: 'Microphone API is not supported in this browser. Please use text input.',
      };
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Keep stream reference
      this.activeStream = stream;
      return { granted: true };
    } catch (err: any) {
      console.warn('Microphone permission request error:', err);
      let errorMsg = 'Microphone permission was denied. Please allow microphone in browser settings.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Microphone access denied. Click the lock/settings icon in your browser address bar to allow Microphone, then try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'No microphone device found on your device.';
      }
      return { granted: false, error: errorMsg };
    }
  }

  /**
   * Start listening with dual-engine: Web Speech Recognition + MediaRecorder fallback
   */
  public async startListening(
    lang: SupportedLanguage,
    onResult: (text: string, isFinal: boolean) => void,
    onError: (err: string) => void,
    onEnd: (recordedAudio?: Blob) => void
  ) {
    // 1. Explicitly prompt user for microphone permission if not already active
    if (!this.activeStream || !this.activeStream.active) {
      const perm = await this.requestMicrophonePermission();
      if (!perm.granted) {
        onError(perm.error || 'Microphone permission denied.');
        return;
      }
    }

    this.audioChunks = [];
    this.isListening = true;

    // 2. Set up MediaRecorder on the granted audio stream
    if (this.activeStream && typeof MediaRecorder !== 'undefined') {
      try {
        const mimeType = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';
        this.mediaRecorder = mimeType
          ? new MediaRecorder(this.activeStream, { mimeType })
          : new MediaRecorder(this.activeStream);

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            this.audioChunks.push(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          const mime = this.mediaRecorder?.mimeType || 'audio/webm';
          const audioBlob = this.audioChunks.length > 0 ? new Blob(this.audioChunks, { type: mime }) : undefined;
          onEnd(audioBlob);
        };

        this.mediaRecorder.start(250);
      } catch (e) {
        console.warn('MediaRecorder init failed, falling back to speech recognition only:', e);
      }
    }

    // 3. Attempt Web Speech API recognition
    if (this.recognition) {
      try {
        this.recognition.lang = lang;
        this.recognition.maxAlternatives = 1;

        this.recognition.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; ++i) {
            const item = event.results[i];
            if (item.isFinal) {
              finalTranscript += item[0].transcript;
            } else {
              interimTranscript += item[0].transcript;
            }
          }

          const text = finalTranscript || interimTranscript;
          if (text) {
            onResult(text, Boolean(finalTranscript));
          }
        };

        this.recognition.onerror = (event: any) => {
          console.warn('Speech recognition error event:', event.error);
          // If speech recognition throws 'not-allowed' inside iframe, MediaRecorder is still recording!
          if (event.error !== 'not-allowed') {
            onError(`Speech error: ${event.error}`);
          }
        };

        this.recognition.onend = () => {
          // If recognition ended naturally, stop listening
          if (this.isListening) {
            this.stopListening();
          }
        };

        this.recognition.start();
      } catch (e: any) {
        console.warn('Could not start Web Speech Recognition:', e);
      }
    }
  }

  public stopListening() {
    this.isListening = false;

    // Stop speech recognition
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }

    // Stop media recorder
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch {
        // ignore
      }
    }

    // Stop microphone tracks so the browser recording indicator turns off
    if (this.activeStream) {
      try {
        this.activeStream.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      this.activeStream = null;
    }
  }

  /**
   * Speak back confirmation using Web Speech Synthesis
   */
  public speakConfirmation(text: string, lang: SupportedLanguage) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech synthesis fallback
    }
  }

  /**
   * Parse voice command from either transcribed text OR recorded audio blob
   */
  public async parseVoiceCommand(
    voiceText: string,
    userLanguage: SupportedLanguage,
    audioBlob?: Blob
  ): Promise<ParsedVoiceTask> {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let audioBase64: string | undefined = undefined;
    let mimeType: string | undefined = undefined;

    if (audioBlob && audioBlob.size > 0) {
      try {
        const buffer = await audioBlob.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        audioBase64 = btoa(binary);
        mimeType = audioBlob.type || 'audio/webm';
      } catch (err) {
        console.warn('Could not encode audio blob:', err);
      }
    }

    try {
      const res = await fetch('/api/voice-assistant/parse-task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voiceText: voiceText || '',
          audioBase64,
          mimeType,
          currentDate,
          currentTime,
          userLanguage: userLanguage === 'te-IN' ? 'Telugu' : userLanguage === 'hi-IN' ? 'Hindi' : 'English',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.task) {
          return this.sanitizeParsedTask(data.task, currentDate, currentTime);
        }
      }
    } catch (e) {
      console.warn('Server Gemini parse failed, falling back to local multilingual parser:', e);
    }

    // High-quality local multilingual fallback parser if offline or server error
    return this.fallbackMultilingualParser(voiceText || 'Voice Scheduled Task', userLanguage, currentDate, currentTime);
  }

  private sanitizeParsedTask(raw: any, defaultDate: string, defaultTime: string): ParsedVoiceTask {
    const validPriorities: Priority[] = ['low', 'medium', 'high', 'critical'];
    const validCategories: Category[] = ['Work', 'Study', 'Health', 'Personal', 'Finance', 'Urgent'];

    const priority: Priority = validPriorities.includes(raw.priority?.toLowerCase())
      ? raw.priority.toLowerCase()
      : 'medium';

    const category: Category = validCategories.find(
      (c) => c.toLowerCase() === raw.category?.toLowerCase()
    ) || 'Work';

    // Format time HH:MM
    let time = raw.dueTime || defaultTime;
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      const [h, m] = time.split(':');
      time = `${String(h).padStart(2, '0')}:${m}`;
    } else {
      time = defaultTime;
    }

    // Format date YYYY-MM-DD
    let date = raw.dueDate || defaultDate;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      date = defaultDate;
    }

    return {
      title: raw.title || 'Voice Scheduled Task',
      description: raw.description || '',
      dueDate: date,
      dueTime: time,
      priority,
      category,
      estimatedDuration: Number(raw.estimatedDuration) || 30,
      reminderPreference: raw.reminderPreference === 'exact' ? 'exact' : raw.reminderPreference === 'five_min' ? 'five_min' : 'both',
      detectedLanguage: raw.detectedLanguage || 'English',
      confirmationMessage: raw.confirmationMessage || `Task locked for ${time}`,
      transcription: raw.transcription,
    };
  }

  /**
   * Offline multilingual fallback parser for Telugu, Hindi, and English
   */
  private fallbackMultilingualParser(
    text: string,
    lang: SupportedLanguage,
    currentDate: string,
    currentTime: string
  ): ParsedVoiceTask {
    const lower = text.toLowerCase();
    const now = new Date();
    let targetDate = new Date();

    // 1. Date resolution (Telugu, Hindi, English)
    const isTomorrow =
      lower.includes('repu') ||
      lower.includes('రేపు') ||
      lower.includes('kal') ||
      lower.includes('कल') ||
      lower.includes('tomorrow');

    const isDayAfter =
      lower.includes('ellundi') ||
      lower.includes('ఎల్లుండి') ||
      lower.includes('parson') ||
      lower.includes('परसों') ||
      lower.includes('day after tomorrow');

    if (isTomorrow) {
      targetDate = new Date(now.getTime() + 86400000);
    } else if (isDayAfter) {
      targetDate = new Date(now.getTime() + 2 * 86400000);
    }

    const dueDate = targetDate.toISOString().split('T')[0];

    // 2. Time resolution (Detect numbers like 9 AM, 7 గంటలకు, 10 बजे, etc.)
    let dueTime = currentTime;
    const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|గంటలకు|బజే|बजे|baje|hours)?/i);

    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = timeMatch[2] ? timeMatch[2] : '00';

      // Check morning vs evening context
      const isEvening =
        lower.includes('pm') ||
        lower.includes('evening') ||
        lower.includes('night') ||
        lower.includes('సాయంత్రం') ||
        lower.includes('రాత్రి') ||
        lower.includes('shaam') ||
        lower.includes('raat') ||
        lower.includes('dopahar');

      if (isEvening && hours < 12) {
        hours += 12;
      }
      dueTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    }

    // 3. Priority detection
    let priority: Priority = 'medium';
    if (
      lower.includes('critical') ||
      lower.includes('urgent') ||
      lower.includes('mukhyam') ||
      lower.includes('ముఖ్యమైన') ||
      lower.includes('zaroori') ||
      lower.includes('ज़रूरी')
    ) {
      priority = 'critical';
    } else if (lower.includes('high') || lower.includes('important')) {
      priority = 'high';
    }

    // 4. Category detection
    let category: Category = 'Work';
    if (lower.includes('study') || lower.includes('చదువు') || lower.includes('padhai') || lower.includes('exam')) {
      category = 'Study';
    } else if (lower.includes('gym') || lower.includes('workout') || lower.includes('health') || lower.includes('doctor') || lower.includes('ఆరోగ్యం') || lower.includes('dawa')) {
      category = 'Health';
    } else if (lower.includes('personal') || lower.includes('home') || lower.includes('ఇల్లు') || lower.includes('ghar')) {
      category = 'Personal';
    }

    // 5. Clean up title from filler command words
    let cleanTitle = text
      .replace(/tasklock|task lock|set|lock|schedule|చేయి|చెయ్యి|చేయండి|కరో|సెట్|सेट करो|టాస్క్ లాక్/gi, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 3) {
      cleanTitle = 'Voice Scheduled Task';
    }

    let confirmationMessage = `Task "${cleanTitle}" locked for ${dueTime}.`;
    let detectedLanguage = 'English';

    if (lang === 'te-IN' || /[\u0C00-\u0C7F]/.test(text)) {
      detectedLanguage = 'Telugu';
      confirmationMessage = `మీ టాస్క్ "${cleanTitle}" ${dueTime} గంటలకు లాక్ చేయబడింది.`;
    } else if (lang === 'hi-IN' || /[\u0900-\u097F]/.test(text)) {
      detectedLanguage = 'Hindi';
      confirmationMessage = `आपका टास्क "${cleanTitle}" ${dueTime} बजे के लिए सेट और लॉक कर दिया गया है।`;
    }

    return {
      title: cleanTitle,
      description: `Created via TaskLock Voice Assistant (${detectedLanguage})`,
      dueDate,
      dueTime,
      priority,
      category,
      estimatedDuration: 30,
      reminderPreference: 'both',
      detectedLanguage,
      confirmationMessage,
    };
  }
}

export const voiceAssistantService = new VoiceAssistantService();

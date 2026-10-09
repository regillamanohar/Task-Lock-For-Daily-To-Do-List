/**
 * Audio synthesis service using Web Audio API for attention-grabbing,
 * zero-dependency accountability alarms and UI feedback.
 */

class SoundService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.8;
  private continuousIntervalId: number | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopContinuousAlarm();
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Start continuous, non-stop alarm ringing until explicitly stopped by user acknowledgement
   */
  public startContinuousAlarm() {
    if (this.isMuted) return;
    this.stopContinuousAlarm(); // Clear any existing interval

    // Play immediately
    this.playUrgentAlert();

    // Loop every 1.5 seconds non-stop
    this.continuousIntervalId = window.setInterval(() => {
      if (this.isMuted) {
        this.stopContinuousAlarm();
        return;
      }
      this.playUrgentAlert();
    }, 1500);
  }

  /**
   * Stop continuous alarm ringing immediately upon user action
   */
  public stopContinuousAlarm() {
    if (this.continuousIntervalId !== null) {
      clearInterval(this.continuousIntervalId);
      this.continuousIntervalId = null;
    }
  }

  public isContinuouslyRinging(): boolean {
    return this.continuousIntervalId !== null;
  }

  /**
   * Urgent accountability alert tone (two-tone repeating arpeggio designed to break focus)
   */
  public playUrgentAlert() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(this.volume * 0.9, now);
      gainNode.connect(ctx.destination);

      // 3 urgent pulses
      const pulses = [0, 0.18, 0.36, 0.7, 0.88, 1.06];
      pulses.forEach((timeOffset, idx) => {
        const osc = ctx.createOscillator();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'sine';
        // Alternating high frequencies: 880Hz (A5) and 1046.5Hz (C6)
        osc.frequency.setValueAtTime(idx % 2 === 0 ? 880 : 1046.5, now + timeOffset);
        
        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(this.volume * 0.5, now + timeOffset);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, now + timeOffset + 0.14);

        osc.connect(pulseGain);
        pulseGain.connect(gainNode);

        osc.start(now + timeOffset);
        osc.stop(now + timeOffset + 0.15);
      });
    } catch {
      // Audio playback best-effort fallback
    }
  }

  /**
   * Warning tone for the 5-minute pre-due notification
   */
  public playSubtleWarning() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25); // A5

      gainNode.gain.setValueAtTime(this.volume * 0.4, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.5);
    } catch {
      // Best effort
    }
  }

  /**
   * Task completion celebration chime
   */
  public playSuccessChime() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6 major chord

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.08);

        gain.gain.setValueAtTime(this.volume * 0.35, now + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.08);
        osc.stop(now + idx * 0.08 + 0.42);
      });
    } catch {
      // Best effort
    }
  }

  /**
   * Snooze / postponed feedback tone
   */
  public playSnoozeTone() {
    if (this.isMuted) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.3);

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.32);
    } catch {
      // Best effort
    }
  }

  /**
   * Test tone for settings panel
   */
  public testSound(type: 'urgent_chime' | 'pulse_alarm' | 'subtle_bell') {
    if (type === 'urgent_chime' || type === 'pulse_alarm') {
      this.playUrgentAlert();
    } else {
      this.playSubtleWarning();
    }
  }
}

export const soundService = new SoundService();

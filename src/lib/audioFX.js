// Zero-Dependency Native Web Audio API Sound Effects Engine
// Produces high-tech, crystal-clear acoustic cues, UI click feedback & Siri/Gemini sound waves without external sound files

class SoundFXEngine {
  constructor() {
    this.audioCtx = null;
  }

  getAudioContext() {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Crisp, Ultra-Modern Luxury UI Click Sound
  playClick() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // High-frequency subtle acoustic tap
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(2400, now);
      filter.Q.setValueAtTime(3.0, now);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1600, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  // Soft Pop / Selection Tone
  playPop() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.06);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch (e) {}
  }

  // Futuristic Siri / Gemini signature sound release chime (When voice AI awakes)
  playActivationChime() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const osc3 = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, now);
      filter.frequency.exponentialRampToValueAtTime(7000, now + 0.15);

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc3.type = 'triangle';

      // Siri / Gemini modern chord progression: F#5 (739.99 Hz) -> B5 (987.77 Hz) -> D#6 (1244.51 Hz)
      osc1.frequency.setValueAtTime(739.99, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.08);
      osc1.frequency.exponentialRampToValueAtTime(1244.51, now + 0.18);

      // Harmonious sub-body for premium acoustic weight
      osc2.frequency.setValueAtTime(369.99, now);
      osc2.frequency.exponentialRampToValueAtTime(493.88, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(622.25, now + 0.18);

      // Shimmer overtone
      osc3.frequency.setValueAtTime(1479.98, now);
      osc3.frequency.exponentialRampToValueAtTime(1975.53, now + 0.08);
      osc3.frequency.exponentialRampToValueAtTime(2489.02, now + 0.18);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);

      osc1.connect(filter);
      osc2.connect(filter);
      osc3.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
      osc3.stop(now + 0.6);
    } catch (e) {}
  }

  // Success Confirmation Tone (When AI completes a command)
  playSuccessTone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const oscHarmonic = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      oscHarmonic.type = 'sine';

      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880.00, now + 0.09); // A5
      osc.frequency.exponentialRampToValueAtTime(1318.51, now + 0.20); // E6

      oscHarmonic.frequency.setValueAtTime(329.63, now);
      oscHarmonic.frequency.exponentialRampToValueAtTime(440.00, now + 0.09);
      oscHarmonic.frequency.exponentialRampToValueAtTime(659.25, now + 0.20);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

      osc.connect(gain);
      oscHarmonic.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      oscHarmonic.start(now);
      osc.stop(now + 0.48);
      oscHarmonic.stop(now + 0.48);
    } catch (e) {}
  }

  // Deactivation Tone (When voice stops)
  playDeactivationTone() {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, now); // B5
      osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.16); // B4

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.28);
    } catch (e) {}
  }
}

export const soundFX = new SoundFXEngine();
export default soundFX;

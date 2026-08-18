/**
 * TokenChime — short oscillator pluck for Run 1 token pickup
 * Atlas lane · P0 scaffold
 *
 * Sine oscillator with exponential decay, 2nd harmonic for brightness,
 * 3 pitch variations.
 */

import type { AudioContext, OscillatorNode, GainNode } from './types.js';

export class TokenChime {
  private ctx: AudioContext;
  private output: GainNode;
  private _freqs: number[];

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(ctx.destination);
    this._freqs = [880, 1100, 660]; // 3 pitch variations
  }

  /** Play a chime. variation 0–2 picks one of the 3 pitches. */
  play(variation = 0, volume = 0.6): void {
    const freq = this._freqs[variation % this._freqs.length]!;
    const now = this.ctx.currentTime;

    // Primary tone
    const osc1 = this.ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;

    const gain1 = this.ctx.createGain();
    gain1.gain.setValueAtTime(volume, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.connect(gain1);
    gain1.connect(this.output);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // 2nd harmonic (brightness)
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = freq * 2;

    const gain2 = this.ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.3, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc2.connect(gain2);
    gain2.connect(this.output);
    osc2.start(now);
    osc2.stop(now + 0.15);
  }

  dispose(): void {
    this.output.disconnect();
  }
}

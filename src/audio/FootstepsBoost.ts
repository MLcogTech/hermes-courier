/**
 * FootstepsBoost — filtered noise bursts for movement feedback (KIPP FSM)
 * Atlas lane · P0 scaffold
 *
 * Footstep: short bandpass-filtered noise burst, 40ms.
 * Boost whoosh: sine sweep 100→300 Hz, 100ms.
 * 2–3 timbre variations per surface.
 */

import type { AudioContext, AudioBufferSourceNode, AudioBuffer, GainNode, BiquadFilterNode, OscillatorNode } from './types.js';

export class FootstepsBoost {
  private ctx: AudioContext;
  private output: GainNode;
  private noiseBuffer!: AudioBuffer;
  private _created = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(ctx.destination);
  }

  private ensureNoise(): void {
    if (this._created) return;
    this._created = true;
    const sr = this.ctx.sampleRate;
    const len = sr * 0.1; // 100ms of noise
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  /** Footstep — filtered noise burst
   * @param variation 0–2 for timbre
   * @param volume 0–1
   */
  footstep(variation = 0, volume = 0.5): void {
    this.ensureNoise();
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.start(now, 0, 0.04); // 40ms slice

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    const baseFreq = [2000, 3000, 1500][variation % 3]!;
    filter.frequency.value = baseFreq;
    filter.Q.value = 2 + variation * 0.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    src.stop(now + 0.06);
  }

  /** Boost whoosh — low sine sweep on boost activation */
  boost(volume = 0.6): void {
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.output);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  dispose(): void {
    this.output.disconnect();
  }
}

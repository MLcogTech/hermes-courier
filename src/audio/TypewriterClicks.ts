/**
 * TypewriterClicks — short noise transients for the outro typing effect
 * Atlas lane · P0 scaffold
 *
 * Very short noise burst (5ms), highpass at 3kHz, synced to typewriter rate.
 * 2 intensity variations.
 */

import type { AudioContext, AudioBufferSourceNode, AudioBuffer, GainNode, BiquadFilterNode } from './types.js';

export class TypewriterClicks {
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
    const len = sr * 0.01; // 10ms of noise
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  /** Play a single click
   * @param variation 0=normal, 1=emph (louder, slightly longer)
   * @param volume 0–1
   */
  click(variation = 0, volume = 0.7): void {
    this.ensureNoise();
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const dur = variation === 1 ? 0.008 : 0.005;
    src.start(now, 0, dur);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;

    const gain = this.ctx.createGain();
    const v = variation === 1 ? volume * 1.4 : volume;
    gain.gain.setValueAtTime(v, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur * 2);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    src.stop(now + dur * 2 + 0.01);
  }

  /** Play a sequence of N clicks at a given interval (seconds between clicks) */
  sequence(count: number, interval = 0.014, variationCycle = true): void {
    const now = this.ctx.currentTime;
    for (let i = 0; i < count; i++) {
      const t = now + i * interval;
      const v = variationCycle ? (i % 2 === 0 ? 0 : 1) : 0;
      // Schedule each click
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const dur = v === 1 ? 0.008 : 0.005;
      src.start(t, 0, dur);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3000;

      const gain = this.ctx.createGain();
      const vol = v === 1 ? 0.9 : 0.6;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 2);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      src.stop(t + dur * 2 + 0.01);
    }
  }

  dispose(): void {
    this.output.disconnect();
  }
}

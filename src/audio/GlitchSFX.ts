/**
 * GlitchSFX — procedural glitch/stutter SFX (Reveal + Run 2)
 * Atlas lane · P0 scaffold
 *
 * Zero external samples. Built from:
 *  - an AudioBuffer of white noise (generated at init)
 *  - a Waveshaper for distortion
 *  - buffer source playback with rate manipulation for pitch drops
 *  - short noise transients for stutter clicks
 *
 * 3 variations: (1) stutter burst, (2) descending pitch drop, (3) random chop
 */

import type {
  AudioContext,
  AudioBuffer,
  AudioBufferSourceNode,
  GainNode,
  WaveShaperNode,
  BiquadFilterNode,
} from './types.js';

type GlitchVariation = 1 | 2 | 3;

interface GlitchSFXOpts {
  distortionAmount?: number;  // waveshaper curve depth, default 4
}

export class GlitchSFX {
  private ctx: AudioContext;
  private noiseBuffer!: AudioBuffer;
  private output: GainNode;
  private opts: Required<GlitchSFXOpts>;
  private _createdNoise = false;

  constructor(ctx: AudioContext, opts: GlitchSFXOpts = {}) {
    this.ctx = ctx;
    this.opts = { distortionAmount: 4, ...opts };

    this.output = ctx.createGain();
    this.output.gain.value = 1;
    this.output.connect(ctx.destination);
  }

  /** Generate a 1-second white noise buffer (lazy — called on first play) */
  private ensureNoiseBuffer(): void {
    if (this._createdNoise) return;
    this._createdNoise = true;

    const sr = this.ctx.sampleRate;
    const len = sr * 1; // 1 second
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buf;
  }

  /** Build a waveshaper for distortion */
  private makeDistortion(amount = 4): WaveShaperNode {
    const node = this.ctx.createWaveShaper();
    const samples = 256;
    const curve = new Float32Array(samples);
    for (let i = 0; i < samples; i++) {
      const x = (i / (samples - 1)) * 2 - 1;
      curve[i] = ((Math.PI + amount * x) / (Math.PI + amount)) * x;
      // soft clip
      if (Math.abs(x) > 0.5) {
        curve[i] = Math.sign(x) * (0.5 + (Math.abs(x) - 0.5) * 0.2);
      }
    }
    node.curve = curve;
    node.oversample = 'none';
    return node;
  }

  /**
   * Play glitch variation
   * @param variation 1=stutter, 2=pitch drop, 3=chop
   * @param volume 0–1
   */
  play(variation: GlitchVariation = 1, volume = 1): void {
    this.ensureNoiseBuffer();
    const now = this.ctx.currentTime;

    if (variation === 1) {
      this.playStutter(now, volume);
    } else if (variation === 2) {
      this.playPitchDrop(now, volume);
    } else {
      this.playChop(now, volume);
    }
  }

  // Variation 1: short stutter burst — rapid noise clicks
  private playStutter(startTime: number, volume: number): void {
    const burstCount = 6;
    const interval = 0.04; // 40ms
    for (let i = 0; i < burstCount; i++) {
      const t = startTime + i * interval;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      // play a 30ms slice
      src.start(t, 0, 0.03);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * (1 - i * 0.1), t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

      const dist = this.makeDistortion(this.opts.distortionAmount);
      src.connect(dist);
      dist.connect(gain);
      gain.connect(this.output);

      // Teardown
      const stopAt = t + 0.1;
      src.stop(stopAt);
    }
  }

  // Variation 2: descending pitch drop — noise buffer played at decreasing rate
  private playPitchDrop(startTime: number, volume: number): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    // Start at 1.0, drop to 0.3 over 400ms
    const dur = 0.4;

    // Actually set it directly
    const rate = src.playbackRate;
    rate.setValueAtTime(1.0, startTime);
    rate.linearRampToValueAtTime(0.3, startTime + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + dur);

    const dist = this.makeDistortion(this.opts.distortionAmount);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, startTime);
    filter.frequency.linearRampToValueAtTime(400, startTime + dur);

    src.connect(dist);
    dist.connect(filter);
    filter.connect(gain);
    gain.connect(this.output);

    src.start(startTime);
    src.stop(startTime + dur + 0.05);
  }

  // Variation 3: random chop — noise buffer split into random-length segments
  private playChop(startTime: number, volume: number): void {
    const segCount = 8;
    const totalDur = 0.6;
    let t = startTime;
    const segLen = totalDur / segCount;

    for (let i = 0; i < segCount; i++) {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const playLen = segLen * (0.3 + Math.random() * 0.7);
      src.start(t, (i * segLen) % this.noiseBuffer.duration, playLen);

      const gain = this.ctx.createGain();
      const v = volume * (0.4 + Math.random() * 0.6);
      gain.gain.setValueAtTime(v, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + playLen);

      const dist = this.makeDistortion(this.opts.distortionAmount * (0.5 + Math.random()));
      src.connect(dist);
      dist.connect(gain);
      gain.connect(this.output);

      const stopAt = t + playLen + 0.02;
      src.stop(stopAt);
      t += segLen;
    }
  }

  /** Play a short glitch click (for UI feedback, very short) */
  click(volume = 0.5): void {
    this.playStutter(this.ctx.currentTime, volume);
  }

  dispose(): void {
    this.output.disconnect();
  }
}

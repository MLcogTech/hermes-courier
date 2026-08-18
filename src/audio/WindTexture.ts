/**
 * WindTexture — ambient wind/noise texture for temple ambience
 * Atlas lane · P0 scaffold
 *
 * White noise buffer, bandpass-filtered with slow LFO on center freq,
 * stereo pan drift.
 */

import type { AudioContext, AudioBufferSourceNode, AudioBuffer, GainNode, BiquadFilterNode, StereoPannerNode, OscillatorNode, AnalyserNode } from './types.js';

export class WindTexture {
  private ctx: AudioContext;
  private output: GainNode;
  private source: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private panner: StereoPannerNode | null = null;
  private analyser: AnalyserNode | null = null;
  private noiseBuffer!: AudioBuffer;
  private _created = false;
  private _playing = false;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
    this.output = ctx.createGain();
    this.output.gain.value = 0.3; // quiet ambient
    this.output.connect(ctx.destination);
  }

  private ensureNoise(): void {
    if (this._created) return;
    this._created = true;
    const sr = this.ctx.sampleRate;
    const len = sr * 4; // 4-second loop
    const buf = this.ctx.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // Brownish noise — sum of random with decay
      data[i] = Math.random() * 2 - 1;
    }
    // Simple lowpass smoothing
    for (let i = 1; i < len; i++) {
      data[i]! = data[i]! * 0.4 + data[i - 1]! * 0.6;
    }
    this.noiseBuffer = buf;
  }

  start(fadeDuration = 3): void {
    if (this._playing) return;
    this.ensureNoise();

    // Source — looping
    this.source = this.ctx.createBufferSource();
    this.source.buffer = this.noiseBuffer;
    this.source.loop = true;

    // Bandpass filter
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.frequency.value = 800;
    this.filter.Q.value = 0.5;

    // LFO on filter center
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = 0.05; // slow drift
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = 400; // ±400 Hz
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Stereo panner for drift
    this.panner = this.ctx.createStereoPanner();
    this.panner.pan.value = 0;

    // Analyser for visualization / routing
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;

    // Chain: source → filter → panner → analyser → output
    this.source.connect(this.filter);
    this.filter.connect(this.panner);
    this.panner.connect(this.analyser);
    this.analyser.connect(this.output);

    this.source.start();

    // Fade in
    const now = this.ctx.currentTime;
    this.output.gain.setValueAtTime(0, now);
    this.output.gain.linearRampToValueAtTime(0.3, now + fadeDuration);

    this._playing = true;
  }

  stop(fadeDuration = 2): void {
    if (!this._playing) return;

    const now = this.ctx.currentTime;
    this.output.gain.setValueAtTime(this.output.gain.value, now);
    this.output.gain.linearRampToValueAtTime(0, now + fadeDuration);

    const stopAt = now + fadeDuration + 0.1;
    this.source!.stop(stopAt);
    this.lfo!.stop(stopAt);

    this._playing = false;
  }

  /** Set overall volume */
  setVolume(v: number): void {
    this.output.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  /** Set pan position (-1 to 1) */
  setPan(p: number): void {
    if (this.panner) {
      this.panner.pan.setTargetAtTime(p, this.ctx.currentTime, 0.2);
    }
  }

  dispose(): void {
    this.stop(0.1);
    this.output.disconnect();
  }

  isPlaying(): boolean {
    return this._playing;
  }

  getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }
}

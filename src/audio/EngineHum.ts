/**
 * EngineHum — continuous low drone bed (Run 1 ambient)
 * Atlas lane · P0 scaffold
 *
 * Two detuned sine oscillators + sub bass, LFO-modulated lowpass,
 * fades in at Run 1 start and out at the reveal.
 */

import type { AudioContext, OscillatorNode, GainNode, BiquadFilterNode } from './types.js';

interface EngineHumOpts {
  baseFreq?: number;       // Hz, default 110 (A2)
  detuneCents?: number;   // cents, default 2.5
  filterBase?: number;    // Hz, default 300
  filterRange?: number;   // Hz, default 400
  lfoRate?: number;       // Hz, default 0.08
  subGainDB?: number;     // dB below master, default -12
}

export class EngineHum {
  private ctx: AudioContext;
  private opts: Required<EngineHumOpts>;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private osc3: OscillatorNode | null = null; // sub
  private osc1Gain: GainNode | null = null;
  private osc2Gain: GainNode | null = null;
  private osc3Gain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private output: GainNode | null = null;
  private _playing = false;

  constructor(ctx: AudioContext, opts: EngineHumOpts = {}) {
    this.ctx = ctx;
    this.opts = {
      baseFreq: 110,
      detuneCents: 2.5,
      filterBase: 300,
      filterRange: 400,
      lfoRate: 0.08,
      subGainDB: -12,
      ...opts,
    };
  }

  /** Build the node graph but don't connect yet (call start() to play) */
  private build(): void {
    if (this._playing) return;

    // Output gain — routes to master bus
    this.output = this.ctx.createGain();
    this.output.gain.value = 0; // start silent

    // Filter — lowpass, LFO-modulated
    this.filter = this.ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = this.opts.filterBase;
    this.filter.Q.value = 1.0;

    // LFO → filter cutoff
    this.lfo = this.ctx.createOscillator();
    this.lfo.type = 'sine';
    this.lfo.frequency.value = this.opts.lfoRate;
    this.lfoGain = this.ctx.createGain();
    this.lfoGain.gain.value = this.opts.filterRange / 2;
    this.lfo.connect(this.lfoGain);
    this.lfoGain.connect(this.filter.frequency);
    this.lfo.start();

    // Oscillator 1 — main tone
    this.osc1 = this.ctx.createOscillator();
    this.osc1.type = 'sine';
    this.osc1.frequency.value = this.opts.baseFreq;
    this.osc1Gain = this.ctx.createGain();
    this.osc1Gain.gain.value = 1;

    // Oscillator 2 — detuned (chorus effect)
    this.osc2 = this.ctx.createOscillator();
    this.osc2.type = 'sine';
    this.osc2.frequency.value = this.opts.baseFreq;
    this.osc2.detune.value = this.opts.detuneCents * 100; // cents → Hz-ish
    this.osc2Gain = this.ctx.createGain();
    this.osc2Gain.gain.value = 0.7;

    // Oscillator 3 — sub bass
    this.osc3 = this.ctx.createOscillator();
    this.osc3.type = 'sine';
    this.osc3.frequency.value = this.opts.baseFreq / 2;
    this.osc3Gain = this.ctx.createGain();
    const subLinear = Math.pow(10, this.opts.subGainDB / 20);
    this.osc3Gain.gain.value = subLinear;

    // Chain: osc1 → osc1Gain → filter → output
    //        osc2 → osc2Gain → filter → output
    //        osc3 → osc3Gain → output (sub bypasses filter for body)
    this.osc1.connect(this.osc1Gain);
    this.osc1Gain.connect(this.filter);
    this.osc2.connect(this.osc2Gain);
    this.osc2Gain.connect(this.filter);
    this.osc3.connect(this.osc3Gain);
    this.osc3Gain.connect(this.output);
    this.filter.connect(this.output);

    this.output.connect(this.ctx.destination);
  }

  /** Start / fade in the hum */
  start(fadeDuration = 2): void {
    if (this._playing) return;
    this.build();
    this._playing = true;

    const now = this.ctx.currentTime;
    this.output!.gain.setValueAtTime(0, now);
    this.output!.gain.linearRampToValueAtTime(1, now + fadeDuration);
  }

  /** Stop / fade out the hum */
  stop(fadeDuration = 1.5): void {
    if (!this._playing) return;
    this._playing = false;

    const now = this.ctx.currentTime;
    this.output!.gain.setValueAtTime(this.output!.gain.value, now);
    this.output!.gain.linearRampToValueAtTime(0, now + fadeDuration);

    // Schedule full teardown after fade
    const teardownAt = now + fadeDuration + 0.1;
    this.osc1!.stop(teardownAt);
    this.osc2!.stop(teardownAt);
    this.osc3!.stop(teardownAt);
    this.lfo!.stop(teardownAt);
  }

  /** Short fade-dip (for transition moments) */
  dip(duration = 0.5, depth = 0.4): void {
    if (!this._playing || !this.output) return;
    const now = this.ctx.currentTime;
    const current = this.output.gain.value;
    this.output.gain.setValueAtTime(current, now);
    this.output.gain.linearRampToValueAtTime(current * (1 - depth), now + duration / 2);
    this.output.gain.linearRampToValueAtTime(current, now + duration);
  }

  isPlaying(): boolean {
    return this._playing;
  }

  dispose(): void {
    this.stop(0.1);
    if (this.output) this.output.disconnect();
  }
}

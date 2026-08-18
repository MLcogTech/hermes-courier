/**
 * MasterBus — singleton WebAudio master gain + dynamics compressor
 * Atlas lane · P0 scaffold
 *
 * All other audio modules route through MasterBus.output (a GainNode)
 * before hitting destination. MasterBus owns the compressor and the
 * master gain so we can duck/fade the whole mix from one place.
 */

import type { AudioContext } from './types.js';

export class MasterBus {
  private ctx: AudioContext;
  private masterGain: GainNode;
  private compressor: DynamicsCompressorNode;
  private _volume: number = 1.0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;

    // Master gain — last gain stage before destination
    this.masterGain = ctx.createGain();
    this.masterGain.gain.value = this._volume;

    // Bus compressor — gentle limiting to prevent clipping
    this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -12;   // dB
    this.compressor.knee.value = 6;
    this.compressor.ratio.value = 4;
    this.compressor.attack.value = 0.003;    // s
    this.compressor.release.value = 0.25;    // s

    // Chain: masterGain → compressor → destination
    this.masterGain.connect(this.compressor);
    this.compressor.connect(ctx.destination);
  }

  /** Route a sub-mix gain node through the master bus */
  connectThrough(node: GainNode): void {
    node.connect(this.masterGain);
  }

  /** Set master volume (0–1). No clamp here — caller owns the range. */
  setVolume(v: number): void {
    this._volume = v;
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Fade master to a target volume over `duration` seconds */
  fadeTo(v: number, duration: number): void {
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, duration / 3);
  }

  /** Resume context if suspended (call on first user gesture) */
  resume(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      return this.ctx.resume();
    }
    return Promise.resolve();
  }

  /** Clean up — disconnect everything */
  dispose(): void {
    this.masterGain.disconnect();
    this.compressor.disconnect();
  }
}

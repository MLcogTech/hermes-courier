/**
 * AudioManager — central WebAudio init, gesture-resume, state routing
 * Atlas lane · P0 scaffold
 *
 * Owns the AudioContext + MasterBus. All other audio modules are
 * constructed against the manager's context. First user input
 * resumes the context (autoplay policy).
 */

import { MasterBus } from './MasterBus.js';
import { EngineHum } from './EngineHum.js';
import type { AudioContext as WAContext } from './types.js';

type AudioState = 'idle' | 'run1' | 'reveal' | 'run2' | 'outro';

export class AudioManager {
  private ctx: WAContext | null = null;
  private masterBus: MasterBus | null = null;
  private engineHum: EngineHum | null = null;
  private state: AudioState = 'idle';
  private _initialized = false;

  /** Call once on app start — does NOT create context yet (autoplay policy) */
  init(): void {
    if (this._initialized) return;
    this._initialized = true;
  }

  /** Create AudioContext + MasterBus + EngineHum. Call on first user gesture. */
  async resume(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        await this.ctx.resume();
      }
      return;
    }

    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) throw new Error('WebAudio not available');

    this.ctx = new AC() as WAContext;
    this.masterBus = new MasterBus(this.ctx);
    this.engineHum = new EngineHum(this.ctx, {
      baseFreq: 110,
      detuneCents: 2.5,
      filterBase: 300,
      filterRange: 400,
      lfoRate: 0.08,
      subGainDB: -12,
    });

    // Start the bed immediately (will fade in)
    this.engineHum.start(2);
    this.state = 'run1';
  }

  /** Transition to Run 1 — engine hum fades in fully */
  enterRun1(): void {
    this.state = 'run1';
    if (this.engineHum && !this.engineHum.isPlaying()) {
      this.engineHum.start(2);
    }
    if (this.masterBus) this.masterBus.setVolume(1);
  }

  /** Transition to The Reveal — dip the hum, prepare for glitch SFX */
  enterReveal(): void {
    this.state = 'reveal';
    if (this.engineHum) this.engineHum.dip(0.8, 0.6);
    if (this.masterBus) this.masterBus.setVolume(0.7);
  }

  /** Transition to Run 2 — kill the hum, glitch SFX takes over */
  enterRun2(): void {
    this.state = 'run2';
    if (this.engineHum) this.engineHum.stop(1.5);
    if (this.masterBus) this.masterBus.setVolume(0.8);
  }

  /** Transition to Outro — low ambient under the typing */
  enterOutro(): void {
    this.state = 'outro';
    if (this.masterBus) this.masterBus.setVolume(0.5);
  }

  /** Current state — modules can query for routing decisions */
  getState(): AudioState {
    return this.state;
  }

  getContext(): WAContext | null {
    return this.ctx;
  }

  getMasterBus(): MasterBus | null {
    return this.masterBus;
  }

  /** Clean up on page unload / scene reset */
  dispose(): void {
    this.engineHum?.dispose();
    this.masterBus?.dispose();
    this.ctx?.close();
    this.ctx = null;
    this.masterBus = null;
    this.engineHum = null;
    this.state = 'idle';
  }
}

// Singleton — import { audioManager } from './AudioManager.js'
export const audioManager = new AudioManager();

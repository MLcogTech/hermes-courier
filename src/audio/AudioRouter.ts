// AudioRouter — P1 WebAudio integration: owns the audio manager and routes
// it through the game-state transitions.
//
// Architecture (mirrors src/audio/README.md):
//
//   AudioContext (master)
//   └─ MasterBus (GainNode → DynamicsCompressor → destination)
//      ├─ EngineHum        (continuous bed — Run 1 / ACT_1)
//      └─ GlitchSFX        (primed during ACT_1, triggered on TRANSITION)
//
// Lifecycle:
//   - init()         : prep-only, no AudioContext (autoplay policy)
//   - resume(gesture): create AudioContext + MasterBus + EngineHum on first
//                      user input (keydown/pointer). This satisfies the
//                      WebAudio autoplay requirement.
//   - onState(state) : react to game-state transitions:
//        ACT_1       → start EngineHum (fade in)
//        TRANSITION  → dip EngineHum, fire GlitchSFX (reveal stutter)
//        ACT_2       → stop EngineHum (glitch world takes over)
//        EPILOGUE    → MasterBus ducks for outro typing
//
// The router is created once in main.ts and updated from the fixed-timestep
// loop's state-dispatch path (not from the render path).
//
// Zero external audio samples. All sound synthesized at runtime via WebAudio.

import { audioManager } from '@/audio/AudioManager.js';
import { GlitchSFX } from '@/audio/GlitchSFX.js';

type AudioState = 'idle' | 'resumed' | 'act1' | 'transition' | 'act2' | 'outro';

export class AudioRouter {
  private _state: AudioState = 'idle';
  private glitch: GlitchSFX | null = null;

  /** Prep-only — safe to call before any user gesture. */
  init(): void {
    audioManager.init();
    this._state = 'idle';
  }

  /**
   * Create AudioContext + MasterBus + EngineHum.
   * Call on the FIRST user gesture (keydown / pointerdown) to satisfy
   * the autoplay policy. Subsequent calls are no-ops if already resumed.
   */
  async resume(): Promise<void> {
    if (this._state === 'resumed' || this._state !== 'idle') return;
    await audioManager.resume();
    this._state = 'resumed';

    // Prime the glitch SFX (create the node graph, but don't play)
    this.glitch = new GlitchSFX(audioManager.getContext()!, {
      distortionAmount: 4,
    });
  }

  /**
   * Call from the game-state manager's transition path.
   * State gating:
   *   ACT_1       → EngineHum fade-in (bed under the temple)
   *   TRANSITION  → dip EngineHum + GlitchSFX stutter (the reveal)
   *   ACT_2       → kill EngineHum (static world, glitch takes over)
   *   EPILOGUE    → MasterBus duck for outro typing
   */
  onState(state: string): void {
    switch (state) {
      case 'ACT_1':
        this._enterAct1();
        break;
      case 'TRANSITION':
        this._enterTransition();
        break;
      case 'ACT_2':
        this._enterAct2();
        break;
      case 'EPILOGUE':
        this._enterOutro();
        break;
      default:
        // ACT_1 and beyond all route through here; unknown states are no-ops.
        break;
    }
  }

  /** Current audio state (for debugging/telemetry). */
  getState(): AudioState {
    return this._state;
  }

  /** Clean up on scene reset / page unload. */
  dispose(): void {
    this.glitch?.dispose();
    this.glitch = null;
    audioManager.dispose();
    this._state = 'idle';
  }

  // ── internal transitions ────────────────────────────────────────────────

  private _enterAct1(): void {
    if (this._state === 'act1') return; // already there
    audioManager.enterRun1();
    this._state = 'act1';
  }

  private _enterTransition(): void {
    if (this._state === 'transition') return;
    audioManager.enterReveal();
    // Fire the glitch stutter as the temple dissolves/reveals.
    if (this.glitch) this.glitch.play(1, 1.0); // variation 1 = stutter burst
    this._state = 'transition';
  }

  private _enterAct2(): void {
    if (this._state === 'act2') return;
    audioManager.enterRun2();
    this._state = 'act2';
  }

  private _enterOutro(): void {
    if (this._state === 'outro') return;
    audioManager.enterOutro();
    this._state = 'outro';
  }
}

// Singleton — import { audioRouter } from '@/audio/AudioRouter.js'
export const audioRouter = new AudioRouter();

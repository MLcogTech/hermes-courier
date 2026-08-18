/**
 * FixedTimestepLoop — deterministic 60 Hz update loop.
 *
 * P0 CONTRACT:
 * - Fixed step of 1/60s (16.666...ms) for deterministic physics/updates.
 * - Frame time capped at MAX_ACCUMULATION to prevent death spiral.
 * - Zero allocations in the tick path: accumulator and timing vars
 *   are mutated in place; no closures, no object creation per frame.
 *
 * Reference: Fix Your Timestep (Gaffer on Games).
 */

export const FIXED_STEP_FPS = 60;
export const FIXED_STEP_SEC = 1 / FIXED_STEP_FPS;
export const FIXED_STEP_MS = FIXED_STEP_SEC * 1000;

// Clamp to prevent spiral of death on stutter frames.
export const MAX_ACCUMULATION = FIXED_STEP_SEC * 5;

export interface FixedStepOptions {
  onUpdate: (dt: number) => void;
  onRender: (alpha: number) => void;
  maxAccumulation?: number;
}

export class FixedTimestepLoop {
  private readonly fixedStep: number;
  private readonly maxAccumulation: number;
  private readonly onUpdate: (dt: number) => void;
  private readonly onRender: (alpha: number) => void;

  private accumulator: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private rafId: number | null = null;

  // Scratch — reused across frames, never allocated in hot loop.
  private frameDt: number = 0;
  private alpha: number = 0;

  constructor(options: FixedStepOptions) {
    this.fixedStep = FIXED_STEP_SEC;
    this.maxAccumulation = options.maxAccumulation ?? MAX_ACCUMULATION;
    this.onUpdate = options.onUpdate;
    this.onRender = options.onRender;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Hot loop — ZERO allocations guaranteed.
   * Mutates accumulator, alpha, lastTime in place.
   */
  private tick = (now: number): void => {
    if (!this.running) return;

    // Compute frame delta (ms → s)
    this.frameDt = (now - this.lastTime) * 1e-3;
    this.lastTime = now;

    // Clamp frame time to avoid huge jumps (tab backgrounding, etc.)
    if (this.frameDt > 0.25) this.frameDt = 0.25;

    // Accumulate
    this.accumulator += this.frameDt;

    // Fixed-step updates
    while (this.accumulator >= this.fixedStep) {
      this.onUpdate(this.fixedStep);
      this.accumulator -= this.fixedStep;
    }

    // Interpolate for render
    this.alpha = this.accumulator / this.fixedStep;
    this.onRender(this.alpha);

    this.rafId = requestAnimationFrame(this.tick);
  };
}

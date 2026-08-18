// KIPP's input manager — edge detection, input buffering (80–120ms),
// coyote-time hooks (50–100ms). Owns the feel gate for the whole crew.
export class InputManager {
  // Key state: we track both the down-set and a just-pressed set so
  // isJustPressed is a true rising-edge, not "held last frame too".
  private held = new Set<string>();
  private justPressed = new Set<string>();
  private justReleased = new Set<string>();

  // Action input buffer — stores the timestamp (relative to buffer epoch)
  // of the most recent press for each action code. Consumed on the first
  // valid tick that can accept it.
  private bufferEpoch = 0;
  private buffer = new Map<string, number>();

  // Buffering window in seconds (80–120ms → use 0.100 as the budget).
  // The upper bound is 0.120 but we expire at the window size; if an
  // action slips past it the buffer is cleared and the press is lost.
  readonly bufferWindow = 0.100;

  // Coyote timer: seconds remaining after the player left a ledge.
  // Set externally by the player FSM / collision system when a ground
  // transition to airborne happens with a footing loss.
  private coyoteRemaining = 0;
  readonly coyoteDuration = 0.066; // 66ms — middle of the 50–100ms band

  // Convenience aliases for the action codes the FSM uses.
  static ACTION_JUMP = 'jump';
  static ACTION_BOOST = 'boost';
  static ACTION_DASH = 'dash';

  constructor() {
    this.resetFrame();
  }

  // ── Frame lifecycle ──────────────────────────────────────────────────

  /** Call once per game tick, before the tick's input queries. */
  resetFrame(): void {
    // Just-pressed / just-released are consumed by the query; clear them
    // now so a missed query never lingers into the next frame.
    this.justPressed.clear();
    this.justReleased.clear();
    // Advance the buffer epoch by one frame so old entries age out.
    this.bufferEpoch += 1;
    this.expireBuffer();
  }

  // ── Keyboard input ───────────────────────────────────────────────────

  /** Register a keydown. Push a just-pressed edge and seed the buffer. */
  keyDown(code: string): void {
    if (!this.held.has(code)) {
      this.justPressed.add(code);
    }
    this.held.add(code);
    // Seed the action buffer for any action bound to this key.
    this.bufferAction(code);
  }

  /** Register a keyup. Push a just-released edge. */
  keyUp(code: string): void {
    this.held.delete(code);
    this.justReleased.add(code);
  }

  // ── Edge queries ─────────────────────────────────────────────────────

  /** True if the key is currently held (any duration). */
  isPressed(code: string): boolean {
    return this.held.has(code);
  }

  /** True on the single frame the key transitioned down → up is false. */
  isJustPressed(code: string): boolean {
    return this.justPressed.has(code);
  }

  /** True on the single frame the key transitioned up. */
  isJustReleased(code: string): boolean {
    return this.justReleased.has(code);
  }

  // ── Input buffering ───────────────────────────────────────────────────

  /**
   * Register an action press for buffer consumption.
   * Called automatically by keyDown for every key; also callable directly
   * for gamepad triggers that don't pass through keyDown.
   */
  bufferAction(action: string, timestamp?: number): void {
    // Keep the most recent press — a rapid double-tap overwrites.
    this.buffer.set(action, timestamp ?? this.bufferEpoch);
  }

  /**
   * Consume a buffered action. Returns the age (in frames) of the buff-
   * ered press, or -1 if nothing is buffered or the buffer has expired.
   *
   * Age 0 = pressed on the current frame (just seeded). Higher ages mean
   * the press has been waiting.
   */
  consumeBuffered(action: string): number {
    const age = this.buffer.get(action);
    if (age === undefined) return -1;
    // Don't auto-expire here — expireBuffer() runs at frame reset.
    this.buffer.delete(action);
    return age;
  }

  /**
   * Peek at a buffered action without consuming it. Useful for states
   * that want to know "is there a pending input" without stealing it.
   */
  peekBuffered(action: string): number {
    return this.buffer.get(action) ?? -1;
  }

  /** True if any action is currently buffered (for UI / debugging). */
  hasBufferedActions(): boolean {
    return this.buffer.size > 0;
  }

  // ── Coyote time ──────────────────────────────────────────────────────

  /**
   * Begin the coyote window. Called by the player FSM / collision system
   * the frame the player leaves a ledge and there was no jump input.
   *
   * If the player jumped the same frame they left the ledge, the caller
   * should NOT call this — the jump consumes the edge directly.
   */
  startCoyote(): void {
    this.coyoteRemaining = this.coyoteDuration;
  }

  /**
   * Consume the coyote window. Returns true if the window is open and
   * resets it. The caller is responsible for pairing this with a jump
   * execution.
   */
  consumeCoyote(): boolean {
    if (this.coyoteRemaining > 0) {
      this.coyoteRemaining = 0;
      return true;
    }
    return false;
  }

  /**
   * Peek at coyote remaining without consuming. The player FSM uses this
   * to decide whether to enter AIRBORNE on a jump input.
   */
  coyoteAvailable(): boolean {
    return this.coyoteRemaining > 0;
  }

  /** Tick the coyote timer down by dt. Called by the FSM each frame. */
  tickCoyote(dt: number): void {
    if (this.coyoteRemaining > 0) {
      this.coyoteRemaining = Math.max(0, this.coyoteRemaining - dt);
    }
  }

  /** Cancel coyote (e.g. when the player jumps, runs back onto a ledge). */
  cancelCoyote(): void {
    this.coyoteRemaining = 0;
  }

  // ── Buffer expiry ────────────────────────────────────────────────────

  private expireBuffer(): void {
    const cutoff = this.bufferEpoch - Math.round(this.bufferWindow * 60);
    for (const [action, age] of this.buffer) {
      if (age < cutoff) this.buffer.delete(action);
    }
  }

  // ── Reset ────────────────────────────────────────────────────────────

  /** Full reset for scenario restarts / fresh runs. */
  reset(): void {
    this.held.clear();
    this.justPressed.clear();
    this.justReleased.clear();
    this.buffer.clear();
    this.bufferEpoch = 0;
    this.coyoteRemaining = 0;
  }
}

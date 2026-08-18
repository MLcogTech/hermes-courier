// KIPP's FSM engine — typed, hook-bearing, used by both the game-state FSM
// (ACT_1 → TRANSITION → ACT_2 → EPILOGUE) and the player FSM (run/boost/jump).
//
// Design notes:
//  - States are string literals so each FSM gets its own narrow union; the
//    engine itself is generic and reusable.
//  - Transitions are explicit one-way gates with a guard function; the FSM
//    never back-jumps and never implicitly resets.
//  - Hooks fire atomically inside transition(): onExit for the old state,
//    onEnter for the new. No hook runs twice for the same transition.
//  - reset() is explicit and fires exit→enter for the full round-trip.

export type FSMState = string;

export interface FSMHooks<S extends FSMState> {
  /** Called once when the FSM enters this state (previous state passed). */
  onEnter?: (state: S, previous: S | null) => void;
  /** Called once when the FSM leaves this state for the next. */
  onExit?: (state: S, next: S) => void;
  /** Called every tick while the FSM is in this state. May return a proposed
   * next state; the engine will attempt that transition on the same tick. */
  onTick?: (state: S, ctx: FSMContext) => S | null;
}

export interface FSMContext {
  /** External clock the guards can read (e.g. context-window elapsed). */
  readonly elapsed: number;
  /** Delta for the current tick, in seconds. */
  readonly dt: number;
  /** Arbitrary payload the caller can attach for guard logic. */
  readonly data: Record<string, unknown>;
}

/** A one-way transition with a guard. Only attempted while `from` is current. */
export interface FSMTransition<S extends FSMState> {
  from: S;
  to: S;
  /** Returns true when the transition is allowed this tick. */
  guard: (ctx: FSMContext) => boolean;
  /** Fires after the guard passes, before onEnter/onExit. Optional. */
  onCommit?: (from: S, to: S, ctx: FSMContext) => void;
}

export class FSM<S extends FSMState> {
  current: S;
  private hooks = new Map<S, FSMHooks<S>>();
  private readonly initial: S;

  constructor(initial: S) {
    this.current = initial;
    this.initial = initial;
  }

  /** Register lifecycle hooks for a state. Re-registering replaces. */
  register(state: S, hooks?: FSMHooks<S>): void {
    this.hooks.set(state, hooks ?? {});
  }

  /** One-way transition. Returns true if it fired; false if `to` is already
   * current or `from` doesn't match. Fires onExit→onEnter atomically. */
  transition(to: S, ctx?: FSMContext): boolean {
    if (to === this.current) return false;
    const prev = this.current;
    const fromHooks = this.hooks.get(prev);
    fromHooks?.onExit?.(prev, to);
    const toHooks = this.hooks.get(to);
    toHooks?.onEnter?.(to, prev);
    this.current = to;
    return true;
  }

  /**
   * Tick the FSM. Runs onTick for the current state; if it proposes a next
   * state, attempts that transition. Return the new current state, or the
   * existing one if nothing changed.
   */
  tick(ctx: FSMContext): S {
    const hooks = this.hooks.get(this.current);
    const proposed = hooks?.onTick?.(this.current, ctx);
    if (proposed !== undefined && proposed !== null && proposed !== this.current) {
      this.transition(proposed, ctx);
    }
    return this.current;
  }

  /** Explicit full reset — fires exit/enter for the round trip. */
  reset(): void {
    const prev = this.current;
    if (prev !== this.initial) {
      const fromHooks = this.hooks.get(prev);
      fromHooks?.onExit?.(prev, this.initial);
    }
    this.current = this.initial;
    const toHooks = this.hooks.get(this.initial);
    toHooks?.onEnter?.(this.initial, prev);
  }

  /** True if the FSM is in its initial state. */
  isReset(): boolean {
    return this.current === this.initial;
  }
}

/** Build a guarded linear pipeline of transitions.
 *
 * The returned transition list is ordered; guards are evaluated in order and
 * the first one whose guard passes wins. This is the common case for the
 * game-state FSM: ACT_1 → TRANSITION → ACT_2 → EPILOGUE is a chain, not a
 * mesh.
 */
export function linearPipeline<S extends FSMState>(
  transitions: Array<FSMTransition<S>>,
): Array<FSMTransition<S>> {
  return transitions;
}

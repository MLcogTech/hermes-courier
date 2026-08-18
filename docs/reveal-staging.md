# Reveal Staging — Camera + Lighting During the Dissolve

**Game:** Hermes Protocol
**Author:** PLEX (cinematography lane)
**Status:** P1 contract — the reveal is the single most important camera moment in the demo.
**References:** `docs/camera-language.md` (§3, §5), `docs/lighting-design.md` (§3, §6),
             `SPEC.md` (§1 Vision: t=0:45 reveal, 90s structure).

---

## 1. The Reveal Beat — Timing (from SPEC §1)

| Moment | Time | What happens |
|---|---|---|
| Temple full | 0:00–0:44 | Run 1 — marble×GPU-rack temple, token rivers, volumetric light. Warm, trustworthy. |
| Reveal onset | 0:45 | Temple dissolves. It was the hallucination. The static was real. |
| Dissolve middle | 0:45–0:50 | Temple geometry dissolves. Cold light rises. 5500K → 8000K blend. |
| Static full | 0:50–1:15 | Run 2 — glitch is ground, white-noise reaper dissolving the world behind you. |
| Outro | 1:15–1:30 | Response types onto wall. Cursor blinks. Camera turns on the human. Credits roll. |

The reveal is **5 frames** of dissolve (0:45–0:50, 2.5 seconds at 60fps = 150 frames,
but the SPEC treats it as a beat, not a frame count — the dissolve duration is 2.5s,
matching the lighting-design.md §3.1 blend curve).

---

## 2. Camera Behavior During the Dissolve

### 2.1 The Rule — Collapse Feel, No Zoom-Out

**The framing rule for the reveal (camera-language.md §3):**
> 50mm, tight, collapse feel. No zoom-out. No pull-back that says "we are now looking
> at the whole broken world." Instead, the rig *collapses toward the dissolving geometry*
> — the camera feels like it is being pulled into the melt, not retreating from it.

This is non-negotiable. A zoom-out would read as "the world is unfolding" — that's
environmental scale shift, not trust inversion. The dissolve must feel like the ground
is disappearing beneath the viewer, which requires a tighter field of view (50mm) so
the depth compression makes the dissolving geometry feel like it's collapsing *toward*
the camera.

### 2.2 Mechanical Description (frame-by-frame)

At the dissolve beat (t=0:45), the following happens in sequence:

**Frame 0 — Pre-dissolve (t=0:44–0:45):**
- Chase camera at 45mm, following the player anchor with the critically-damped spring.
- Temple lighting at full: 5500K high-window key, god rays live, warm fill.
- Camera is alive — breathing with the player's movement.

**Frame 1 — Dissolve onset (t=0:45, frame 0 of dissolve):**
- `CameraDirector.programmeReveal(dissolvingTarget)` is called.
- The shot queue is cleared. The reveal shot is programmed:
  - Lens: 50mm (cut, not zoom — enforced in code by `CameraDirector.setFocalLength(50)`).
  - Look-at: locked onto the dissolving temple mass (the `dissolvingTarget` world position).
  - Duration: 2.5 seconds (matches the lighting blend curve).
  - Spring: over-damped — the camera feels heavy and final.
- The temple lighting is *cut* — not faded. `TempleLighting.cut()` sets key intensity to 0,
  fill to 0, god-ray shaft opacity to 0. The god rays die with the window because they are
  the window's volume.
- The rig *stops following the player*. The chase target is overridden so the rig collapses
  toward the dissolving geometry. The camera does not breathe during the melt.

**Frames 2–150 — Dissolve middle (t=0:45–0:50):**
- The rig's over-damped spring carries the camera inward toward the dissolving geometry.
- The look-at is locked onto the dissolving target — not the player, not the camera's
  previous chase target.
- The focal length holds at 50mm. No animation. No zoom. The lens is locked.
- The temple lighting stays off. No warm ghost. The lighting transition (lighting-design.md §3)
  handles the cold rise separately — it's a blend from 5500K → 8000K in the world material,
  not the camera.
- The camera is *dead* — over-damped, no oscillation, no settle time visible. It feels like
  the camera is being pulled into the melt by gravity, not by a spring.

**Frame 151 — Dissolve end (t=0:50):**
- The reveal shot ends. `CameraDirector.releaseToChase()` is called.
- The lens returns to 45mm (chase default).
- The spring returns to critically-damped (not over-damped).
- The camera resumes following the player anchor.
- The static lighting is at full: 8000K cold key, flicker live, attention beams live.
- **Hard rule:** if a screenshot of this frame shows warm light in the environment, the
  transition is wrong and the gate fails. The critic catches this.

### 2.3 What the Camera Does NOT Do

- **No zoom-out.** The focal length does not increase during the dissolve. It goes 45mm →
  50mm (cut) and holds. A zoom-out would read as "revealing the whole world" — that's the
  wrong emotional read.
- **No pull-back.** The rig does not retreat from the dissolving geometry. It collapses
  toward it. The distance to the dissolving target decreases, not increases.
- **No camera breathe.** During the dissolve, the spring is over-damped. The camera does
  not react to player movement. It is dead weight being pulled into the melt.
- **No look-at switch to the player.** The look-at is locked onto the dissolving geometry
  for the entire dissolve duration. The player is not the point of interest during the reveal.

### 2.4 Dissolving Target Calculation

The `dissolvingTarget` passed to `programmeReveal()` is the world-space centre of the
dissolving temple mass. P1 CASE determines this — it's the centre of the temple geometry
that the dissolve shader is melting. PLEX's contract: the camera locks onto whatever point
the geometry is dissolving *from*. If the temple centre is at (0, 1, 0), the look-at is
(0, 1, 0). If the dissolve is centred on a different point, the look-at moves with it.

The camera does not need to track the dissolve front — it locks onto the static centre point
and the over-damped spring carries it inward. The visual result is a camera that feels like
it's sinking into the melt, not chasing it.

---

## 3. Attention-Beam Light Shaft Spec (Act 2)

### 3.1 What They Are

Attention beams are the visual proxy for "the latent space is paying attention to you."
They are cold volumetric light shafts that lead the eye to points of interest. Unlike the
temple's god rays (warm, from a fixed window), the attention beams are cold (9000–10000K),
come from below/within the volume, and are **gaze-driven** — they track what the camera is
looking at.

### 3.2 Parameters (from lighting-design.md §4.3)

| Parameter | Value | Notes |
|---|---|---|
| Type | Volumetric light shafts (subsurface scattering / in-scattering in fog) | P1: semi-transparent cone meshes. P2: CASE's in-scattering pass. |
| Color temperature | 9000–10000K | Cold, blue-white. Colder than the ambient key. |
| Approximate RGB | (0.7, 0.8, 1.0) | Distinctly blue-white. |
| Number active | 2–4 at a time | Specific and intentional, not ambient noise. |
| Gaze coupling | Beam near look-at vector = full intensity. Beam far from look-at = 40–60%. | The beams lead the eye. Wherever the camera looks, the brightest shaft is there. |
| Motion | Slow drift in position + intensity (independent of flicker) | Movement keeps beams alive; otherwise they read as frozen geometry. |
| Lifetime | 4–8 seconds per beam, then fade and respawn elsewhere | Transient — they mark a moment of attention. |
| Direction | From below/within the volume, rising upward | Not from a fixed window like the temple. |

### 3.3 Gaze Coupling — The Camera–Lighting Contract

This is the most important part of the attention-beam spec. The beams are not ambient —
they are *gaze-driven*. The coupling works as follows:

1. Each frame, the camera's look-at vector is available from `CameraDirector.rigLookAt`
   (or the underlying `THREE.PerspectiveCamera` look-at target).
2. For each active attention beam, compute the angle between the beam's direction vector
   and the camera's look-at direction.
3. If the angle is small (beam is near where the camera is looking), the beam is at full
   intensity (opacity = BEAM_OPACITY × 1.0).
4. If the angle is large (beam is far from where the camera is looking), the beam is at
   40–60% intensity (opacity = BEAM_OPACITY × 0.5 ± 0.1).
5. The transition between full and reduced intensity is smooth — no hard cutoff.

**Attention-beam contract (lighting-design.md §4.3, hard rule):**
> The beams are the visual proxy for "the latent space is paying attention to you."
> They are not a generic fog effect. If a screenshot shows beams that don't relate to
> where the camera is looking, the look is wrong.

### 3.4 P1 Implementation Notes

In P1, attention beams are implemented as semi-transparent cone meshes with additive blending.
Each beam has:
- A position (in world space, drifting slowly).
- A direction (rising from below).
- A lifetime (4–8 seconds, then respawned).
- A current intensity (gaze-modulated + drift oscillation).

The gaze coupling is computed each frame from the camera's look-at vector. The beam's opacity
is the product of BEAM_OPACITY × gazeFactor × driftOscillation.

**Known limitations in P1:**
- The beams are cone meshes, not a volumetric scattering pass. They read as "light shafts"
  but lack the physical weight of in-scattering. CASE replaces them in P2.
- The gaze coupling is based on the look-at *direction*, not the look-at *position*. A beam
  that is in the direction the camera is looking but far from the camera will still be bright.
  This is acceptable for P1 — the read is "the camera is looking that way" not "the camera
  is looking at that specific point."
- The beam count is capped at 4 to stay within the frame budget. If the flicker + beam pass
  breaks the 16.6ms budget, CASE reduces the number of active beams or the beam opacity. PLEX
  insists on the look; CASE finds the cost.

---

## 4. Outro Camera — Turning the Camera on the Human

### 4.1 Mechanical Description

The outro is the pivot from game to address. The camera stops being the agent's eye and
becomes *our* eye — the lens is now pointing at the player (the human) through the screen.

**The three-phase outro (from camera-language.md §5):**

**Phase 1 — Static three-quarter (outro start, t=1:15):**
- The chase rig releases. `CameraDirector.releaseToChase()` is called.
- The camera cuts to a static, slightly high, three-quarter frame on the agent.
- Focal length: 50mm, f/2.0 nominal.
- The agent is framed in a real-room context — not a game sprite.
- The typewriter text writes onto the wall behind the agent.

**Phase 2 — Slow push-in (after typed response complete):**
- The prompt cursor blinks. The camera *slowly push-ins* toward the agent's face.
- This is not a dolly — it's a slow focal-length compression: 50mm → 85mm over ~6 seconds.
- The rig settles to keep the face framed as the focal length changes.
- This is the move that says "the answer is addressed to someone."

**Phase 3 — Credits frame (credits roll):**
- The camera releases the agent entirely.
- Drifts to a wider, quieter frame that includes the written response on the wall
  and the agent in the same shot.
- The credits are legible. The frame is static. The mood is restraint, not spectacle.

### 4.2 Code Stub — OutroCamera

The outro camera is a separate controller that takes over from the `CameraDirector` when
the game enters `GameState.EPILOGUE`. It owns the camera for the outro duration and returns
control to the chase rig when the outro ends (or the demo loops).

```typescript
// OutroCamera — stub for P1. Full implementation is P3 scope (SPEC §7: P3 = THE OUTRO).
// The stub defines the contract: three phases, lens compression 50→85mm, static credits frame.
//
// Owned by PLEX. CASE reviews the focal-length animation cost (it's a parameter modulation,
// not a scene-graph walk — same argument as the flicker).

import * as THREE from 'three';
import { CineCameraActor, SensorFormat } from '@/camera/CineCameraActor';

export class OutroCamera {
  private camera: CineCameraActor;
  private phase: OutroPhase = OutroPhase.IDLE;
  private phaseTimer = 0;

  // Phase 1: static three-quarter on the agent.
  private phase1LookAt: THREE.Vector3;
  private phase1Position: THREE.Vector3;

  // Phase 2: slow 50→85mm compression.
  private phase2StartFocalLength = 50;
  private phase2EndFocalLength = 85;
  private phase2Duration = 6.0; // seconds

  // Phase 3: wider credits frame.
  private phase3LookAt: THREE.Vector3;
  private phase3Position: THREE.Vector3;

  constructor(camera: CineCameraActor) {
    this.camera = camera;
  }

  /** Called when the game enters EPILOGUE. Starts the outro. */
  start(agentPosition: THREE.Vector3, wallPosition: THREE.Vector3): void {
    this.phase = OutroPhase.PHASE_1;
    this.phaseTimer = 0;

    // Phase 1: static, slightly high three-quarter on the agent.
    this.phase1Position = agentPosition.clone().add(
      new THREE.Vector3(0.5, 0.3, 2.5), // slightly high, three-quarter
    );
    this.phase1LookAt = agentPosition.clone();

    // Phase 3: wider credits frame — agent + written response on the wall.
    this.phase3Position = agentPosition.clone().add(
      new THREE.Vector3(0, 0.5, 5.0), // wider, quieter
    );
    this.phase3LookAt = wallPosition.clone();
  }

  /** Called each frame during the outro. Advances the phase. */
  update(dt: number): void {
    if (this.phase === OutroPhase.IDLE) return;

    this.phaseTimer += dt;

    switch (this.phase) {
      case OutroPhase.PHASE_1:
        // Static three-quarter. Hold until the typewriter text is complete.
        // P1: placeholder duration (P3 CASE/KIPP drive the actual timing).
        if (this.phaseTimer >= 3.0) { // placeholder — replace with typewriter done event
          this.enterPhase2();
        }
        this.camera.position.copy(this.phase1Position);
        this.camera.lookAt(this.phase1LookAt);
        break;

      case OutroPhase.PHASE_2:
        // Slow 50→85mm compression.
        const t = Math.min(1, this.phaseTimer / this.phase2Duration);
        const focalLength = this.phase2StartFocalLength +
          (this.phase2EndFocalLength - this.phase2StartFocalLength) * t;
        this.camera.setFocalLength(focalLength);
        // The rig settles to keep the face framed as the focal length changes.
        // For now: hold position, adjust look-at to keep the agent centred.
        this.camera.position.copy(this.phase1Position);
        this.camera.lookAt(this.phase1LookAt);
        if (this.phaseTimer >= this.phase2Duration) {
          this.enterPhase3();
        }
        break;

      case OutroPhase.PHASE_3:
        // Wider credits frame. Static.
        this.camera.position.copy(this.phase3Position);
        this.camera.lookAt(this.phase3LookAt);
        // Hold until credits roll is complete (P3: driven by ATLAS/KIPP).
        break;
    }
  }

  /** Called when the outro ends (credits complete, or demo loops). */
  end(): void {
    this.phase = OutroPhase.IDLE;
    this.phaseTimer = 0;
    // Return to chase defaults.
    this.camera.setFocalLength(45);
    this.camera.setAspect(window.innerWidth / window.innerHeight);
  }

  get currentPhase(): OutroPhase {
    return this.phase;
  }

  get isRunning(): boolean {
    return this.phase !== OutroPhase.IDLE;
  }
}

export enum OutroPhase {
  IDLE = 'IDLE',
  PHASE_1 = 'PHASE_1', // static three-quarter on agent
  PHASE_2 = 'PHASE_2', // slow 50→85mm push-in
  PHASE_3 = 'PHASE_3', // wider credits frame
}
```

### 4.3 P1 Status

The OutroCamera stub is P1 documentation + contract. The actual outro is P3 scope
(SPEC §7: "P3 — THE OUTRO: Prompt-cursor scene, input box, honest canned reply,
credits-over-exchange (ATLAS+KIPP) · full 90s loop (PLEX)").

P1 delivers:
- The OutroCamera class stub with the three-phase structure.
- The lens compression contract (50→85mm over 6 seconds).
- The camera position + look-at for each phase (placeholder values — P3 CASE/KIPP
  determine the actual agent + wall positions).

P1 does NOT deliver:
- The typewriter text rendering (ATLAS).
- The prompt cursor (KIPP).
- The canned reply (ATLAS + KIPP).
- The credits roll (ATLAS + KIPP).
- The actual outro timing (driven by the typewriter completion, which is P3).

---

## 5. Transition Summary — The Full Reveal Arc

| Moment | Time | Camera | Lighting | Notes |
|---|---|---|---|---|
| Temple full | 0:00–0:44 | Chase at 45mm, spring following player | Temple: 5500K key, god rays, warm fill | Alive, breathing |
| Reveal onset | 0:45 | programmeReveal(): 50mm cut, look-at → dissolving target, over-damped spring, rig collapses inward | Temple lighting CUT (key → 0, fill → 0, god rays → 0) | No zoom-out. No warm ghost. |
| Dissolve middle | 0:45–0:50 | Over-damped spring carries camera inward toward dissolving geometry. Look-at locked on dissolving target. 50mm holds. | Cold light rises: 5500K → 8000K blend. Flicker begins once cold > 0.3. | Camera is dead weight. Lighting is the transition. |
| Static full | 0:50 | releaseToChase(): back to 45mm, critically-damped spring, following player | Static: 8000K key (flicker), attention beams (cold, gaze-driven), no fill | Hard cut. No warm residual. |
| Outro | 1:15–1:30 | OutroCamera takes over: 50mm static three-quarter → 50→85mm push-in → wider credits frame | Outro: 3200K warm incandescent (lamp-warm, not daylight-warm). Slow dim to darkness over final credit. | OutroCamera is P1 stub; full outro is P3. |

The arc is: warm trustworthy daylight → abrupt cold with flicker → cold attention beams
watching the player → warm human room (outro) → quiet darkness.

Each transition is a lighting event, not a fade. The camera's job during the reveal is to
make the dissolve feel like a collapse, not a pull-back. The audience should feel the mood
shift in their gut, not just see the color change.

---

## 6. P1 Checklist (what PLEX delivers this phase)

- [x] `CameraDirector` class — damped spring follow, locked 45mm chase, shot queue, reveal shot.
- [x] `CineCameraActor` — S35 sensor, focal-length-derived FOV, aperture nominal for DOF.
- [x] `TempleLighting` — 5500K warm directional key, 4500K warm fill, god-ray shaft mesh.
- [x] `StaticLighting` — 8000K cold key with flicker, 9000–10000K attention beams with gaze coupling.
- [x] `docs/reveal-staging.md` — this document. Exact dissolve camera contract, beam spec, outro stub.
- [ ] OutroCamera wire-up in main.ts (P1: stub present, not driven by game state — P3 scope).
- [ ] Full attention-beam volumetric pass (P2: CASE replaces cone meshes with in-scattering).
- [ ] DOF post-pass (P2: PLEX owns look, CASE owns perf).

---

*End of reveal-staging.md. P1 implementation owned by PLEX (camera + lighting) with CASE
(renderer cost, flicker/beam perf, dissolve shader) and KIPP (FSM transitions driving the
reveal timing).*

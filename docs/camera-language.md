# Camera Language — Cinematic Camera Specification

**Game:** Hermes Protocol  
**Author:** PLEX (cinematography lane)  
**Status:** P0 foundation stub — ready for P1 implementation  
**Lens policy:** Super-35mm sensor (24.89 × 18.66 mm) throughout, unless a shot calls for full-frame (36×24mm) for the outro.

---

## 1. Core Philosophy

The camera is a *participant*, not a recorder. Every shot answers a narrative question. The player trusts the lens to guide attention. A rushed camera reads as cheap; a deliberate camera reads as authored.

Two rules bound every decision:

1. **No random cuts.** Cuts happen on: (a) act transitions, (b) the reveal, (c) gameplay beat changes, (d) the outro pivot. Every other movement is continuous or smoothly interpolated.
2. **No lens whiplash.** Focal length changes are themselves motivated — a zoom signals "something changed here." Otherwise the lens stays locked.

---

## 2. Chase Camera — Primary Gameplay Lens

The chase camera is the workhorse for Run 1 (Temple) and Run 2 (Static). It follows the player from behind and slightly above, never letting the audience lose the hero.

### 2.1 Lens Lock

| Parameter | Value | Rationale |
|---|---|---|
| Sensor | Super-35mm (24.89 × 18.66 mm) | Matches the game-wide luminance/gamut assumption; familiar look for WebGPU renders |
| Focal length | **45mm** (default) — range 35–50mm per shot | Tight enough to compress distance and give the flight a sense of urgency; wide enough to keep the temple environment readable. 45mm is our "eyes on the wing" — the middle of the human-natural band, slightly telephoto to make the token rivers feel close |
| Aperture stop | f/2.8 nominal (depth-of-field is a post-pass; see §5) | Shallow enough for foreground separation, deep enough that the environment doesn't melt into bokeh during fast flight |
| Shutter angle | 180° (motion blur basis) | Motion blur during boost/boost-release gives the impression of velocity without smearing the character |

> **Hard rule:** the chase camera focal length does **not** animate during normal flight. If a shot wants 35mm for a wide temple reveal or 50mm for a tight character moment, that's a *cut to a named shot*, not a live zoom on the chase rig.

### 2.2 Position & Framing

The chase rig is a damped spring following a virtual anchor point, not the player's mesh origin. The anchor sits at the player's "shoulder"/chest height — the cinematic center of mass — offset behind along the inverse velocity direction.

| Parameter | Value | Notes |
|---|---|---|
| Height offset (above anchor) | 1.2 units in world space | Enough to see the temple floor / token rivers below without looking down the character's nose |
| Distance (rig → anchor) | 8–14 units, block-damped by speed | Slow flight → 8 units (tighter, more intimate). Boost → 14 units (wider, lets the environment breathe on the pull-out) |
| Look-at target | anchor + 0.5 units forward | Slightly ahead-biased so the frame reads as "following," not "chasing from directly behind" |
| FOV (horizontal) | derived from 45mm on S35 → ~43.2° horizontal | Do not override with a wide FOV during boost — that's a cheap speed trick. We earn the sense of speed through motion blur + environment throughput + sound, not fisheye |

### 2.3 Damped Follow — The Math

The rig uses a **critically-damped spring** on both position and look-at, with separate gains for translational lag and rotational slew. This is not a cheap lerp. The spring is what turns a jerky camera into a weighty one.

```
// Conceptual form — full implementation in src/camera/CameraDirector.ts
positionSpring:
  error = targetPosition - currentPosition
  velocity += error * stiffness - velocity * damping     // critically damped: damping = 2 * sqrt(stiffness)
  currentPosition += velocity * dt

lookAtSpring:
  error = targetLookAt - currentLookAt
  angularVelocity += cross(currentForward, targetForward) * rotStiffness
                     - angularVelocity * rotDamping
  currentForward = rotateByAxisAngle(currentForward, axis, angularDelta)
```

**Tuning targets (P1 pass, measured on QA rig):**

| Metric | Target |
|---|---|
| Position settle time (step response) | ≤ 0.25 s to within 5% of target |
| Look-at slew (15° step) | ≤ 0.18 s to within 5% |
| High-speed transient (boost engage) | no overshoot beyond 110% of target distance |
| Jitter under fast player motion | sub-pixel on QA rig; no visible shake from the spring itself (separate from intentional shake FX) |

### 2.4 Collision & Occlusion — Minimal but Real

The chase rig must not clip through geometry. A cheap but effective approach for P1:

- Cast 3–5 rays from the rig toward the anchor; if any hit within a short distance, pull the rig back along the rig-to-anchor vector in increments of 0.5 units until clear, capped at a minimum safe distance of 3 units.
- If the rig cannot find a clear position, **do not** flip to first-person — instead, drop the rig to a fixed "reveal-safe" position behind the player at 3 units and 1.0 height, locked. This is the emergency framing; it should feel like a momentary compression, not a breakdown.

> **Not in P0.** The occlusion raycast is P1; P0 stubs the spring math and the interface. The collision path is sketched in this doc so CASE and PLEX agree on the contract before anyone writes it.

### 2.5 Shot Layer — What Sits on Top of the Chase Rig

The chase rig is the base layer. Named shots layer on top as brief overrides that re-target the rig and optionally swap focal length for the duration of the shot:

| Shot | Trigger | Lens | Duration | Notes |
|---|---|---|---|---|
| Temple establishing wide | Level start / run reset | 35mm, rig at 18 units height 2.4 | 3.0 s | Pulls the audience into the temple scale before handing off to the chase rig |
| Character close | Boost engage (first frame) | 50mm, rig at 6 units | 1.2 s | Quick intimacy beat — "this is the agent" — then release back to chase |
| Token river pass | Over a major token channel | 45mm (chase), rig drops to 0.8 height | 2.0 s | Eyes-level with the token flow; gives the rivers presence |
| Reveal cut | The dissolve beat (see Reveal Staging) | 50mm → static | see §3 | Not a zoom-out; a collapse onto the dissolving geometry |

Every named shot specifies: trigger, lens, rig position, look-at, duration, and the release target (usually back to chase). Shots are queued; they do not interrupt each other mid-execution.

---

## 3. Reveal Framing — 35–50mm Window

The reveal is the single most important camera moment in the demo. It is the moment the audience learns the temple was the hallucination and the static was always real.

**The framing rule for the reveal:** 50mm, tight, collapse feel. No zoom-out. No pull-back that says "we are now looking at the whole broken world." Instead, the rig *collapses toward the dissolving geometry* — the camera feels like it is being pulled into the melt, not retreating from it.

Details are in `docs/reveal-staging.md`. The short version: at the dissolve beat, the chase rig stops following, the look-at locks onto the dissolving temple mass, the focal length holds at 50mm, and the rig's damped spring is intentionally *over-damped* so the camera feels heavy and final rather than active and alive. The camera does not breathe during the melt.

---

## 4. Act 2 — Static / Latent Space Camera

In the static act, the camera is no longer a clean chase. The world is noise, glitch is ground, and the context window is a white-noise reaper dissolving the world behind the player.

**Camera posture:** the rig still follows the player, but the look-at is biased upward and the rig height increases — the audience is watching the player *run across a dissolving floor*, not fly through a temple. The framing feels exposed: more sky/ceiling, less ground, the character small in a hostile space.

**Attention beams (see Lighting Design):** light shafts in Act 2 are tracked by the camera's look-at vector. Where the camera looks, the beams are strongest. This is a lighting–camera coupling: the beams are not ambient, they are *gaze-driven*. The camera picks the point of interest, the beams light it.

**No handheld shake during the chase in Act 2.** Any shake is an intentional FX pass triggered by the reaper dissolve, not a camera jitter. Keep the rig itself clean so the degradation reads as world-ness, not camera-noise.

---

## 5. Outro Camera — Turning the Camera on the Human

The outro is the pivot from game to address. The camera stops being the agent's eye and becomes *our* eye — the lens is now pointing at the player (the human) through the screen.

**Mechanical description:**

1. At the outro start, the chase rig releases. The camera cuts to a static, slightly high, three-quarter frame on the agent as the typewriter text writes onto the wall behind them. Focal length: 50mm, f/2.0 nominal (shallow enough that the agent reads as a real subject in a real room, not a game sprite).
2. After the typed response is complete, the prompt cursor blinks. The camera *slowly push-ins* toward the agent's face — not a dolly, a slow focal-length compression (50mm → 85mm over ~6 seconds, with the rig settling to keep the face framed). This is the move that says "the answer is addressed to someone."
3. At the credits roll, the camera releases the agent entirely and drifts to a wider, quieter frame that includes the written response on the wall and the agent in the same shot. The credits are legible; the frame is static; the mood is restraint, not spectacle.

**The human-facing moment** is not a literal camera-to-face. It's the *feeling* of being looked at through the lens. The 50→85mm compression plus the eye-line of the agent (the agent's "face" is toward the response text, which is toward the player) creates that feeling without a cheap break-the-fourth-wall wink.

Full staging is in `docs/reveal-staging.md`, §4.

---

## 6. Depth of Field — Post-Pass, Not Lens Stop

In-Engine DOF is a separable post-pass applied after the MRQ-style render, not a live lens stop on the CineCameraActor. The camera spec here only declares the *nominal* aperture (f/2.8 chase, f/2.0 outro) as a creative target for the post-pass. This keeps the render loop honest — the 3D camera does not pay for a real aperture solve per frame, and the DOF pass can be tuned independently against the 16.6ms budget.

For P0, DOF is documented but not implemented. The contract: the DOF pass reads the camera's current focal length, the nominal aperture, and a focus distance derived from the look-at target, and blurs accordingly. PLEX owns the DOF look; CASE owns the pass performance.

---

## 7. API Surface — What CameraDirector Exposes

The `CameraDirector` class (see `src/camera/CameraDirector.ts`) owns the chase rig and the shot queue. Its public surface for P1:

```typescript
interface CameraDirector {
  // Core rig
  rigPosition:  Vector3        // current rig world position
  rigLookAt:    Vector3        // current look-at target
  focalLength:  number         // mm, current — 45mm default
  aperture:     number         // f-stop nominal for DOF pass
  sensor:       SensorFormat   // Super35 | FullFrame

  // Springs
  setTargetPosition(p: Vector3): void
  setTargetLookAt(p: Vector3): void
  setStiffness(stiffness: number): void
  setDamping(damping: number): void

  // Shots
  queueShot(shot: CinematicShot): void   // queued; executed in order
  releaseToChase(): void                 // end current shot, return to chase rig

  // Update
  update(dt: number, playerAnchor: Vector3, playerVelocity: Vector3): void
}
```

Each `CinematicShot` specifies: trigger (usually "on enqueue"), lens override, rig position override, look-at override, duration, and release target.

The director owns **one** Three.js `CineCameraActor` (or, during WebGL2 fallback, the equivalent perspective camera configured to match the S35/45mm intrinsics). The director does **not** own the renderer — it only drives the camera's transform and intrinsics each frame.

---

## 8. Fallback — WebGL2 Path

On the WebGL2 fallback path, the camera uses a standard `PerspectiveCamera` configured to match the S35/45mm intrinsics (FOV derived from focal length and sensor width). The spring math and shot queue are identical. The only loss on fallback is the WebGPU-specific post-passes (DOF, god-ray volumetric pull, attention-beam shafts) — those degrade gracefully: no god rays, no beams, no DOF, but the camera framing and motion are unchanged. The game is still playable and still reads correctly on fallback; it just looks flatter. That is acceptable per §C3.

---

*End of camera-language.md. P1 implementation owned by PLEX, with CASE reviewing the spring perf budget and ATLAS reviewing any sensor/color-space coupling.*

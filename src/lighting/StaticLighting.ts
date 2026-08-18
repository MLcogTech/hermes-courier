// StaticLighting — P1 implementation of lighting-design.md §4 (Act 2 — Static / Latent Space).
//
// Lighting story (from PLEX's spec):
//  - ONE key: cold, harsh, overhead directional at 8000K.
//  - NO fill — high contrast; shadows are cold and hard.
//  - Rim: the key does double duty — grazing the character from above-back.
//  - Flicker: irregular intensity modulation on the cold key. The visual signature
//    of the static act — the world is failing.
//  - Attention beams: 9000–10000K cold volumetric shafts, gaze-driven. Where the
//    camera looks, the brightest shaft is there.
//
// Three.js mapping:
//  - Key: THREE.DirectionalLight at 8000K, overhead (±10°), flicker implemented
//    as a per-frame intensity modulation on the light itself (single float multiply,
//    not a separate pass — CASE's budget constraint from lighting-design.md §7.1).
//  - Attention beams: 2–4 semi-transparent cone meshes at a time. Each beam has a
//    slow drift, a lifetime (4–8s), and an intensity modulated by the camera's
//    look-at vector (gaze coupling). P2 CASE replaces with proper in-scattering.
//  - Fog: cold exponential fog matching the 8000K key color.
//
// Hard rule (from lighting-design.md §3.2):
//  No warm residual after the dissolve. Once the dissolve is done, the space is
//  fully cold. If a screenshot shows warm light in the environment, the transition
//  is wrong and the gate fails.

import * as THREE from 'three';

// ── Planckian-to-RGB approximations (creative intent → sRGB) ──────────────────

/** 8000K — cold daylight / overcast sky bounce. Cold white with blue cast. */
const KELVIN_8000K_RGB = new THREE.Color(0.85, 0.9, 1.0);

/** 9000K–10000K — attention beam color. Colder than the ambient key. */
const KELVIN_ATTENTION_BEAM_RGB = new THREE.Color(0.7, 0.8, 1.0);

// ── Flicker parameters (from lighting-design.md §4.2) ──────────────────────────

const FLICKER_MIN_INTENSITY = 0.4; // floor — light never goes fully dark
const FLICKER_MAX_INTENSITY = 1.0; // ceiling — recovers fully sometimes
const FLICKER_DIP_DURATION_MIN = 0.3; // seconds
const FLICKER_DIP_DURATION_MAX = 0.7; // seconds
const FLICKER_DIP_DEPTH_MIN = 0.3; // 30% drop
const FLICKER_DIP_DEPTH_MAX = 0.6; // 60% drop
const FLICKER_COOL_SHIFT_KELVIN = 10000; // on deep dip (>45%), shift toward 10000K

// ── Attention beam parameters (from lighting-design.md §4.3) ───────────────────

const MAX_ACTIVE_BEAMS = 4;
const MIN_ACTIVE_BEAMS = 2;
const BEAM_LIFETIME_MIN = 4; // seconds
const BEAM_LIFETIME_MAX = 8; // seconds
const BEAM_DRIFT_SPEED = 0.5; // units/sec — slow drift in position
const BEAM_LOOKAT_FULL_INTENSITY = 1.0; // beam near look-at vector
const BEAM_LOOKAT_FAR_INTENSITY = 0.5; // beam far from look-at vector (40–60% band)
const BEAM_OPACITY = 0.10; // subtle — shafts are light, not fog

// ── Cold key direction (from lighting-design.md §4.1) ──────────────────────────
// From directly above (or near-above, ±10°).

const COLD_KEY_DIRECTION = new THREE.Vector3(0, -1, 0).normalize();
// Slightly off-vertical for shadow depth: ±10°.
const COLD_KEY_OFFSET = new THREE.Vector3(0.17, -0.98, 0.17).normalize();

// ── Flicker state ──────────────────────────────────────────────────────────────

interface FlickerState {
  dipActive: boolean;
  dipDuration: number;
  dipDepth: number;
  dipStartTime: number;
  nextDipTime: number;
  colorShiftActive: boolean;
}

// ── Beam state ─────────────────────────────────────────────────────────────────

interface BeamState {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  lifetime: number;
  age: number;
  driftPhase: number;
  /** Current intensity [0, 1] — gaze-modulated + drift. */
  currentIntensity: number;
}

// ── Public API ──────────────────────────────────────────────────────────────────

export class StaticLighting {
  private scene: THREE.Scene;
  private key: THREE.DirectionalLight;
  private keyColor: THREE.Color;
  private flickerState: FlickerState;
  private beams: BeamState[] = [];
  private beamMaterial: THREE.MeshBasicMaterial | null = null;
  private _enabled = true;

  /** The cold key's base intensity (before flicker modulation). */
  readonly baseIntensity: number = 0.9;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.keyColor = KELVIN_8000K_RGB.clone();

    // ── Key: cold, harsh, overhead at 8000K ──────────────────────────────────
    this.key = new THREE.DirectionalLight(this.keyColor.clone(), this.baseIntensity);
    this.key.position.set(0, 8, 0); // overhead
    this.key.target.position.set(0, 0, 0);
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    // ── Fog: cold exponential fog ──────────────────────────────────────────────
    this.scene.fog = new THREE.FogExp2(
      KELVIN_8000K_RGB.clone().multiplyScalar(0.5),
      0.04,
    );

    // ── Background: cold, dark ─────────────────────────────────────────────────
    this.scene.background = new THREE.Color(KELVIN_8000K_RGB.clone().multiplyScalar(0.08));

    // ── Attention beam material ────────────────────────────────────────────────
    this.beamMaterial = new THREE.MeshBasicMaterial({
      color: KELVIN_ATTENTION_BEAM_RGB.clone(),
      transparent: true,
      opacity: BEAM_OPACITY,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, // beams read as light, not geometry
    });

    // Seed initial flicker state.
    this.flickerState = this.initFlickerState(0);

    // Seed initial beams (2–4 active).
    for (let i = 0; i < MIN_ACTIVE_BEAMS; i++) {
      this.spawnBeam(this.randomBeamPosition(), this.randomBeamDirection());
    }
  }

  get enabled(): boolean {
    return this._enabled;
  }

  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.key.intensity = enabled ? this.baseIntensity : 0;
    // Fading beams on disable is acceptable — they're part of the static act.
    for (const beam of this.beams) {
      beam.mesh.visible = enabled;
    }
  }

  /**
   * Update the flicker and beams each frame.
   *
   * @param dt          Fixed step in seconds.
   * @param lookAt      Camera's current look-at vector (world space) — drives
   *                    gaze coupling for attention beams.
   * @param lookAtPos   Camera's look-at target position in world space.
   */
  update(dt: number, lookAt: THREE.Vector3, lookAtPos: THREE.Vector3): void {
    // Update flicker.
    this.updateFlicker(dt);

    // Update beams.
    this.updateBeams(dt, lookAt, lookAtPos);

    // Respawn dead beams.
    this.respawnDeadBeams();
  }

  // ── Flicker (lighting-design.md §4.2) ────────────────────────────────────────

  /**
   * Per-frame flicker update. The flicker is a per-frame intensity modulation on
   * the cold key — a single float multiply, not a separate light update pass.
   *
   * On a deep dip (>45% intensity drop), the light shifts slightly cooler
   * (toward 10000K). The cold gets colder at the worst moments.
   */
  private updateFlicker(dt: number): void {
    const now = performance.now() * 0.001; // seconds

    // If a dip is active, advance it.
    if (this.flickerState.dipActive) {
      const elapsed = now - this.flickerState.dipStartTime;
      if (elapsed >= this.flickerState.dipDuration) {
        // Dip complete — recover. Recovery is unreliable: sometimes to 1.0,
        // sometimes to 0.8.
        const recovery = Math.random() < 0.5 ? 1.0 : 0.8;
        this.key.intensity = this.baseIntensity * recovery;
        this.flickerState.dipActive = false;
        this.flickerState.colorShiftActive = false;
        this.keyColor.copy(KELVIN_8000K_RGB);
        this.key.color.copy(this.keyColor);
      } else {
        // During dip — intensity is reduced by dipDepth.
        const currentIntensity = this.baseIntensity * (1 - this.flickerState.dipDepth);
        this.key.intensity = currentIntensity;

        // On deep dip (>45% drop), shift color toward 10000K.
        if (this.flickerState.dipDepth > 0.45 && !this.flickerState.colorShiftActive) {
          this.flickerState.colorShiftActive = true;
          // Blend toward 10000K.
          const coldColor = new THREE.Color(0.7, 0.8, 1.0);
          this.keyColor.lerp(coldColor, 0.5);
          this.key.color.copy(this.keyColor);
        }
      }
      return;
    }

    // No dip active — schedule the next one.
    if (now >= this.flickerState.nextDipTime) {
      this.startDip(now);
    } else {
      // Between dips — intensity recovers to base (or slightly below).
      // The recovery is unreliable.
      this.key.intensity = this.baseIntensity * (0.9 + Math.random() * 0.1);
    }
  }

  private initFlickerState(now: number): FlickerState {
    return {
      dipActive: false,
      dipDuration: 0,
      dipDepth: 0,
      dipStartTime: 0,
      nextDipTime: now + this.randomInterval(),
      colorShiftActive: false,
    };
  }

  private randomInterval(): number {
    // Random interval between dips: 0.3–0.7 seconds of clear time.
    return FLICKER_DIP_DURATION_MIN + Math.random() * (FLICKER_DIP_DURATION_MAX - FLICKER_DIP_DURATION_MIN);
  }

  private startDip(now: number): void {
    this.flickerState.dipActive = true;
    this.flickerState.dipDuration = FLICKER_DIP_DURATION_MIN +
      Math.random() * (FLICKER_DIP_DURATION_MAX - FLICKER_DIP_DURATION_MIN);
    this.flickerState.dipDepth = FLICKER_DIP_DEPTH_MIN +
      Math.random() * (FLICKER_DIP_DEPTH_MAX - FLICKER_DIP_DEPTH_MIN);
    this.flickerState.dipStartTime = now;
    this.flickerState.colorShiftActive = false;
    this.flickerState.nextDipTime = now + this.flickerState.dipDuration +
      this.randomInterval();

    // Apply the dip immediately.
    this.key.intensity = this.baseIntensity * (1 - this.flickerState.dipDepth);
  }

  // ── Attention beams (lighting-design.md §4.3) ────────────────────────────────

  /**
   * Spawn a new attention beam at a random position within the scene volume.
   * Beams are transient — they mark a moment of attention, not a permanent structure.
   */
  private spawnBeam(position: THREE.Vector3, direction: THREE.Vector3): BeamState {
    const coneLength = 3 + Math.random() * 2; // 3–5 units
    const coneAngle = 0.08 + Math.random() * 0.06; // narrow beam
    const geo = new THREE.ConeGeometry(coneAngle * coneLength, coneLength, 8, 1, true);
    const mesh = new THREE.Mesh(geo, this.beamMaterial!.clone());
    mesh.position.copy(position);

    // Orient along direction.
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quat);
    mesh.visible = this._enabled;

    this.scene.add(mesh);

    const beam: BeamState = {
      mesh,
      position: position.clone(),
      direction: direction.clone(),
      lifetime: BEAM_LIFETIME_MIN + Math.random() * (BEAM_LIFETIME_MAX - BEAM_LIFETIME_MIN),
      age: 0,
      driftPhase: Math.random() * Math.PI * 2,
      currentIntensity: 0.5 + Math.random() * 0.3,
    };

    this.beams.push(beam);
    return beam;
  }

  private randomBeamPosition(): THREE.Vector3 {
    // Beams originate from below/within the volume, not from a fixed window.
    return new THREE.Vector3(
      (Math.random() - 0.5) * 10, // ±5 units laterally
      Math.random() * 4, // 0–4 units up (below the ceiling)
      (Math.random() - 0.5) * 10, // ±5 units depth
    );
  }

  private randomBeamDirection(): THREE.Vector3 {
    // Beams drift upward and outward — they're volumetric shafts rising from below.
    return new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      1,
      (Math.random() - 0.5) * 0.3,
    ).normalize();
  }

  private updateBeams(dt: number, lookAt: THREE.Vector3, lookAtPos: THREE.Vector3): void {
    // Compute gaze coupling: beams near the look-at vector are brighter.
    // The look-at direction is from the camera position to the look-at target.
    const lookDir = new THREE.Vector3().copy(lookAt).normalize();

    for (const beam of this.beams) {
      beam.age += dt;

      // Drift: slow positional drift + intensity oscillation.
      beam.driftPhase += dt * BEAM_DRIFT_SPEED;
      const driftOffset = new THREE.Vector3(
        Math.sin(beam.driftPhase) * 0.1,
        Math.cos(beam.driftPhase * 0.7) * 0.05,
        Math.sin(beam.driftPhase * 0.5) * 0.1,
      );
      beam.position.add(driftOffset);
      beam.mesh.position.copy(beam.position);

      // Gaze coupling: compute angle between beam direction and look-at direction.
      const beamDir = beam.direction;
      const angle = lookDir.angleTo(beamDir);
      // Near look-at → full intensity. Far → 40–60%.
      const intensityFactor = Math.max(
        BEAM_LOOKAT_FAR_INTENSITY,
        1 - (angle / (Math.PI / 2)),
      );
      // Clamp to the 40–60% band for far beams.
      const gazedIntensity = intensityFactor > 0.7
        ? BEAM_LOOKAT_FULL_INTENSITY
        : BEAM_LOOKAT_FAR_INTENSITY + (intensityFactor - 0.5) * 0.2;

      // Combine gaze coupling with a slow intensity oscillation (drift).
      const oscillation = 0.85 + 0.15 * Math.sin(beam.driftPhase * 2);
      beam.currentIntensity = gazedIntensity * oscillation;

      // Apply to mesh opacity — material may be an array (multi-material meshes).
      const mats = beam.mesh.material;
      if (Array.isArray(mats)) {
        for (const m of mats) {
          if (m && typeof (m as THREE.Material).opacity !== 'undefined') {
            (m as THREE.Material).opacity = BEAM_OPACITY * beam.currentIntensity;
          }
        }
      } else if (mats) {
        (mats as THREE.Material).opacity = BEAM_OPACITY * beam.currentIntensity;
      }
    }
  }

  private respawnDeadBeams(): void {
    // Remove expired beams.
    this.beams = this.beams.filter((beam) => beam.age < beam.lifetime);

    // Ensure we have at least MIN_ACTIVE_BEAMS and at most MAX_ACTIVE_BEAMS.
    while (this.beams.length < MIN_ACTIVE_BEAMS) {
      this.spawnBeam(this.randomBeamPosition(), this.randomBeamDirection());
    }
    while (this.beams.length > MAX_ACTIVE_BEAMS) {
      const expired = this.beams.shift();
      if (expired) {
        this.scene.remove(expired.mesh);
        expired.mesh.geometry.dispose();
        const mats = expired.mesh.material;
        if (Array.isArray(mats)) {
          for (const m of mats) {
            if (m) (m as THREE.Material).dispose();
          }
        } else if (mats) {
          (mats as THREE.Material).dispose();
        }
      }
    }
  }

  // ── Transition helpers ───────────────────────────────────────────────────────

  /**
   * Begin the static act. Called when the transition completes (t=0:50).
   * At this point the temple is gone, the static key is at full 8000K,
   * and attention beams are live.
   *
   * This is a hard cut — no warm residual. If a screenshot shows warm light
   * after this is called, the transition is wrong.
   */
  beginStatic(): void {
    this._enabled = true;
    this.key.intensity = this.baseIntensity;
    this.keyColor.copy(KELVIN_8000K_RGB);
    this.key.color.copy(this.keyColor);
    this.flickerState = this.initFlickerState(performance.now() * 0.001);

    // Spawn initial beams for the static act.
    while (this.beams.length < MIN_ACTIVE_BEAMS) {
      this.spawnBeam(this.randomBeamPosition(), this.randomBeamDirection());
    }
  }

  /** Dispose of all created resources. */
  dispose(): void {
    this.scene.remove(this.key);
    this.scene.remove(this.key.target);
    for (const beam of this.beams) {
      this.scene.remove(beam.mesh);
      beam.mesh.geometry.dispose();
      const mats = beam.mesh.material;
      if (Array.isArray(mats)) {
        for (const m of mats) {
          if (m) (m as THREE.Material).dispose();
        }
      } else if (mats) {
        (mats as THREE.Material).dispose();
      }
    }
    this.beams.length = 0;
    this.beamMaterial = null;
  }
}

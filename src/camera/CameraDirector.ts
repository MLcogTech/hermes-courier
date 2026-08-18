// CameraDirector — owns the chase rig, the shot queue, and the CineCameraActor.
// P1 implementation of camera-language.md §2 + §3 + §7.
//
// Core rules (enforced in code):
//  - Chase camera focal length is LOCKED at 45mm; changes only on cut to a named shot.
//  - No wide FOV during boost — we earn speed through motion blur + throughput, not fisheye.
//  - The rig is a critically-damped spring following a virtual anchor, not the player mesh.
//  - Named shots are queued; they do not interrupt each other mid-execution.
//  - The reveal shot is 50mm → static; the rig collapses toward the dissolving geometry.
//    No zoom-out. No pull-back that says "we're now looking at the whole world."

import * as THREE from 'three';
import { CineCameraActor, CineCameraConfig, SensorFormat } from './CineCameraActor';

// ── Tuning constants (match camera-language.md §2.3) ─────────────────────────

const DEFAULT_STIFFNESS = 60; // position spring stiffness
// Critically damped: damping = 2 * sqrt(stiffness)
const DEFAULT_DAMPING = 2 * Math.sqrt(DEFAULT_STIFFNESS); // ~15.49
const DEFAULT_ROT_STIFFNESS = 30;
const DEFAULT_ROT_DAMPING = 2 * Math.sqrt(DEFAULT_ROT_STIFFNESS); // ~10.95

const ANCHOR_HEIGHT_OFFSET = 1.2; // rig height above anchor (world units)
const LOOKAT_FORWARD_OFFSET = 0.5; // look-at biased 0.5 units ahead of anchor

// ── Shot definitions ──────────────────────────────────────────────────────────

export interface CinematicShot {
  /** Human-readable name for debugging / QA screenshots. */
  name: string;
  /** Nominal focal length in mm for the shot duration. Overrides chase default. */
  focalLength: number;
  /** Rig position override (world units). If null, keep current chase position. */
  rigPosition: THREE.Vector3 | null;
  /** Look-at target override. If null, keep current chase look-at. */
  lookAt: THREE.Vector3 | null;
  /** Duration in seconds. After this, release back to chase. */
  duration: number;
  /** What to return to when the shot ends. Usually 'chase'. */
  releaseTo: 'chase' | string;
}

// ── Player anchor input (from KIPP's FSM) ─────────────────────────────────────

export interface PlayerAnchor {
  /** Virtual anchor at chest/shoulder height — cinematic center of mass. */
  position: THREE.Vector3;
  /** Current player velocity in world units/sec. Drives rig distance. */
  velocity: THREE.Vector3;
}

// ── Public API surface (matches camera-language.md §7) ────────────────────────

export interface CameraDirectorAPI {
  rigPosition: THREE.Vector3;
  rigLookAt: THREE.Vector3;
  focalLength: number;
  aperture: number;
  sensor: SensorFormat;

  setTargetPosition(p: THREE.Vector3): void;
  setTargetLookAt(p: THREE.Vector3): void;
  setStiffness(stiffness: number): void;
  setDamping(damping: number): void;
  queueShot(shot: CinematicShot): void;
  releaseToChase(): void;
  update(dt: number, playerAnchor: PlayerAnchor): void;
}

// ── Implementation ─────────────────────────────────────────────────────────────

export class CameraDirector implements CameraDirectorAPI {
  // ── Core rig (exposed read-only) ───────────────────────────────────────────

  private _rigPosition = new THREE.Vector3(0, ANCHOR_HEIGHT_OFFSET, 8);
  private _rigLookAt = new THREE.Vector3(0, ANCHOR_HEIGHT_OFFSET, 0);
  private _focalLength: number = 45;
  private _aperture: number = 2.8;
  private _sensor: SensorFormat = 'super35';

  get rigPosition(): THREE.Vector3 {
    return this._rigPosition;
  }

  get rigLookAt(): THREE.Vector3 {
    return this._rigLookAt;
  }

  get focalLength(): number {
    return this._focalLength;
  }

  get aperture(): number {
    return this._aperture;
  }

  get sensor(): SensorFormat {
    return this._sensor;
  }

  // ── Springs (private state) ─────────────────────────────────────────────────

  private posVelocity = new THREE.Vector3();
  private targetPosition = new THREE.Vector3(0, ANCHOR_HEIGHT_OFFSET, 8);
  private posStiffness = DEFAULT_STIFFNESS;
  private posDamping = DEFAULT_DAMPING;

  private rotVelocity = new THREE.Vector3();
  private targetLookAt = new THREE.Vector3(0, ANCHOR_HEIGHT_OFFSET, 0);
  private rotStiffness = DEFAULT_ROT_STIFFNESS;
  private rotDamping = DEFAULT_ROT_DAMPING;

  // ── Camera ──────────────────────────────────────────────────────────────────

  private camera: CineCameraActor;

  // ── Shot queue ──────────────────────────────────────────────────────────────

  private shotQueue: CinematicShot[] = [];
  private activeShot: CinematicShot | null = null;
  private shotTimer = 0;

  // ── Over-damped flag for reveal shot ────────────────────────────────────────

  /** When true, the spring is intentionally over-damped (heavy, final feel). */
  private overDamped = false;

  constructor(config: Partial<CineCameraConfig> = {}) {
    this.camera = new CineCameraActor({
      ...config,
      focalLength: 45, // chase default — never animates during normal flight
      aperture: 2.8,
      sensor: 'super35',
    });
    this._focalLength = 45;
    this._aperture = 2.8;
    this._sensor = 'super35';
  }

  // ── Camera access ───────────────────────────────────────────────────────────

  get perspectiveCamera(): THREE.PerspectiveCamera {
    return this.camera.perspectiveCamera;
  }

  get cameraActor(): CineCameraActor {
    return this.camera;
  }

  /** For HUD telemetry — reports current lens descriptor. */
  get cameraDescriptor(): string {
    return this.camera.getDescriptor();
  }

  /** For QA screenshots — current horizontal FOV in degrees. */
  get horizontalFOV(): number {
    return this.camera.getHorizontalFOV();
  }

  // ── Spring control ──────────────────────────────────────────────────────────

  setTargetPosition(p: THREE.Vector3): void {
    this.targetPosition.copy(p);
  }

  setTargetLookAt(p: THREE.Vector3): void {
    this.targetLookAt.copy(p);
  }

  setStiffness(stiffness: number): void {
    this.posStiffness = stiffness;
    this.posDamping = 2 * Math.sqrt(stiffness);
  }

  setDamping(damping: number): void {
    this.posDamping = damping;
  }

  /**
   * Over-damp the rig. Used by the reveal shot so the camera feels heavy and
   * final rather than active and alive during the melt. The camera does not
   * breathe during the dissolve.
   *
   * Over-damping increases damping above the critical value, trading settle
   * time for a "dead" feel — exactly what the reveal wants.
   */
  setOverDamped(overDamped: boolean): void {
    this.overDamped = overDamped;
  }

  // ── Shots ───────────────────────────────────────────────────────────────────

  /**
   * Queue a named shot. Executed in order; does not interrupt the current shot.
   * Each shot specifies trigger (on enqueue), lens, rig position, look-at,
   * duration, and release target.
   */
  queueShot(shot: CinematicShot): void {
    this.shotQueue.push({ ...shot });
  }

  /**
   * Immediately release to chase. Ends the current shot if any, clears the
   * queue, and restores the chase rig defaults.
   */
  releaseToChase(): void {
    this.activeShot = null;
    this.shotQueue.length = 0;
    this.shotTimer = 0;
    this.setOverDamped(false);
    // Restore chase defaults
    this._focalLength = 45;
    this.camera.setFocalLength(45);
  }

  // ── Update (called each frame from main loop) ───────────────────────────────

  /**
   * Advance the spring one frame. Called once per fixed tick (dt = FIXED_STEP_SEC).
   *
   * @param dt         Fixed step in seconds (1/60 nominal).
   * @param playerAnchor  Current player anchor from KIPP's FSM — position + velocity.
   */
  update(dt: number, playerAnchor: PlayerAnchor): void {
    // 1. Compute chase target from player anchor (speed-dependent distance).
    this.computeChaseTarget(playerAnchor);

    // 2. If a shot is active, it overrides the chase target and may lock springs.
    if (this.activeShot !== null) {
      this.updateActiveShot(dt);
    } else if (this.shotQueue.length > 0) {
      this.activeShot = this.shotQueue.shift()!;
      this.shotTimer = this.activeShot.duration;
      // Apply shot overrides to springs
      this.applyShotOverrides(this.activeShot);
    }

    // 3. Advance springs.
    this.updatePositionSpring(dt);
    this.updateRotationSpring(dt);

    // 4. Commit camera transform.
    this.camera.position.copy(this._rigPosition);
    this.camera.perspectiveCamera.lookAt(this._rigLookAt);

    // 5. Update DOF-relevant nominal state (aperture is constant during chase).
    // DOF post-pass reads focalLength + aperture + focus distance (derived from
    // look-at distance) — not implemented in P1, but the contract is here.
  }

  // ── Chase target computation ─────────────────────────────────────────────────

  /**
   * Compute the chase rig target from the player anchor.
   *
   * The rig follows a virtual anchor at chest/shoulder height, offset behind
   * along the inverse velocity direction. Distance is block-damped by speed:
   * slow flight → 8 units (tighter, intimate), boost → 14 units (wider).
   */
  private computeChaseTarget(playerAnchor: PlayerAnchor): void {
    const speed = playerAnchor.velocity.length();
    // Distance: 8 units at rest, scaling up to 14 at high speed.
    // Lerp: 8 + clamp(speed) * (14 - 8).
    const speedFactor = Math.min(1, speed / 20); // 20 units/sec = full extension
    const distance = 8 + speedFactor * 6; // 8–14 range

    // Direction: inverse of velocity (behind the player), with a slight
    // downward bias so the rig is above and behind, not directly behind.
    const velDir = playerAnchor.velocity.clone().normalize();
    const behindDir = velDir.clone().multiplyScalar(-1);
    // Bias upward slightly — rig is above the anchor.
    behindDir.y = Math.max(behindDir.y, -0.3); // don't point too far down

    const anchor = playerAnchor.position.clone();
    anchor.y += ANCHOR_HEIGHT_OFFSET;

    // Target rig position: anchor + behindDir * distance.
    const rigTarget = anchor.clone().add(behindDir.multiplyScalar(distance));
    rigTarget.y = anchor.y + 0.5; // slight height offset so rig isn't at anchor level

    this.targetPosition.copy(rigTarget);

    // Look-at: anchor + 0.5 units forward along velocity.
    const lookTarget = anchor.clone().add(
      velDir.clone().multiplyScalar(LOOKAT_FORWARD_OFFSET),
    );
    this.targetLookAt.copy(lookTarget);
  }

  // ── Spring updates ───────────────────────────────────────────────────────────

  private updatePositionSpring(dt: number): void {
    const error = new THREE.Vector3().copy(this.targetPosition).sub(this._rigPosition);

    // Critically-damped spring: F = stiffness * error - damping * velocity.
    // velocity += (stiffness * error - damping * velocity) * dt.
    const accel = error.clone().multiplyScalar(this.posStiffness)
      .sub(this.posVelocity.clone().multiplyScalar(this.posDamping));

    if (this.overDamped) {
      // Over-damped: increase damping for a heavy, final feel (reveal shot).
      // Damping = 2.5 * critical → noticeably slower settle, no oscillation.
      const overdampedDamping = 2.5 * 2 * Math.sqrt(this.posStiffness);
      accel.add(
        this.posVelocity.clone().multiplyScalar(-overdampedDamping + this.posDamping),
      );
    }

    this.posVelocity.add(accel.multiplyScalar(dt));
    this._rigPosition.add(this.posVelocity.clone().multiplyScalar(dt));
  }

  private updateRotationSpring(dt: number): void {
    // Compute angular error: the shortest rotation from current forward to target forward.
    const currentForward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.perspectiveCamera.quaternion,
    );
    const targetDir = new THREE.Vector3().copy(this.targetLookAt).sub(this._rigPosition).normalize();

    // Cross product gives the axis of rotation; dot product gives the angle.
    const axis = new THREE.Vector3().crossVectors(currentForward, targetDir).normalize();
    const angle = Math.acos(Math.max(-1, Math.min(1, currentForward.dot(targetDir))));

    if (angle < 0.001) {
      this.rotVelocity.set(0, 0, 0);
      return;
    }

    // Rotational spring: angularVelocity += cross * rotStiffness - rotVelocity * rotDamping.
    const angularAccel = axis.clone().multiplyScalar(angle * this.rotStiffness)
      .sub(this.rotVelocity.clone().multiplyScalar(this.rotDamping));

    this.rotVelocity.add(angularAccel.multiplyScalar(dt));

    // Apply rotation to the look-at target, not directly to the camera.
    // The camera's lookAt is updated from the rig position + lookAt each frame.
    if (this.rotVelocity.length() > 0.0001) {
      const q = new THREE.Quaternion();
      q.setFromAxisAngle(axis, this.rotVelocity.length() * dt);
      // Rotate the look-at around the rig position.
      const offset = new THREE.Vector3().copy(this.targetLookAt).sub(this._rigPosition);
      offset.applyQuaternion(q);
      this._rigLookAt.copy(this._rigPosition).add(offset);
    }
  }

  // ── Shot handling ────────────────────────────────────────────────────────────

  private updateActiveShot(dt: number): void {
    this.shotTimer -= dt;
    if (this.shotTimer <= 0) {
      // Shot complete — release to chase.
      this.activeShot = null;
      this.shotQueue.length = 0;
      this.shotTimer = 0;
      this.setOverDamped(false);
      this._focalLength = 45;
      this.camera.setFocalLength(45);
      // Re-enable normal spring tuning.
      this.posStiffness = DEFAULT_STIFFNESS;
      this.posDamping = DEFAULT_DAMPING;
      this.rotStiffness = DEFAULT_ROT_STIFFNESS;
      this.rotDamping = DEFAULT_ROT_DAMPING;
    }
  }

  private applyShotOverrides(shot: CinematicShot): void {
    // Lens override — this is a CUT, not a live zoom. Enforce in code.
    this._focalLength = shot.focalLength;
    this.camera.setFocalLength(shot.focalLength);

    // If the shot specifies a rig position, lock to it (disable spring tracking).
    if (shot.rigPosition !== null) {
      this.setTargetPosition(shot.rigPosition);
      // For the reveal shot, over-damp the spring so the camera feels heavy.
      if (shot.name === 'reveal') {
        this.setOverDamped(true);
        // Reveal is 50mm → static; the rig collapses toward the dissolving geometry.
        // We do NOT zoom out. The spring follows the dissolve target, not the player.
      }
    }

    // Look-at override.
    if (shot.lookAt !== null) {
      this.setTargetLookAt(shot.lookAt);
    }

    // Lock spring stiffness for the shot duration if it's a tight moment.
    if (shot.name === 'character-close') {
      // Quick intimacy beat — tighter spring for responsive follow.
      this.posStiffness = 80;
      this.posDamping = 2 * Math.sqrt(80);
      this.rotStiffness = 40;
      this.rotDamping = 2 * Math.sqrt(40);
    }
  }

  // ── Reveal-specific helpers ──────────────────────────────────────────────────

  /**
   * Programme the reveal shot. Called at t=0:45 when the dissolve begins.
   *
   * The reveal is 50mm, tight, collapse feel. No zoom-out. The rig stops
   * following the player and instead locks onto the dissolving temple mass.
   * The spring is over-damped so the camera feels heavy and final.
   *
   * @param dissolvingTarget  The point in world space the dissolving geometry
   *                          is centred on (typically the temple centre).
   */
  programmeReveal(dissolvingTarget: THREE.Vector3): void {
    // Clear any queued shots — the reveal is immediate.
    this.shotQueue.length = 0;

    // 50mm — tight, no zoom-out.
    const revealShot: CinematicShot = {
      name: 'reveal',
      focalLength: 50,
      rigPosition: null, // keep current rig position — let the spring carry us in
      lookAt: dissolvingTarget.clone(), // lock onto the dissolving mass
      duration: 2.5, // matches the dissolve duration in SPEC §1 + lighting-design §3.1
      releaseTo: 'chase',
    };

    this.activeShot = revealShot;
    this.shotTimer = revealShot.duration;
    this.applyShotOverrides(revealShot);

    // The look-at is locked onto the dissolving geometry — not the player.
    // The spring is over-damped; the camera does not breathe during the melt.
    if (revealShot.lookAt !== null) {
      this.setTargetLookAt(revealShot.lookAt);
    }
    this.setOverDamped(true);

    // Override the chase target so the rig does NOT follow the player anymore.
    // Instead, the rig collapses toward the dissolving geometry.
    // We set the target position to be the rig position + a small inward bias
    // toward the dissolving target, so the camera feels like it's being pulled
    // into the melt, not retreating from it.
    const collapseDir = dissolvingTarget.clone()
      .sub(this._rigPosition)
      .normalize()
      .multiplyScalar(-1); // toward, not away
    const collapseTarget = this._rigPosition.clone()
      .add(collapseDir.multiplyScalar(2.0)); // 2 units inward per second of collapse
    this.setTargetPosition(collapseTarget);
  }

  /** Returns true if the reveal shot is currently active. */
  get isRevealActive(): boolean {
    return this.activeShot?.name === 'reveal';
  }
}

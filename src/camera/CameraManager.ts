// CameraManager — owns the CameraDirector and the OutroCamera, wiring them into the
// main render loop. P1 bridge between the cinematography lane and the engine.
//
// Responsibilities:
//  - Own the CineCameraActor + CameraDirector for the chase camera (Act 1 + Act 2).
//  - Own the OutroCamera for the outro (EPILOGUE).
//  - Feed player anchor + velocity to the CameraDirector each frame.
//  - Programme the reveal shot at the dissolve beat (driven by KIPP's FSM transition).
//  - Update the active camera each frame (chase or outro).
//  - Expose the active camera for the renderer to use.

import * as THREE from 'three';
import { CameraDirector, CinematicShot, PlayerAnchor } from '@/camera/CameraDirector';
import { CineCameraActor } from '@/camera/CineCameraActor';
import { OutroCamera, OutroPhase } from '@/camera/OutroCamera';

// ── Player anchor (from KIPP's FSM — P1 stub) ───────────────────────────────────
// In P1, the player anchor is a stub. The FSM (KIPP) drives the actual player position
// and velocity. For now, we use a synthetic anchor that moves in a circle to exercise
// the spring. P2: KIPP wires the real FSM state here.

const PLAYER_SPEED = 5; // units/sec — slow flight speed for testing
const PLAYER_RADIUS = 3; // radius of the synthetic orbit

// ── Game state (from KIPP's FSM — P1 stub) ──────────────────────────────────────

import { GameState, GameStateManager } from '@/managers/game-state';

// ── Public API ───────────────────────────────────────────────────────────────────

export class CameraManager {
  private director: CameraDirector;
  private outroCamera: OutroCamera;
  private gameState: GameStateManager;
  private playerAnchor: PlayerAnchor = {
    position: new THREE.Vector3(0, 0.5, 0),
    velocity: new THREE.Vector3(0, 0, 0),
  };
  private templeCentre = new THREE.Vector3(0, 1, 0); // dissolving target placeholder
  private _elapsed = 0;

  constructor(gameState: GameStateManager) {
    this.gameState = gameState;
    this.director = new CameraDirector({
      focalLength: 45, // chase default
      aperture: 2.8,
      sensor: 'super35',
    });
    this.outroCamera = new OutroCamera(this.director.cameraActor);
  }

  /** Returns the active camera (chase or outro) for the renderer to use. */
  get activeCamera(): THREE.PerspectiveCamera {
    if (this.outroCamera.isRunning) {
      return this.outroCamera.perspectiveCamera;
    }
    return this.director.perspectiveCamera;
  }

  /** Returns the CameraDirector for direct access (e.g. reveal programming). */
  get cameraDirector(): CameraDirector {
    return this.director;
  }

  /** Returns the current lens descriptor for HUD telemetry. */
  get lensDescriptor(): string {
    if (this.outroCamera.isRunning) {
      return this.outroCamera.cameraActor.getDescriptor();
    }
    return this.director.cameraDescriptor;
  }

  /** Returns the current horizontal FOV in degrees for QA screenshots. */
  get horizontalFOV(): number {
    if (this.outroCamera.isRunning) {
      return this.outroCamera.cameraActor.getHorizontalFOV();
    }
    return this.director.horizontalFOV;
  }

  /** Returns the current outro phase for debugging. */
  get outroPhase(): OutroPhase {
    return this.outroCamera.currentPhase;
  }

  /** Called each frame to advance the camera. */
  update(dt: number): void {
    this._elapsed += dt;

    // Update the synthetic player anchor (P1 stub — KIPP wires real FSM state in P2).
    this.updatePlayerAnchor(dt);

    // If the outro camera is running, it owns updates.
    if (this.outroCamera.isRunning) {
      this.outroCamera.update(dt);
      return;
    }

    // Programme the reveal shot when the FSM enters TRANSITION.
    if (this.gameState.current === GameState.TRANSITION &&
        !this.director.isRevealActive) {
      this.programmeReveal();
    }

    // Programme the outro when the FSM enters EPILOGUE.
    if (this.gameState.current === GameState.EPILOGUE &&
        !this.outroCamera.isRunning) {
      this.programmeOutro();
    }

    // Update the chase camera.
    this.director.update(dt, this.playerAnchor);
  }

  /** Called when the renderer is resized. */
  resize(): void {
    const aspect = window.innerWidth / window.innerHeight;
    this.director.cameraActor.setAspect(aspect);
  }

  // ── Player anchor (P1 stub) ───────────────────────────────────────────────────

  private updatePlayerAnchor(dt: number): void {
    // Synthetic orbit: the player moves in a circle at PLAYER_SPEED.
    // This exercises the spring without requiring KIPP's FSM.
    const angle = this._elapsed * PLAYER_SPEED * 0.5;
    this.playerAnchor.position.set(
      Math.cos(angle) * PLAYER_RADIUS,
      0.5, // chest height
      Math.sin(angle) * PLAYER_RADIUS,
    );
    this.playerAnchor.velocity = new THREE.Vector3(
      -Math.sin(angle) * PLAYER_SPEED,
      0,
      Math.cos(angle) * PLAYER_SPEED,
    );
  }

  // ── Reveal programming ─────────────────────────────────────────────────────────

  /**
   * Programme the reveal shot.
   * Called when the FSM transitions to TRANSITION state (t=0:45 per SPEC §1).
   *
   * The dissolving target is the centre of the temple geometry that's melting.
   * P1: placeholder at (0, 1, 0) — the temple centre. P2 CASE wires the real
   * dissolve centre from the transition shader.
   */
  private programmeReveal(): void {
    const dissolvingTarget = this.templeCentre.clone();
    this.director.programmeReveal(dissolvingTarget);
  }

  // ── Outro programming ──────────────────────────────────────────────────────────

  /**
   * Programme the outro camera.
   * Called when the FSM transitions to EPILOGUE state (t=1:15 per SPEC §1).
   *
   * P1: placeholder agent + wall positions. P3 CASE/KIPP/ATLAS wire the real positions
   * from the outro scene (typewriter on the wall, agent in the room).
   */
  private programmeOutro(): void {
    const agentPosition = new THREE.Vector3(0, 0.5, 0); // placeholder
    const wallPosition = new THREE.Vector3(0, 1.5, -3); // placeholder — where typewriter text appears
    this.outroCamera.start(agentPosition, wallPosition);
  }

  // ── Debug / evidence ───────────────────────────────────────────────────────────

  /** Returns a compact state descriptor for HUD/perf telemetry. */
  getDescriptor(): string {
    const state = this.gameState.current;
    const lens = this.lensDescriptor;
    const phase = this.outroCamera.isRunning
      ? `OUTRO:${this.outroCamera.currentPhase}`
      : (this.director.isRevealActive ? 'REVEAL' : 'CHASE');
    return `${state} | ${lens} | ${phase} | ${this.horizontalFOV.toFixed(1)}°`;
  }
}

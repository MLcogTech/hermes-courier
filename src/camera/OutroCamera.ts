// OutroCamera — stub for P1. Full implementation is P3 scope.
//
// See docs/reveal-staging.md §4 for the full mechanical description and
// the contract: three phases, 50→85mm compression, static credits frame.
//
// P1 delivers the stub + contract. P3 delivers the driven implementation.

import * as THREE from 'three';
import { CineCameraActor } from '@/camera/CineCameraActor';

export enum OutroPhase {
  IDLE = 'IDLE',
  PHASE_1 = 'PHASE_1', // static three-quarter on agent
  PHASE_2 = 'PHASE_2', // slow 50→85mm push-in
  PHASE_3 = 'PHASE_3', // wider credits frame
}

export class OutroCamera {
  private camera: CineCameraActor;
  private phase: OutroPhase = OutroPhase.IDLE;
  private phaseTimer = 0;

  // Phase 1: static three-quarter on the agent.
  private phase1LookAt = new THREE.Vector3();
  private phase1Position = new THREE.Vector3();

  // Phase 2: slow 50→85mm compression.
  private phase2StartFocalLength = 50;
  private phase2EndFocalLength = 85;
  private phase2Duration = 6.0; // seconds

  // Phase 3: wider credits frame.
  private phase3LookAt = new THREE.Vector3();
  private phase3Position = new THREE.Vector3();

  constructor(camera: CineCameraActor) {
    this.camera = camera;
  }

  /** Returns the underlying CineCameraActor for read access (e.g. lens descriptor, FOV). */
  get cameraActor(): CineCameraActor {
    return this.camera;
  }

  /** Returns the underlying perspective camera for the renderer. */
  get perspectiveCamera(): THREE.PerspectiveCamera {
    return this.camera.perspectiveCamera;
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
        if (this.phaseTimer >= 3.0) {
          this.transitionToPhase2();
        }
        this.camera.perspectiveCamera.position.copy(this.phase1Position);
        this.camera.perspectiveCamera.lookAt(this.phase1LookAt);
        break;

      case OutroPhase.PHASE_2:
        // Slow 50→85mm compression.
        const t = Math.min(1, this.phaseTimer / this.phase2Duration);
        const focalLength = this.phase2StartFocalLength +
          (this.phase2EndFocalLength - this.phase2StartFocalLength) * t;
        this.camera.setFocalLength(focalLength);
        // Hold position, adjust look-at to keep the agent centred.
        this.camera.perspectiveCamera.position.copy(this.phase1Position);
        this.camera.perspectiveCamera.lookAt(this.phase1LookAt);
        if (this.phaseTimer >= this.phase2Duration) {
          this.transitionToPhase3();
        }
        break;

      case OutroPhase.PHASE_3:
        // Wider credits frame. Static.
        this.camera.perspectiveCamera.position.copy(this.phase3Position);
        this.camera.perspectiveCamera.lookAt(this.phase3LookAt);
        break;
    }
  }

  private transitionToPhase2(): void {
    this.phase = OutroPhase.PHASE_2;
    this.phaseTimer = 0;
  }

  private transitionToPhase3(): void {
    this.phase = OutroPhase.PHASE_3;
    this.phaseTimer = 0;
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

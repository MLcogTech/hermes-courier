// CineCameraActor — Three.js PerspectiveCamera with physical lens parameters.
// FOV is derived from focal length + sensor width, not set directly.
// This is what CameraDirector owns. The renderer receives the underlying
// PerspectiveCamera and renders with whatever intrinsics are current.

import * as THREE from 'three';

export type SensorFormat = 'super35' | 'fullframe';

export interface CineCameraConfig {
  /** Sensor format. Super-35 is the default for the game; full-frame only for the outro. */
  sensor: SensorFormat;
  /** Focal length in mm. Locked during chase; changes only on cut to a named shot. */
  focalLength: number;
  /** Nominal aperture f-stop. Creative target for the DOF post-pass, not a live lens stop. */
  aperture: number;
}

const SENSOR_WIDTH: Record<SensorFormat, number> = {
  super35: 24.89, // mm — Super-35 (24.89 × 18.66 mm)
  fullframe: 36.0, // mm — Full Frame (36 × 24 mm)
};

const DEFAULT_CONFIG: CineCameraConfig = {
  sensor: 'super35',
  focalLength: 45,
  aperture: 2.8,
};

export class CineCameraActor {
  private camera: THREE.PerspectiveCamera;
  private config: CineCameraConfig;
  private aspect: number = 16 / 9;

  constructor(config: Partial<CineCameraConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    // Vertical FOV is derived from horizontal FOV + aspect, not set directly.
    // We initialise at 45mm/S35 and recompute on focalLength changes.
    this.camera = new THREE.PerspectiveCamera(0, this.aspect, 0.1, 1000);
    this.recomputeFOV();
  }

  get perspectiveCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /** Current focal length in mm. Only changed on cut to a named shot, never during chase. */
  get focalLength(): number {
    return this.config.focalLength;
  }

  /** Nominal aperture — DOF post-pass reads this; the 3D camera does not pay for it per frame. */
  get aperture(): number {
    return this.config.aperture;
  }

  get sensor(): SensorFormat {
    return this.config.sensor;
  }

  /** Update the aspect ratio (e.g. on window resize). */
  setAspect(aspect: number): void {
    this.aspect = aspect;
    this.recomputeFOV();
  }

  /**
   * Change focal length. This is a *cut* — it happens on an act transition,
   * a shot change, or the outro pivot. It does NOT animate during normal flight.
   *
   * The 50→85mm outro compression is a special case handled by the outro
   * camera stub, not by this setter in the chase path.
   */
  setFocalLength(mm: number): void {
    this.config.focalLength = mm;
    this.recomputeFOV();
  }

  /**
   * Convenience: clamp focal length to the chase camera's allowed range (35–50mm).
   * Used by the shot layer to validate named-shot lens choices at enqueue time.
   */
  clampFocalLength(min: number, max: number): void {
    this.config.focalLength = Math.max(min, Math.min(max, this.config.focalLength));
    this.recomputeFOV();
  }

  private recomputeFOV(): void {
    const sensorWidth = SENSOR_WIDTH[this.config.sensor];
    // Horizontal FOV from focal length: 2 * atan(sensorWidth / (2 * focalLength))
    const hfovRad = 2 * Math.atan(sensorWidth / (2 * this.config.focalLength));
    // Derive vertical FOV from horizontal + aspect: 2 * atan(tan(hfov/2) / aspect)
    const vfovRad = 2 * Math.atan(Math.tan(hfovRad / 2) / this.aspect);
    this.camera.fov = THREE.MathUtils.radToDeg(vfovRad);
    this.camera.updateProjectionMatrix();
  }

  // ── Forwarded camera ops ──────────────────────────────────────────────────

  get position(): THREE.Vector3 {
    return this.camera.position;
  }
  set position(v: THREE.Vector3) {
    this.camera.position.copy(v);
  }

  get quaternion(): THREE.Quaternion {
    return this.camera.quaternion;
  }

  lookAt(target: THREE.Vector3): void {
    this.camera.lookAt(target);
  }

  // ── Debug / evidence ──────────────────────────────────────────────────────

  /** Returns the current horizontal FOV in degrees — useful for QA screenshots. */
  getHorizontalFOV(): number {
    const sensorWidth = SENSOR_WIDTH[this.config.sensor];
    const hfovRad = 2 * Math.atan(sensorWidth / (2 * this.config.focalLength));
    return THREE.MathUtils.radToDeg(hfovRad);
  }

  /** Returns a compact descriptor for HUD/perf telemetry. */
  getDescriptor(): string {
    return [
      `${this.config.focalLength}mm`,
      this.config.sensor === 'super35' ? 'S35' : 'FF',
      `f/${this.config.aperture.toFixed(1)}`,
      `${this.getHorizontalFOV().toFixed(1)}°`,
    ].join(' ');
  }
}

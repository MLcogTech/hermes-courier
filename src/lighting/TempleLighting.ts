// TempleLighting — P1 implementation of lighting-design.md §2 (Act 1 — The Temple).
//
// Lighting story (from PLEX's spec):
//  - ONE key: high-window directional at 5500K warm daylight.
//  - ONE fill: warm marble floor bounce at ~4500K, 18–25% of key intensity.
//  - Rim: the key does double duty — grazing pillar edges, no separate rim light.
//  - God rays: volumetric pull-away from the window, enabled during temple act.
//  - NO cool/blue light in Act 1. If you see blue, something is wrong.
//
// Three.js mapping:
//  - Key: THREE.DirectionalLight with color derived from 5500K Planckian → sRGB.
//  - Fill: THREE.HemisphereLight with warm ground color (floor bounce).
//  - Fog: THREE.FogExp2 tuned for "sunlight in a dusty temple" — shafts visible, not thick.
//  - God-ray shaft: a semi-transparent cone mesh at the window position, oriented
//    along the light direction. This is the P1 physical-weight approximation; the
//    full volumetric pass is P2 scope (CASE owns the medium).
//
// Color authority note (from lighting-design.md §1):
//  Kelvin figures are CREATIVE INTENT. CASE converts Kelvin → RGB using a
//  Planckian-to-RGB approximation. PLEX signs off visually. The RGB values below
//  are the approximation PLEX has approved for the renderer.

import * as THREE from 'three';
import { Scene } from '@/lib/scene';

// ── Planckian-to-RGB approximations (creative intent → sRGB) ──────────────────
// These are the values PLEX has signed off on. CASE may refine the conversion;
// the look is what matters, not the exact numbers.

/** 5500K — direct noon daylight. Warm white, slightly yellow. */
const KELVIN_5500K_RGB = new THREE.Color(1.0, 0.97, 0.92);

/** 4500K — warm marble floor bounce. Slightly warmer than the key. */
const KELVIN_4500K_RGB = new THREE.Color(1.0, 0.95, 0.88);

/** 3200K — warm incandescent (outro room). Lamp-warm, not daylight-warm. */
const KELVIN_3200K_RGB = new THREE.Color(1.0, 0.92, 0.82);

// ── Temple lighting parameters (from lighting-design.md §2) ───────────────────

const KEY_INTENSITY = 1.0; // renderer units at window aperture
const FILL_INTENSITY = 0.22; // ~22% of key — within the 18–25% band
const GOD_RAY_SHAFT_OPACITY = 0.12; // subtle — shafts are light, not fog machine
const FOG_DENSITY = 0.025; // tuned so shafts are visible but the temple is clear air

// ── Window direction (from lighting-design.md §2.1) ────────────────────────────
// The window is conceptually high on the temple's back wall. Light rakes across
// the marble floor and GPU-rack pillars from above, ~30° off vertical.

const WINDOW_DIRECTION = new THREE.Vector3(-0.4, -0.85, -0.4).normalize();
// Angle from vertical: ~30° — acos(0.85) ≈ 31.8°.

// ── God-ray shaft geometry ──────────────────────────────────────────────────────
// The shaft is a semi-transparent cone representing the volumetric beam from the
// window. In P1 it's a visual placeholder; CASE replaces it with a proper volumetric
// scattering pass in P2. The shaft's opacity and color are PLEX's creative territory.

const SHAFT_LENGTH = 14; // units — how far the beam extends into the hall
const SHAFT_ANGLE = 0.12; // radians — narrow beam, not a floodlight

// ── Public API ──────────────────────────────────────────────────────────────────

export class TempleLighting {
  private scene: THREE.Scene;
  private key: THREE.DirectionalLight;
  private fill: THREE.HemisphereLight;
  private godRayShaft: THREE.Mesh | null = null;
  private shaftMaterial: THREE.MeshBasicMaterial | null = null;
  private _enabled = true;

  /** The window position (conceptual) — used for god-ray shaft origin. */
  readonly windowPosition: THREE.Vector3;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.windowPosition = new THREE.Vector3(0, 8, -6); // high on back wall

    // ── Key: high-window directional at 5500K ───────────────────────────────
    this.key = new THREE.DirectionalLight(KELVIN_5500K_RGB.clone(), KEY_INTENSITY);
    this.key.position.copy(this.windowPosition);
    this.key.target.position.set(0, 0, 0);
    this.scene.add(this.key);
    this.scene.add(this.key.target);

    // ── Fill: warm marble floor bounce at ~4500K ─────────────────────────────
    // HemisphereLight: sky color = warm daylight, ground color = warm marble bounce.
    // Intensity tuned so shadows read as warm, not flat gray.
    this.fill = new THREE.HemisphereLight(
      KELVIN_5500K_RGB.clone().multiplyScalar(0.6), // sky — warm daylight
      KELVIN_4500K_RGB.clone().multiplyScalar(0.8), // ground — warm marble bounce
      FILL_INTENSITY,
    );
    this.scene.add(this.fill);

    // ── Fog: exponential height fog for volumetric atmosphere ────────────────
    // Fog color matches the warm daylight key, not a neutral gray.
    // Density tuned so god-ray shafts are visible but the temple is clear air.
    this.scene.fog = new THREE.FogExp2(KELVIN_5500K_RGB.clone().multiplyScalar(0.7), FOG_DENSITY);

    // ── God-ray shaft: semi-transparent cone at window ───────────────────────
    // The shaft is a visual placeholder for the volumetric beam. P2 CASE replaces
    // it with a proper in-scattering pass.
    this.shaftMaterial = new THREE.MeshBasicMaterial({
      color: KELVIN_5500K_RGB.clone(),
      transparent: true,
      opacity: GOD_RAY_SHAFT_OPACITY,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.NormalBlending,
    });
    const shaftGeo = new THREE.ConeGeometry(SHAFT_ANGLE * SHAFT_LENGTH, SHAFT_LENGTH, 16, 1, true);
    this.godRayShaft = new THREE.Mesh(shaftGeo, this.shaftMaterial);
    this.godRayShaft.position.copy(this.windowPosition);
    // Orient the cone along the window direction (pointing into the hall).
    const up = new THREE.Vector3(0, 1, 0);
    const quat = new THREE.Quaternion().setFromUnitVectors(up, WINDOW_DIRECTION);
    this.godRayShaft.quaternion.copy(quat);
    this.scene.add(this.godRayShaft);

    // ── Background / clear color ───────────────────────────────────────────────
    // Match fog color — warm, not cold.
    // The renderer sets this; we just ensure the fog and background are consistent.
    this.scene.background = new THREE.Color(KELVIN_5500K_RGB.clone().multiplyScalar(0.15));
  }

  /** Returns true if the temple lighting is currently enabled. */
  get enabled(): boolean {
    return this._enabled;
  }

  /**
   * Enable or disable the temple lighting.
   * Used during the reveal transition — when the temple dissolves, the temple
   * lighting is cut (not faded). God rays die with the window.
   */
  setEnabled(enabled: boolean): void {
    this._enabled = enabled;
    this.key.intensity = enabled ? KEY_INTENSITY : 0;
    this.fill.intensity = enabled ? FILL_INTENSITY : 0;
    if (this.shaftMaterial) {
      this.shaftMaterial.opacity = enabled ? GOD_RAY_SHAFT_OPACITY : 0;
    }
    if (this.godRayShaft) {
      this.godRayShaft.visible = enabled;
    }
  }

  /**
   * Cut the temple lighting (hard cut, not fade). Called at dissolve onset (t=0:45).
   * This matches lighting-design.md §3.1: "The high-window key cuts — not a fade, a cut."
   */
  cut(): void {
    this.setEnabled(false);
  }

  /** Restore the temple lighting. Used for run resets. */
  restore(): void {
    this.setEnabled(true);
  }

  /**
   * Update the god-ray shaft opacity. Called by the dissolve transition to fade
   * the shaft with the temple geometry. The shaft dies with the temple — it is
   * part of the hallucination.
   *
   * @param opacity  New opacity in [0, GOD_RAY_SHAFT_OPACITY].
   */
  setGodRayOpacity(opacity: number): void {
    if (this.shaftMaterial) {
      this.shaftMaterial.opacity = Math.max(0, Math.min(GOD_RAY_SHAFT_OPACITY, opacity));
    }
  }

  /** Dispose of all created resources. Called on scene teardown. */
  dispose(): void {
    this.scene.remove(this.key);
    this.scene.remove(this.key.target);
    this.scene.remove(this.fill);
    if (this.godRayShaft) {
      this.scene.remove(this.godRayShaft);
      this.godRayShaft.geometry.dispose();
      if (this.shaftMaterial) {
        this.shaftMaterial.dispose();
      }
    }
    this.godRayShaft = null;
    this.shaftMaterial = null;
  }
}

// ── Planckian-to-RGB helper (CASE may use this instead of the hardcoded values) ─
// Approximate Planckian locus → sRGB. Not accurate enough for color-critical work,
// but good enough for the creative-intent look PLEX signs off on.

/**
 * Approximate a black-body color temperature (Kelvin) to an sRGB color.
 * This is a rough fit — the exact conversion is CASE's territory; PLEX signs
 * the look, not the math.
 *
 * @param kelvin  Color temperature in Kelvin (2000–10000).
 * @returns       THREE.Color in linear sRGB space.
 */
export function kelvinToRGB(kelvin: number): THREE.Color {
  // Clamp to a reasonable range.
  const t = Math.max(2000, Math.min(10000, kelvin));

  // Approximate using a simplified Planckian fit.
  // R, G, B are computed from the temperature using a piecewise approximation.
  // Formula adapted from Tanner Helland's popular approximation.
  let r: number, g: number, b: number;

  if (t < 6600) {
    r = 1.0;
    g = 0.3906 + 0.5875 * Math.log(t / 100) - 0.0050 * Math.pow(Math.log(t / 100), 2);
    g = Math.max(0, Math.min(1, g));
    if (t < 2000) {
      b = 0;
    } else {
      b = 0.5436 + 0.5709 * Math.log(t / 100) - 0.0082 * Math.pow(Math.log(t / 100), 2);
      b = Math.max(0, Math.min(1, b));
    }
  } else {
    r = 0.8 + 0.2 * Math.log(t / 100) - 0.01 * Math.pow(Math.log(t / 100), 2);
    r = Math.max(0, Math.min(1, r));
    g = 0.8 + 0.1 * Math.log(t / 100) - 0.005 * Math.pow(Math.log(t / 100), 2);
    g = Math.max(0, Math.min(1, g));
    b = 1.0;
  }

  return new THREE.Color(r, g, b);
}

/**
 * Verify the hardcoded approximations against the helper.
 * Used in tests to ensure the creative-intent values are internally consistent.
 */
export function verifyApproximations(): { pass: boolean; deltas: { r: number; g: number; b: number } } {
  const approx = kelvinToRGB(5500);
  const target = KELVIN_5500K_RGB;
  const dr = Math.abs(approx.r - target.r);
  const dg = Math.abs(approx.g - target.g);
  const db = Math.abs(approx.b - target.b);
  // Allow a generous tolerance — the helper is approximate by design.
  const pass = dr < 0.05 && dg < 0.05 && db < 0.05;
  return { pass, deltas: { r: dr, g: dg, b: db } };
}

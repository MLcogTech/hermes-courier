// TempleWorld — P1 test scene: marble box + fog + token particles + proper temple lighting.
// Renders the canonical hello-world scene for the temple act.
// Uses THREE.InstancedMesh for the token stream (zero individual draw calls).
//
// P1 upgrade (PLEX):
//  - TempleLighting replaces the raw DirectionalLight + AmbientLight setup.
//  - Lighting is 5500K warm directional key + warm marble bounce fill + god-ray shaft.
//  - No cool/blue light in Act 1 (hard rule from lighting-design.md §2.5).

import * as THREE from 'three';
import { Renderer } from '@/lib/renderer';
import { InputManager } from '@/lib/input';
import { TempleLighting } from '@/lighting/TempleLighting';

const PARTICLE_COUNT = 256;
const PARTICLE_OPTS = {
  minSize: 0.04,
  maxSize: 0.12,
  streamLength: 12.0,
};

export class TempleWorld {
  private renderer: Renderer;
  private input: InputManager;
  private marbleBox: THREE.Mesh | null = null;
  private particleMesh: THREE.InstancedMesh | null = null;
  private particleData: Float32Array = new Float32Array(0);
  private matrix: THREE.Matrix4 = new THREE.Matrix4();
  private quaternion: THREE.Quaternion = new THREE.Quaternion();
  private _time: number = 0;
  private lighting: TempleLighting | null = null;

  constructor(renderer: Renderer, input: InputManager) {
    this.renderer = renderer;
    this.input = input;
  }

  init(scene: THREE.Scene): void {
    if (!scene) return;

    // ── Temple lighting (PLEX P1) ──────────────────────────────────────────────
    // Replaces the raw DirectionalLight + AmbientLight from P0.
    // 5500K high-window key, warm marble bounce fill, god-ray shaft mesh.
    this.lighting = new TempleLighting(scene);

    // ── Marble box (temple centerpiece) ─────────────────────────────────────────
    const geo = new THREE.BoxGeometry(2.0, 2.0, 2.0);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.1,
      envMapIntensity: 0.6,
    });
    this.marbleBox = new THREE.Mesh(geo, mat);
    this.marbleBox.position.set(0, 0, 0);
    scene.add(this.marbleBox);

    // ── Token-stream particles (instanced) ─────────────────────────────────────
    const particleGeo = new THREE.PlaneGeometry(1, 1);
    const particleMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.particleMesh = new THREE.InstancedMesh(particleGeo, particleMat, PARTICLE_COUNT);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleData = new Float32Array(PARTICLE_COUNT * 4); // phase, offX, offY, size
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const j = i * 4;
      this.particleData[j] = Math.random() * PARTICLE_OPTS.streamLength; // phase
      this.particleData[j + 1] = (Math.random() - 0.5) * 0.6; // lateral offset X
      this.particleData[j + 2] = (Math.random() - 0.5) * 0.6; // lateral offset Y
      this.particleData[j + 3] = PARTICLE_OPTS.minSize + Math.random() * (PARTICLE_OPTS.maxSize - PARTICLE_OPTS.minSize);
    }
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(this.particleMesh);
  }

  update(dt: number): void {
    this._time += dt;

    if (this.marbleBox) {
      this.marbleBox.rotation.x += dt * 0.2;
      this.marbleBox.rotation.y += dt * 0.35;
    }

    const data = this.particleData;
    const mesh = this.particleMesh;
    if (mesh) {
      const origin = new THREE.Vector3(0, 0.5, -4.0);
      const dir = new THREE.Vector3(0, 0.15, 1.0).normalize();
      const v3 = new THREE.Vector3();
      const up = new THREE.Vector3(0, 0, 1);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const j = i * 4;
        const phase = data[j]! + this._time * 0.5;
        const wrappedPhase = phase > PARTICLE_OPTS.streamLength
          ? phase - PARTICLE_OPTS.streamLength
          : phase;

        data[j] = wrappedPhase;

        const offX = data[j + 1]!;
        const offY = data[j + 2]!;
        const size = data[j + 3]!;

        v3.set(
          origin.x + dir.x * wrappedPhase * 8.0 + offX,
          origin.y + dir.y * wrappedPhase * 8.0 + offY + Math.sin(wrappedPhase * 2.0) * 0.2,
          origin.z + dir.z * wrappedPhase * 8.0,
        );

        const dirWithJitter = dir.clone().add(new THREE.Vector3(offX * 0.1, offY * 0.1, 0)).normalize();
        this.quaternion.setFromUnitVectors(up, dirWithJitter);
        this.matrix.compose(v3, this.quaternion, new THREE.Vector3(size, size, 1));
        mesh.setMatrixAt(i, this.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  /** Called during the reveal transition — cuts the temple lighting. */
  cutLighting(): void {
    if (this.lighting) {
      this.lighting.cut();
    }
  }

  /** Called on run reset — restores the temple lighting. */
  restoreLighting(): void {
    if (this.lighting) {
      this.lighting.restore();
    }
  }

  /** Returns the temple lighting for external control (e.g. fade god rays during dissolve). */
  get templeLighting(): TempleLighting | null {
    return this.lighting;
  }

  /** Dispose of all created resources. */
  dispose(): void {
    if (this.lighting) {
      this.lighting.dispose();
      this.lighting = null;
    }
    if (this.marbleBox) {
      this.marbleBox.geometry.dispose();
      (this.marbleBox.material as THREE.Material).dispose();
      this.marbleBox = null;
    }
    if (this.particleMesh) {
      this.particleMesh.geometry.dispose();
      (this.particleMesh.material as THREE.Material).dispose();
      this.particleMesh = null;
    }
  }
}

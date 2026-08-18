// TempleWorld — P1 temple corridor + token river.
// 40m forward path (along -Z), marble pillars, columns, GPU racks, plus a
// 2048-instance token river flowing along the corridor. One draw call for the
// river. Fog is static (FogExp2) — never touched during dissolve (PLEX brief).

import * as THREE from 'three';
import { TempleMaterial } from './materials';
import { TempleLighting } from '@/lighting/TempleLighting';

// ── constants ──────────────────────────────────────────────────────────────
const CORRIDOR_LENGTH = 40;   // metres, along -Z
const CORRIDOR_WIDTH  = 8;    // metres
const PILLAR_COUNT    = 16;   // instanced — two rows of 8
const COLUMN_COUNT    = 15;   // instanced
const RACK_COUNT      = 12;   // instanced — two rows of 6
const TOKEN_COUNT     = 2048; // instanced — one draw call
const PILLAR_SPACING  = CORRIDOR_LENGTH / 8; // 5 m

// shared scratch (zero alloc in update)
const _M = new THREE.Matrix4();
const _Q = new THREE.Quaternion();
const _P = new THREE.Vector3();
const _S = new THREE.Vector3(1, 1, 1);
const _Z = new THREE.Vector3(0, 0, 1);   // static — billboarding from +Z

// ── geometry (reused, allocated once) ──────────────────────────────────────
const _PillarGeo   = new THREE.BoxGeometry(0.5, 3.5, 0.5);
const _ColumnGeo   = new THREE.CylinderGeometry(0.2, 0.3, 4.2, 12);
const _RackGeo     = new THREE.BoxGeometry(1.6, 2.2, 0.6);
const _FloorGeo    = new THREE.PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH);
const _TokenGeo    = new THREE.PlaneGeometry(1, 1);

// ── class ──────────────────────────────────────────────────────────────────
export class TempleWorld {
  private scene: THREE.Scene;
  private templeMat: TempleMaterial;
  private lighting: TempleLighting | null = null;
  private tokenMat: THREE.MeshBasicMaterial;

  // instanced meshes
  private pillarMesh: THREE.InstancedMesh;
  private columnMesh: THREE.InstancedMesh;
  private rackMesh: THREE.InstancedMesh;
  private tokenMesh: THREE.InstancedMesh;

  // per-instance data (Structure of Arrays → zero alloc update)
  private pillarData: Float32Array;   // x, y, z
  private columnData: Float32Array;
  private rackData: Float32Array;
  private tokenData: Float32Array;    // baseX, baseY, baseZ, size

  // token river stream
  private _tokenTime: number = 0;
  private readonly _tokenSpeed: number = 4.0;   // m/s along corridor

  // camera scratch
  private _camDir = new THREE.Vector3();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.templeMat = new TempleMaterial();

    // token material — glowing cyan, blended, non-occluding
    this.tokenMat = new THREE.MeshBasicMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    // build instanced meshes
    this.pillarMesh = new THREE.InstancedMesh(_PillarGeo, this.templeMat.material, PILLAR_COUNT);
    this.pillarMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.pillarData = new Float32Array(PILLAR_COUNT * 3);

    this.columnMesh = new THREE.InstancedMesh(_ColumnGeo, this.templeMat.material, COLUMN_COUNT);
    this.columnMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.columnData = new Float32Array(COLUMN_COUNT * 3);

    this.rackMesh = new THREE.InstancedMesh(_RackGeo, this.templeMat.material, RACK_COUNT);
    this.rackMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rackData = new Float32Array(RACK_COUNT * 3);

    this.tokenMesh = new THREE.InstancedMesh(_TokenGeo, this.tokenMat, TOKEN_COUNT);
    this.tokenMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.tokenData = new Float32Array(TOKEN_COUNT * 4);

    // populate instance data once (static placement; token flow is animated)
    this._initPillars();
    this._initColumns();
    this._initRacks();
    this._initTokens();

    // floor + fog + lighting
    const floor = new THREE.Mesh(_FloorGeo, this.templeMat.material);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -0.05, -CORRIDOR_LENGTH / 2);
    scene.add(floor);

    scene.fog = new THREE.FogExp2(0x141a2a, 0.035);   // static — never dissolve-driven

    // PLEX P1: physical temple lighting — 5500K high-window key + marble bounce + god-ray shaft.
    this.lighting = new TempleLighting(scene);

    scene.add(this.pillarMesh);
    scene.add(this.columnMesh);
    scene.add(this.rackMesh);
    scene.add(this.tokenMesh);
  }

  // ── static placement (run once) ──────────────────────────────────────────
  private _initPillars(): void {
    const halfW = CORRIDOR_WIDTH / 2 - 0.6;
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const row = i % 2;
      const idx = Math.floor(i / 2);       // 0..7
      const x = row === 0 ? -halfW : halfW;
      const z = -idx * PILLAR_SPACING;
      this.pillarData[i * 3]     = x;
      this.pillarData[i * 3 + 1] = 1.75;
      this.pillarData[i * 3 + 2] = z;
    }
    this._uploadPillars();
  }

  private _initColumns(): void {
    for (let i = 0; i < COLUMN_COUNT; i++) {
      const idx   = i;
      const z     = -idx * PILLAR_SPACING - PILLAR_SPACING / 2;
      this.columnData[i * 3]     = 0;
      this.columnData[i * 3 + 1] = 2.1;
      this.columnData[i * 3 + 2] = z;
    }
    this._uploadColumns();
  }

  private _initRacks(): void {
    const halfW = CORRIDOR_WIDTH / 2 - 1.0;
    for (let i = 0; i < RACK_COUNT; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const idx  = Math.floor(i / 2);
      const x    = side * halfW;
      const z    = -idx * (CORRIDOR_LENGTH / 6);
      this.rackData[i * 3]     = x;
      this.rackData[i * 3 + 1] = 1.1;
      this.rackData[i * 3 + 2] = z;
    }
    this._uploadRacks();
  }

  private _initTokens(): void {
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const j = i * 4;
      // spread tokens across the corridor volume
      this.tokenData[j]     = (Math.random() - 0.5) * (CORRIDOR_WIDTH - 1);   // baseX
      this.tokenData[j + 1] = 0.4 + Math.random() * 4.0;                       // baseY
      this.tokenData[j + 2] = -Math.random() * CORRIDOR_LENGTH;                // baseZ (0 → -40)
      this.tokenData[j + 3] = 0.05 + Math.random() * 0.15;                    // size
    }
    this._uploadTokens();
  }

  // ── instance matrix uploads (reused scratch, zero alloc) ─────────────────
  private _uploadPillars(): void {
    for (let i = 0; i < PILLAR_COUNT; i++) {
      const j = i * 3;
      _P.set(this.pillarData[j]!, this.pillarData[j + 1]!, this.pillarData[j + 2]!);
      _M.compose(_P, _Q.identity(), _S);
      this.pillarMesh.setMatrixAt(i, _M);
    }
    this.pillarMesh.instanceMatrix.needsUpdate = true;
  }

  private _uploadColumns(): void {
    for (let i = 0; i < COLUMN_COUNT; i++) {
      const j = i * 3;
      _P.set(this.columnData[j]!, this.columnData[j + 1]!, this.columnData[j + 2]!);
      _M.compose(_P, _Q.identity(), _S);
      this.columnMesh.setMatrixAt(i, _M);
    }
    this.columnMesh.instanceMatrix.needsUpdate = true;
  }

  private _uploadRacks(): void {
    for (let i = 0; i < RACK_COUNT; i++) {
      const j = i * 3;
      _P.set(this.rackData[j]!, this.rackData[j + 1]!, this.rackData[j + 2]!);
      _M.compose(_P, _Q.identity(), _S);
      this.rackMesh.setMatrixAt(i, _M);
    }
    this.rackMesh.instanceMatrix.needsUpdate = true;
  }

  private _uploadTokens(): void {
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const j = i * 4;
      const x = this.tokenData[j]!;
      const y = this.tokenData[j + 1]!;
      const z = this.tokenData[j + 2]!;
      const s = this.tokenData[j + 3]!;
      _P.set(x, y, z);
      _M.compose(_P, _Q.identity(), new THREE.Vector3(s, s, 1));
      this.tokenMesh.setMatrixAt(i, _M);
    }
    this.tokenMesh.instanceMatrix.needsUpdate = true;
  }

  // ── per-frame update ──────────────────────────────────────────────────────
  public update(dt: number, camera: THREE.Camera, dissolve: number = 0): void {
    this._tokenTime += dt * this._tokenSpeed;

    // advance token river along corridor
    const camPos = camera.position;
    camera.getWorldDirection(this._camDir);
    this.templeMat.update(dt, camPos, dissolve);

    // billboarding: face camera (shared quat — one alloc-free rotation for all)
    _Q.setFromUnitVectors(_Z, this._camDir);
    for (let i = 0; i < TOKEN_COUNT; i++) {
      const j = i * 4;
      const baseX = this.tokenData[j]!;
      const baseY = this.tokenData[j + 1]!;
      let baseZ   = this.tokenData[j + 2]! - this._tokenTime;
      if (baseZ < -CORRIDOR_LENGTH) baseZ += CORRIDOR_LENGTH;
      const s = this.tokenData[j + 3]!;
      _P.set(baseX, baseY, baseZ);
      _M.compose(_P, _Q, new THREE.Vector3(s, s, 1));
      this.tokenMesh.setMatrixAt(i, _M);
    }
    this.tokenMesh.instanceMatrix.needsUpdate = true;
  }

  /** Expose the temple material so main.ts can drive dissolve. */
  public getMaterial(): TempleMaterial {
    return this.templeMat;
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
    if (this.pillarMesh) {
      this.pillarMesh.geometry.dispose();
      (this.pillarMesh.material as THREE.Material).dispose();
    }
    if (this.tokenMesh) {
      this.tokenMesh.geometry.dispose();
      (this.tokenMesh.material as THREE.Material).dispose();
    }
  }

}

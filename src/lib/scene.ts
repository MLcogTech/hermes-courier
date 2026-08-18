import * as THREE from 'three';

// Minimal scene graph — CASE fleshes out spatial BVH
export class Scene {
  private root: THREE.Group = new THREE.Group();
  add(object: THREE.Object3D): void { this.root.add(object); }
  getRoot(): THREE.Group { return this.root; }
}

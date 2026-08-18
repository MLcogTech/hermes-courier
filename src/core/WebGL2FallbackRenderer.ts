/**
 * WebGL2FallbackRenderer — WebGL2 renderer used when WebGPU is unavailable.
 *
 * P0 CONTRACT:
 * - Provides the same public API as the WebGPURenderer facade.
 * - Renders a deterministic hello-world scene (rotating colored cube).
 * - Zero allocations in render path after init.
 */

import * as THREE from 'three';

export class WebGL2FallbackRenderer {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cube: THREE.Mesh;
  private readonly cubeRotation: THREE.Euler;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setClearColor(0x000000, 1.0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );
    this.camera.position.z = 3;

    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshNormalMaterial({ wireframe: false });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);

    this.cubeRotation = this.cube.rotation;

    // Add a simple directional light for visibility
    const light = new THREE.DirectionalLight(0xffffff, 0.8);
    light.position.set(5, 10, 5);
    this.scene.add(light);
  }

  resize(width: number, height: number): void {
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Render — minimal allocations.
   * Rotates the cube deterministically.
   */
  render(dt: number): void {
    const rotSpeed = 0.5;
    this.cubeRotation.x += dt * rotSpeed;
    this.cubeRotation.y += dt * rotSpeed;
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.renderer.dispose();
  }
}

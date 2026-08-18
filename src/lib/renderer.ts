// renderer.ts — WebGPU-capable renderer with WebGL2 fallback.
// P1 upgrade: accepts an external camera from CameraManager, exposes scene for
// lighting setup, provides resize callback.

import * as THREE from 'three';

export type GfxAPI = 'webgpu' | 'webgl2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = any;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera | null = null;
  private threeRenderer: AnyRenderer;
  private api: GfxAPI = 'webgl2';
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.threeRenderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  }

  async init(): Promise<void> {
    this.api = await this.detectAPI();
    if (this.api === 'webgpu' && (THREE as any).WebGPURenderer) {
      this.threeRenderer.dispose?.();
      this.threeRenderer = new (THREE as any).WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
      });
      if (this.threeRenderer && typeof this.threeRenderer.initPromise !== 'undefined') {
        await this.threeRenderer.initPromise;
      }
    }
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer.setClearColor(0x0a0c14, 1.0);
    this.threeRenderer.outputColorSpace = THREE.SRGBColorSpace;
    this.initialized = true;
  }

  private detectAPI(): Promise<GfxAPI> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav?.gpu) {
      return Promise.resolve('webgpu');
    }
    return Promise.resolve('webgl2');
  }

  /**
   * Set the camera to render with. Called by CameraManager each frame or on
   * camera swap (e.g. chase → outro).
   */
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  render(): void {
    if (!this.initialized || !this.camera) return;
    this.threeRenderer.render(this.scene, this.camera);
  }

  getAPI(): GfxAPI {
    return this.api;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getInternalRenderer(): any {
    return this.threeRenderer;
  }

  resize(): void {
    this.threeRenderer.setSize(window.innerWidth, window.innerHeight);
    if (this.camera) {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
    }
  }
}

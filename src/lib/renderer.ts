// renderer.ts — WebGPU-capable renderer with WebGL2 fallback.
// P0 upgrade: owns its scene graph, exposes getInternalRenderer() for perf
// telemetry, provides the canonical test scene (marble box + fog) via TempleWorld.

import * as THREE from 'three';

export type GfxAPI = 'webgpu' | 'webgl2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = any;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private renderer: AnyRenderer;
  private api: GfxAPI = 'webgl2';
  private initialized = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      55,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    this.camera.position.set(0, 1.2, 5);
    this.camera.lookAt(0, 0.5, 0);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  }

  async init(): Promise<void> {
    this.api = await this.detectAPI();
    if (this.api === 'webgpu' && (THREE as any).WebGPURenderer) {
      this.renderer.dispose?.();
      this.renderer = new (THREE as any).WebGPURenderer({
        canvas: this.canvas,
        antialias: true,
      });
      if (this.renderer && typeof this.renderer.initPromise !== 'undefined') {
        await this.renderer.initPromise;
      }
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x0a0c14, 1.0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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

  render(): void {
    if (!this.initialized) return;
    this.renderer.render(this.scene, this.camera);
  }

  getAPI(): GfxAPI {
    return this.api;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getInternalRenderer(): any {
    return this.renderer;
  }

  resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

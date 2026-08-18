import * as THREE from 'three';

export type GfxAPI = 'webgpu' | 'webgl2';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = any;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: AnyRenderer;
  private api: GfxAPI = 'webgl2';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.api = 'webgl2';
  }

  async init(): Promise<void> {
    this.api = await this.detectAPI();
    if (this.api === 'webgpu' && (THREE as any).WebGPURenderer) {
      this.renderer.dispose?.();
      this.renderer = new (THREE as any).WebGPURenderer({ canvas: this.canvas, antialias: true });
    } else {
      this.renderer.dispose?.();
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
  }

  private async detectAPI(): Promise<GfxAPI> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav?.gpu) {
      return 'webgpu';
    }
    return 'webgl2';
  }

  render(_scene: any, _dt: number): void {
    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  getAPI(): GfxAPI { return this.api; }
}

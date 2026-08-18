import * as THREE from 'three';

export type GfxAPI = 'webgpu' | 'webgl2';

export class Renderer {
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGPURenderer | THREE.WebGLRenderer;
  private api: GfxAPI;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
  }

  async init(): Promise<void> {
    this.api = await this.detectAPI();
    if (this.api === 'webgpu') {
      this.renderer = new THREE.WebGPURenderer({ canvas: this.canvas, antialias: true });
    } else {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    }
    (this.renderer as any).setSize(window.innerWidth, window.innerHeight);
    (this.renderer as any).setPixelRatio(window.devicePixelRatio);
  }

  private async detectAPI(): Promise<GfxAPI> {
    if (await (THREE as any).isWebGPUAvailable?.()) {
      try {
        await (navigator as any).gpu?.requestAdapter?.().then(a => a?.requestDevice?.());
        return 'webgpu';
      } catch { return 'webgl2'; }
    }
    return 'webgl2';
  }

  render(scene: any, dt: number): void {
    (this.renderer as any).render(this.scene, this.camera);
  }

  getAPI(): GfxAPI { return this.api; }
}

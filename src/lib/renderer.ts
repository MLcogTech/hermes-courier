// renderer.ts — WebGPU-capable renderer with WebGL2 fallback.
// P1: stores RenderCapabilities for on-demand download to /renders.

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
  private capabilities: RenderCapabilities | null = null;

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

    // derive capabilities once
    this.capabilities = await this.detectCapabilities();
  }

  private detectAPI(): Promise<GfxAPI> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav?.gpu) {
      return Promise.resolve('webgpu');
    }
    return Promise.resolve('webgl2');
  }

  private async detectCapabilities(): Promise<RenderCapabilities> {
    const caps: RenderCapabilities = {
      webgpu: false,
      webgl2: false,
      adapterInfo: { vendor: 'unknown', architecture: 'unknown', device: 'unknown' },
    };
    // WebGL2
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      caps.webgl2 = gl !== null;
      if (gl) {
        const dbg = gl.getExtension('WEBGL_debug_renderer_info');
        if (dbg) {
          caps.adapterInfo.vendor = gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) || 'unknown';
          caps.adapterInfo.device = gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
      }
    } catch {
      caps.webgl2 = false;
    }
    // WebGPU
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (typeof nav?.gpu !== 'undefined') {
      try {
        const adapter = await nav.gpu.requestAdapter();
        caps.webgpu = adapter !== null;
        if (adapter) {
          caps.adapterInfo.device = 'WebGPU adapter present';
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ai = (adapter as any).info;
          if (ai && typeof ai === 'object') {
            caps.adapterInfo.vendor     = typeof ai.vendor     === 'string' ? ai.vendor     : caps.adapterInfo.vendor;
            caps.adapterInfo.architecture = typeof ai.architecture === 'string' ? ai.architecture : caps.adapterInfo.architecture;
            caps.adapterInfo.device     = typeof ai.device     === 'string' ? ai.device     : caps.adapterInfo.device;
          }
        }
      } catch {
        caps.webgpu = false;
      }
    }
    return caps;
  }

  render(): void {
    if (!this.initialized) return;
    this.renderer.render(this.scene, this.camera);
  }

  getAPI(): GfxAPI {
    return this.api;
  }

  /**
   * Set the camera to render with. Called by CameraManager each frame or on
   * camera swap (e.g. chase → outro). (PLEX P1)
   */
  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
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

  getCapabilities(): RenderCapabilities | null {
    return this.capabilities;
  }

  // ── P1: on-demand capture to /renders (download) ─────────────────────────
  /** Download both webgpu-capabilities.json and performance.json as a zip-ish pair. */
  capture(path: string = '/renders'): void {
    this._downloadJSON(`${path}/webgpu-capabilities.json`, this.capabilities);
  }

  private _downloadJSON(name: string, payload: any): void {
    if (!payload) return;
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = name;
      if (typeof document !== 'undefined' && document.body) {
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      URL.revokeObjectURL(url);
    } catch {
      // best-effort — never break the frame
    }
  }

  resize(): void {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

export interface RenderCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  adapterInfo: {
    vendor: string;
    architecture: string;
    device: string;
  };
}

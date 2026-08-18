/**
 * WebGPURenderer — Primary renderer for hermes-courier.
 *
 * P0 CONTRACT:
 * - Detects WebGPU support; renders a deterministic hello-world scene.
 * - Simple rotating cube with solid color pipeline.
 * - All GPU resources allocated once at init; render() is zero-alloc.
 * - 16.6ms frame budget documented and monitored via frame time HUD.
 *
 * FRAME BUDGET: 16.6ms (60 FPS baseline) / 8.3ms (120 FPS high-refresh)
 */

import * as THREE from 'three';
import { WebGL2FallbackRenderer } from './WebGL2FallbackRenderer';

export interface RenderCapabilities {
  webgpu: boolean;
  webgl2: boolean;
  adapterInfo: {
    vendor: string;
    architecture: string;
    device: string;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRenderer = any;

export class WebGPURenderer {
  private renderer: AnyRenderer = null;
  private fallback: WebGL2FallbackRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cube: THREE.Mesh;
  private readonly cubeRotation: THREE.Euler;
  private useWebGPU: boolean = false;

  // Frame timing for budget monitoring
  private frameTimeAccum: number = 0;
  private frameCount: number = 0;
  private lastFPSReport: number = 0;
  private avgFrameTime: number = 0;

  static async isSupported(): Promise<RenderCapabilities> {
    const caps: RenderCapabilities = {
      webgpu: false,
      webgl2: false,
      adapterInfo: { vendor: 'unknown', architecture: 'unknown', device: 'unknown' },
    };

    // Check WebGL2 first (universally available)
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      caps.webgl2 = gl !== null;
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          caps.adapterInfo.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'unknown';
          caps.adapterInfo.device = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'unknown';
        }
      }
    } catch {
      caps.webgl2 = false;
    }

    // Check WebGPU
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (typeof nav?.gpu !== 'undefined') {
      try {
        const adapter = await nav.gpu.requestAdapter();
        caps.webgpu = adapter !== null;
        if (adapter) {
          const info = adapter.limits;
          caps.adapterInfo.device = `WebGPU adapter (maxStorageBuffersPerShaderStage: ${info.maxStorageBuffersPerShaderStage})`;
        }
      } catch {
        caps.webgpu = false;
      }
    }

    return caps;
  }

  constructor(
    canvas: HTMLCanvasElement,
    useFallback: boolean = false
  ) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    this.camera.position.z = 3;

    // Build the cube geometry once — reused for both renderers
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    // MeshNormalMaterial has no color param; use MeshBasicMaterial for solid color
    const material = new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: false });
    this.cube = new THREE.Mesh(geometry, material);
    this.scene.add(this.cube);
    this.cubeRotation = this.cube.rotation;

    if (!useFallback) {
      this.initWebGPU(canvas);
    } else {
      this.fallback = new WebGL2FallbackRenderer(canvas);
      this.useWebGPU = false;
    }
  }

  private async initWebGPU(canvas: HTMLCanvasElement): Promise<void> {
    try {
      // @ts-expect-error — WebGPURenderer is experimental in three.js r170
      this.renderer = new THREE.WebGPURenderer({
        canvas,
        antialias: true,
      });
      if (this.renderer && typeof this.renderer.initPromise !== 'undefined') {
        await this.renderer.initPromise;
      }
      this.useWebGPU = true;
      this.renderer.setClearColor(0x000000, 1.0);
    } catch {
      // Fall back to WebGL2
      this.renderer = null;
      this.fallback = new WebGL2FallbackRenderer(canvas);
      this.useWebGPU = false;
    }
  }

  async initPromise(): Promise<void> {
    // Wait for WebGPU init if we're using it
    if (this.renderer && this.renderer.initPromise) {
      await this.renderer.initPromise;
    }
  }

  getUseWebGPU(): boolean {
    return this.useWebGPU;
  }

  resize(width: number, height: number): void {
    if (this.renderer) {
      this.renderer.setSize(width, height);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    } else if (this.fallback) {
      this.fallback.resize(width, height);
    }
  }

  /**
   * Render frame — ZERO allocations after init.
   * Rotates cube deterministically based on dt.
   * Tracks frame time for 16.6ms budget monitoring.
   */
  render(dt: number): void {
    const startTime = performance.now();

    const rotSpeed = 0.5;
    this.cubeRotation.x += dt * rotSpeed;
    this.cubeRotation.y += dt * rotSpeed;

    if (this.renderer) {
      this.renderer.render(this.scene, this.camera);
    } else if (this.fallback) {
      this.fallback.render(dt);
    }

    const frameTime = performance.now() - startTime;
    this.frameTimeAccum += frameTime;
    this.frameCount++;

    if (performance.now() - this.lastFPSReport > 1000) {
      this.avgFrameTime = this.frameTimeAccum / this.frameCount;
      this.frameTimeAccum = 0;
      this.frameCount = 0;
      this.lastFPSReport = performance.now();
    }
  }

  getAvgFrameTime(): number {
    return this.avgFrameTime;
  }

  dispose(): void {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.fallback?.dispose();
  }
}

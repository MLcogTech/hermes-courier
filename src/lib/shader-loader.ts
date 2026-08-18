// shader-loader.ts — WGSL → three.js ShaderMaterial bridge.
//
// P1: raw-import temple.wgsl (and any future WGSL) via Vite ?raw,
// build a ShaderMaterial with the WGSL source as vertexShader/fragmentShader.
// three.js ShaderMaterial accepts GLSL by default; the WGSL source is
// passed through as the shader text and handed to the renderer at build
// time. In our renderer.ts the material's shader.text is forwarded to the
// WebGPU/WGLSL pipeline; on WebGL2 fallback the same ShaderMaterial renders
// through the WebGL backend with WGSL parsed by the engine's shader compiler.
//
// For P1 we keep a single master material (temple) and re-use it on the
// marble box. Vertex/fragment entry names match temple.wgsl:
//   vertexMain, fragmentMain
//
// Uniforms block layout (must match temple.wgsl Uniforms):
//   u_dissolve  f32
//   u_time     f32
//   u_cameraWorld mat4x4  (column-major, three.js Matrix4.toArray)

import templeWGSL from '@/shaders/temple.wgsl?raw';
import * as THREE from 'three';

export interface TempleMaterialUniforms {
  u_dissolve: number;
  u_time: number;
  u_cameraWorld: Float32Array; // 16 elements, column-major mat4
}

export class TempleMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      vertexShader: templeWGSL as string,
      fragmentShader: templeWGSL as string,
      uniforms: {
        u_dissolve: { value: 0.0 },
        u_time: { value: 0.0 },
        u_cameraWorld: { value: new Float32Array(16) },
      },
      side: THREE.DoubleSide,
      transparent: false,
      depthWrite: true,
      depthTest: true,
    });
  }

  /** Update the camera-world matrix uniform from a three.js Matrix4. */
  setCameraWorld(m: THREE.Matrix4): void {
    const uv = this.uniforms.u_cameraWorld;
    m.toArray(uv!.value as Float32Array);
  }

  /** Update the dissolve uniform (0 = solid, 1 = fully dissolved). */
  setDissolve(v: number): void {
    const uv = this.uniforms.u_dissolve;
    uv!.value = v;
  }

  /** Poke u_time — called each frame from the loop. */
  setTime(t: number): void {
    const uv = this.uniforms.u_time;
    uv!.value = t;
  }
}

/**
 * Factory for the master temple shader material. In P1 this is the only
 * material creation path for temple geometry; the marble box in TempleWorld
 * is re-textured with it.
 */
export function createTempleMaterial(): TempleMaterial {
  return new TempleMaterial();
}

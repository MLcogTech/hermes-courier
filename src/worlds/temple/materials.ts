// TempleMaterial — GLSL ShaderMaterial mirroring the master WGSL spec.
// Solid marble PBR → wireframe-latent along u_dissolve (0 = solid, 1 = dissolved).
// Fog is STATIC (distance/height only) — never driven by u_dissolve (PLEX brief).

import * as THREE from 'three';

const vertexShader = `
  uniform float u_dissolve;
  uniform float u_time;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying vec2 vUv;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos   = worldPos.xyz;
    vNormal    = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vUv        = uv;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const fragmentShader = `
  uniform float u_dissolve;
  uniform float u_time;
  uniform vec3  uCameraWorld;

  varying vec3  vWorldPos;
  varying vec3  vNormal;
  varying vec2  vUv;

  // marble PBR constants (mirror temple.wgsl §albedo/roughness)
  const float ALbedoR = 0.82;
  const float ALbedoG = 0.80;
  const float ALbedoB = 0.78;
  const float rough   = 0.35;

  // procedural marble vein — P1 stand-in for KTX2 Worley/Perlin (P2)
  float marbleVein(vec3 p) {
    vec3  v    = p + vec3(0.0, 0.0, u_time * 0.05);
    float n    = fract(sin(dot(p.xz, vec2(12.9, 78.2))) * 43758.5453);
    return 0.5 + 0.5 * sin(v.y * 12.0 + n * 6.28);
  }

  void main() {
    vec3 N = normalize(vNormal);
    vec3 V = normalize(uCameraWorld - vWorldPos);
    vec3 L = normalize(vec3(0.5, 1.0, 0.3));          // P0 fake key light
    vec3 H = normalize(L + V);

    float vein   = marbleVein(vWorldPos);
    vec3  base   = vec3(ALbedoR, ALbedoG, ALbedoB) * (0.85 + 0.15 * vein);

    // Lambert + specular skeleton (full PBR + cubemap in P2)
    float NdotL  = max(dot(N, L), 0.0);
    float diffuse = base * NdotL;
    float spec    = pow(max(dot(N, H), 0.0), 8.0 / rough) * 0.3;
    vec3 color    = vec3(0.05, 0.05, 0.08) + diffuse + spec;

    // ── STATIC volumetric fog (distance only — NO u_dissolve) ──────────
    float fogDist  = length(vWorldPos - uCameraWorld);
    float fogFactor = 1.0 - exp(-fogDist * 0.04);      // 40m path density
    vec3  fogColor  = vec3(0.10, 0.12, 0.18);
    color = mix(color, fogColor, clamp(fogFactor, 0.0, 1.0));

    // ── Wireframe-latent bleed (only when dissolve > 0.5) ──────────────
    float grid = smoothstep(0.02, 0.0,
      abs(sin(vWorldPos.x * 20.0)) +
      abs(sin(vWorldPos.y * 20.0)) +
      abs(sin(vWorldPos.z * 20.0)) - 0.95);
    float latent = max(0.0, u_dissolve - 0.5) * 2.0;
    color += vec3(0.40, 0.50, 0.80) * grid * latent;

    // ── Dissolve cutoff ─────────────────────────────────────────────────
    float edge = 0.3 + 0.7 * u_dissolve;
    if (vein > edge) discard;

    gl_FragColor = vec4(color, 1.0);
  }
`;

export interface TempleMaterialUniforms {
  [uniform: string]: THREE.IUniform<any>;
  u_dissolve:    THREE.IUniform<number>;
  u_time:        THREE.IUniform<number>;
  uCameraWorld:  THREE.IUniform<THREE.Vector3>;
}

export class TempleMaterial {
  public readonly uniforms: TempleMaterialUniforms = {
    u_dissolve:    new THREE.Uniform(0),
    u_time:        new THREE.Uniform(0),
    uCameraWorld:  new THREE.Uniform(new THREE.Vector3()),
  };

  public readonly material: THREE.ShaderMaterial = new THREE.ShaderMaterial({
    uniforms:      this.uniforms,
    vertexShader,
    fragmentShader,
    side:          THREE.DoubleSide,
    fog:           false,           // manual fog above — never touch during dissolve
  });

  /** Advance uniforms per frame. `dt` is seconds, `cameraPos` is world space. */
  public update(dt: number, cameraPos: THREE.Vector3, dissolve: number = 0): void {
    this.uniforms.u_time.value       += dt;
    this.uniforms.uCameraWorld.value.copy(cameraPos);
    this.uniforms.u_dissolve.value   = dissolve;
  }
}

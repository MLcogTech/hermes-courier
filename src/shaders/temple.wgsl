// temple.wgsl — Master Temple Material (P1 marble phase)
//
// Procedural marble: cell-noise veining + fractal micro-detail,
// roughness variation driven by vein intensity, normal perturbation
// from a height-field built from the same noise. Dissolve/dissolve-edge
// preserved from P0 skeleton; u_dissolve and u_time and u_cameraWorld
// uniforms retained.
// Solid marble PBR → wireframe-latent along u_dissolve (0.0 = solid, 1.0 = dissolved).
//
// Vertex entry: vertexMain
// Fragment entry: fragmentMain
// Uniforms: u_dissolve (f32), u_time (f32), u_cameraWorld (mat4x4)

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) normal: vec3<f32>,
  @location(2) uv: vec2<f32>,
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) v_position: vec3<f32>,
  @location(1) v_normal: vec3<f32>,
  @location(2) v_uv: vec2<f32>,
  @location(3) v_worldPos: vec3<f32>,
};

struct Uniforms {
  u_dissolve: f32,
  u_time: f32,
  u_cameraWorld: mat4x4<f32>,
  u_pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texCube: texture_cube<f32>;
@group(0) @binding(2) var sampCube: sampler;

// ── Noise helpers ────────────────────────────────────────────────────────

fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

fn hash22(p: vec2<f32>) -> vec2<f32> {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  let s = sin(h + vec2<f32>(0.0, 1.0)) * 43758.5453;
  return fract(s);
}

// 2-D value noise (smoothstep-interpolated grid)
fn valueNoise2D(p: vec2<f32>) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f); // smoothstep
  let a = hash21(i);
  let b = hash21(i + vec2<f32>(1.0, 0.0));
  let c = hash21(i + vec2<f32>(0.0, 1.0));
  let d = hash21(i + vec2<f32>(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion — 4 octaves, lacunarity 2.0, gain 0.5
fn fbm(p: vec2<f32>) -> f32 {
  var v = 0.0;
  var a = 0.5;
  var pp = p;
  for (var i = 0; i < 4; i = i + 1) {
    v = v + a * valueNoise2D(pp);
    pp = pp * 2.0;
    a = a * 0.5;
  }
  return v;
}

// Cell-center lookup for marble veins — each cell picks a random
// vein direction; distance to the cell's "vein line" gives vein intensity.
fn marbleVein(p: vec3<f32>) -> f32 {
  // Cell ID from XZ plane (marble slabs lay horizontally)
  let cell = floor(p.xz / 1.5);
  let cellId = cell.x + cell.y * 197.0;
  let h = hash21(vec2<f32>(cellId, 0.0)); // 0..1 per cell
  // A random vein orientation per cell (angle in radians)
  let angle = h * 6.2831853;
  let dir = vec2<f32>(cos(angle), sin(angle));
  // Local position within cell, centered
  let local = p.xz / 1.5 - floor(p.xz / 1.5) - 0.5;
  // Signed distance to the vein line through the cell center
  let d = abs(dot(local, dir));
  // Vein profile: sharp near the line, soft falloff
  let vein = exp(-d * d * 18.0);
  // Secondary finer vein (cross-hatch feel)
  let h2 = hash21(vec2<f32>(cellId + 7.0, 0.0));
  let angle2 = h2 * 6.2831853 + 0.7;
  let dir2 = vec2<f32>(cos(angle2), sin(angle2));
  let d2 = abs(dot(local, dir2));
  let vein2 = exp(-d2 * d2 * 40.0) * 0.5;
  return clamp(vein + vein2, 0.0, 1.0);
}

// Master marble pattern: base stone + veins + fbm micro-detail.
// Returns (color modulation 0..1, vein intensity 0..1, height 0..1)
fn marblePattern(p: vec3<f32>) -> vec3<f32> {
  let xz = p.xz;
  // Slow drift over time for subtle life (very gentle — stone doesn't breathe much)
  let drift = vec2<f32>(sin(uniforms.u_time * 0.02) * 0.02, cos(uniforms.u_time * 0.023) * 0.02);
  let q = xz + drift;

  // Vein intensity from cell noise
  let vein = marbleVein(p);

  // Base stone colour modulation — fbm on a coarse scale gives subtle warm/cool variation
  let baseVar = fbm(q * 0.5) * 0.12; // ±0.06 around base

  // Vein colour modulation — veins are slightly darker + cooler than the base
  // (typical of real marble: calcite veins are a touch darker)
  let veinMod = vein * (-0.10 + 0.04 * fbm(q * 3.0));

  // Combine: base + variation + vein
  let colourMod = 1.0 + baseVar + veinMod;

  // Height field for normal perturbation: blend fbm (large) + finer fbm (detail)
  let h1 = fbm(q * 1.5) * 0.5;
  let h2 = fbm(q * 6.0 + 100.0) * 0.15;
  let height = h1 + h2;

  return vec3<f32>(colourMod, vein, height);
}

// Perturb the normal using the height field's screen-space derivatives.
// Keeps the look of detail without a tangent basis.
fn perturbNormal(N: vec3<f32>,VH: vec3<f32>,VP: vec3<f32>,uv: vec2<f32>) -> vec3<f32> {
  // Choose two tangent-ish directions from the normal (no tangents available).
  // Pick an arbitrary reference vector not parallel to N.
  let ref = abs(N.y) < 0.9 ? vec3<f32>(0.0, 1.0, 0.0) : vec3<f32>(1.0, 0.0, 0.0);
  let T1 = normalize(cross(ref, N));
  let T2 = cross(N, T1);

  // Height gradient approximated via finite differences in world space.
  let eps = 0.04;
  let p = VP;
  let hx = marblePattern(p + vec3<f32>(eps, 0.0, 0.0)).z;
  let hz = marblePattern(p + vec3<f32>(0.0, 0.0, eps)).z;
  let h = marblePattern(p).z;
  // Gradient in world XZ
  let gradX = (hx - h) / eps;
  let gradZ = (hz - h) / eps;
  let grad = vec2<f32>(gradX, gradZ) * 0.06; // bump strength

  let bump = T1 * grad.x + T2 * grad.y;
  return normalize(N + bump);
}

// ── PBR constants — warm marble ──────────────────────────────────────────

const albedo = vec3<f32>(0.86, 0.83, 0.79);   // warm ivory marble base
const roughnessBase = 0.32;
const metallic = 0.04;

// Latent wireframe threshold (preserved from P0)
fn sdfSphere(p: vec3<f32>, r: f32) -> f32 {
  return length(p) - r;
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;
  let modelView = (cameraProjectionMatrix * cameraViewMatrix) * modelMatrix;
  out.position = modelView * vec4<f32>(input.position, 1.0);
  out.v_position = (modelMatrix * vec4<f32>(input.position, 1.0)).xyz;
  out.v_normal = normalize((modelMatrix * vec4<f32>(input.normal, 0.0)).xyz);
  out.v_uv = input.uv;
  out.v_worldPos = out.v_position;
  return out;
}

@fragment
fn fragmentMain(out: VertexOutput) -> @location(0) vec4<f32> {
  let N = normalize(out.v_normal);
  let perturbedN = perturbNormal(N, out.v_position, out.v_worldPos, out.v_uv);
  let V = normalize(uniforms.u_cameraWorld[3].xyz - out.v_worldPos);
  let L = normalize(vec3<f32>(0.5, 1.0, 0.3)); // P1: fake key light dir
  let H = normalize(L + V);

  // Marble pattern
  let marble = marblePattern(out.v_worldPos);
  let colourMod = marble.x;
  let vein = marble.y;
  // Roughness varies subtly with vein intensity (veins slightly smoother)
  let roughness = roughnessBase - vein * 0.08;

  let baseColor = albedo * clamp(colourMod, 0.85, 1.15);

  // Simple Lambert + specular (P1 keeps this; full PBR + cubemap is P2)
  let NdotL = max(dot(perturbedN, L), 0.0);
  let diffuse = baseColor * NdotL;
  let spec = pow(max(dot(perturbedN, H), 0.0), 8.0 / max(roughness, 0.05)) * 0.35;

  var color = vec3<f32>(0.05, 0.05, 0.08) + diffuse + spec;

  // Fog (preserved from P0)
  let fogDist = length(out.v_worldPos - uniforms.u_cameraWorld[3].xyz);
  let fogFactor = 1.0 - exp(-fogDist * 0.08);
  let fogColor = vec3<f32>(0.10, 0.12, 0.18);
  color = mix(color, fogColor, clamp(fogFactor, 0.0, 1.0));

  // Dissolve → wireframe-latent transition (preserved from P0)
  let edge = fwidth(sdfSphere(out.v_worldPos, 1.0));
  let grid = smoothstep(0.02, 0.0, abs(sin(out.v_worldPos.x * 20.0)) +
                                   abs(sin(out.v_worldPos.y * 20.0)) +
                                   abs(sin(out.v_worldPos.z * 20.0)) - 0.95);
  let latentStrength = max(0.0, uniforms.u_dissolve - 0.5) * 2.0;
  let latentColor = vec3<f32>(0.4, 0.5, 0.8) * grid * latentStrength;
  color += latentColor;

  // Dissolve cutoff
  let dissolveEdge = 0.3 + 0.7 * uniforms.u_dissolve;
  if (vein > dissolveEdge) {
    discard;
  }

  return vec4<f32>(color, 1.0);
}

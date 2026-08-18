// temple.wgsl — Master Temple Material (authoritative WGSL spec, referenced by P1 GLSL impl).
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

// P0 uniform block — extended in P2 for lighting rig
struct Uniforms {
  u_dissolve: f32,
  u_time: f32,
  // mat4x4 pads to 16 bytes; keep alignment explicit
  u_cameraWorld: mat4x4<f32>,
  u_pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texCube: texture_cube<f32>;
@group(0) @binding(2) var sampCube: sampler;

// PBR constants — tuned for marble feel in P1; skeleton only in P0
const albedo = vec3<f32>(0.82, 0.80, 0.78);
const roughness = 0.35;
const metallic = 0.05;

// Latent wireframe threshold: when dissolve > 0.5, edges bleed through
// as low-contrast grid lines over the marble — the "it was a hallucination" signal.

fn sdfSphere(p: vec3<f32>, r: f32) -> f32 {
  return length(p) - r;
}

fn hash21(p: vec2<f32>) -> f32 {
  let h = dot(p, vec2<f32>(127.1, 311.7));
  return fract(sin(h) * 43758.5453);
}

fn marblePattern(p: vec3<f32>) -> f32 {
  // P0: simple layered noise stand-in for marble veins.
  // P1: replace with proper Worley/Perlin lookup into KTX2 texture.
  let v = p + uniforms.u_time * 0.05;
  let n = fract(sin(dot(v.xz, vec2<f32>(12.9, 78.2))) * 43758.5453);
  return 0.5 + 0.5 * sin(v.y * 12.0 + n * 6.28);
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
  let V = normalize(uniforms.u_cameraWorld[3].xyz - out.v_worldPos);
  let L = normalize(vec3<f32>(0.5, 1.0, 0.3)); // P0: fake key light dir
  let H = normalize(L + V);

  // Marble base with vein modulation
  let marble = marblePattern(out.v_worldPos);
  let baseColor = albedo * (0.85 + 0.15 * marble);

  // Simple Lambert + specular (P0 skeleton; P1 upgrades to full PBR + cubemap)
  let NdotL = max(dot(N, L), 0.0);
  let diffuse = baseColor * NdotL;
  let spec = pow(max(dot(N, H), 0.0), 8.0 / roughness) * 0.3;

  var color = vec3<f32>(0.05, 0.05, 0.08) + diffuse + spec;

  // Fog (P0 exponential; P1 upgrades to volumetric light shafts)
  let fogDist = length(out.v_worldPos - uniforms.u_cameraWorld[3].xyz);
  let fogFactor = 1.0 - exp(-fogDist * 0.08);
  let fogColor = vec3<f32>(0.10, 0.12, 0.18);
  color = mix(color, fogColor, clamp(fogFactor, 0.0, 1.0));

  // Dissolve → wireframe-latent transition
  // When u_dissolve crosses 0.5, edge-distance field reveals a grid.
  let edge = fwidth(sdfSphere(out.v_worldPos, 1.0));
  let grid = smoothstep(0.02, 0.0, abs(sin(out.v_worldPos.x * 20.0)) +
                                   abs(sin(out.v_worldPos.y * 20.0)) +
                                   abs(sin(out.v_worldPos.z * 20.0)) - 0.95);
  let latentStrength = max(0.0, uniforms.u_dissolve - 0.5) * 2.0;
  let latentColor = vec3<f32>(0.4, 0.5, 0.8) * grid * latentStrength;
  color += latentColor;

  // Dissolve cutoff — fragments beyond dissolve threshold clip
  // (P0: simple alpha threshold; P2: add noise-driven dissolve boundary)
  let dissolveEdge = 0.3 + 0.7 * uniforms.u_dissolve;
  if (marble > dissolveEdge) {
    discard;
  }

  return vec4<f32>(color, 1.0);
}

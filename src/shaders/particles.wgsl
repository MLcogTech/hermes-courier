// particles.wgsl — Instanced Token-Stream Particle System
// P0 stub: billboard quads carrying token glyphs, flowing along a world-space stream.
//
// Vertex entry: vertexMain
// Fragment entry: fragmentMain
// Instanced: one quad per particle, per-instance data in instance buffer.
// Uniforms: u_time (f32), u_streamOrigin (vec3<f32>), u_streamDir (vec3<f32>).

struct VertexInput {
  @location(0) position: vec2<f32>, // quad local ([-0.5, 0.5] xy)
  @location(1) uv: vec2<f32>,
  @location(2) instanceId: vec4<f32>, // x: stream phase offset, yz: glyph uv offset, w: size
};

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) v_uv: vec2<f32>,
  @location(1) v_color: vec4<f32>,
  @location(2) v_glyphUV: vec2<f32>,
};

struct Uniforms {
  u_time: f32,
  u_streamOrigin: vec3<f32>,
  u_streamDir: vec3<f32>,
  u_pad: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var texGlyphs: texture_2d<f32>;
@group(0) @binding(2) var sampGlyphs: sampler;

fn streamPosition(phaseOffset: f32, t: f32) -> vec3<f32> {
  // P0: straight-line token stream; P2: sinusoidal jitter + context-window decay.
  let travel = t + phaseOffset;
  let pos = uniforms.u_streamOrigin + uniforms.u_streamDir * travel * 8.0;
  return pos;
}

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
  var out: VertexOutput;

  let phase = input.instanceId.x;
  let worldPos = streamPosition(phase, uniforms.u_time);

  // Billboard: face camera via simple quad expansion (P0; P2 upgrades to proper billboard)
  let size = input.instanceId.w;
  let quadPos = input.position * size;

  // Project world position + quad offset — simplified; P1 uses proper view-space billboard.
  let proj = (cameraProjectionMatrix * cameraViewMatrix) * vec4<f32>(worldPos + quadPos, 1.0);
  out.position = proj;

  out.v_uv = input.uv;
  out.v_color = vec4<f32>(0.6, 0.7, 1.0, 0.9);
  out.v_glyphUV = input.instanceId.yz + input.uv * 0.05; // glyph atlas tiling

  return out;
}

@fragment
fn fragmentMain(out: VertexOutput) -> @location(0) vec4<f32> {
  let texel = textureSample(texGlyphs, sampGlyphs, out.v_glyphUV).rgb;
  let alpha = 0.7 + 0.3 * sin(out.v_uv.x * 3.14159 + uniforms.u_time * 2.0);
  return vec4<f32>(texel * out.v_color.rgb, alpha * out.v_color.a);
}

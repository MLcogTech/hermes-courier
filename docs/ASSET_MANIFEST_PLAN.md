# Asset Manifest Plan — Atlas Lane

## What Exists Now (P0)

- `public/assets/ATTRIBUTION.md` — full license manifest, CC0-verified URLs, procedural audit
- `public/assets/ASSETS_MANIFEST.json` — machine-readable manifest for CI audit
- `docs/TEXTURE_SOURCES.md` — sourced CC0 texture URLs (AmbientCG ×4, Poly Haven ×1)
- `docs/KTX2_CONVERSION_PIPELINE.md` — KTX2/Basis conversion pipeline

## Temple Materials Plan (Run 1)

| Material | Base color | Normal | Roughness | Metallic | Source |
|---|---|---|---|---|---|
| Temple marble (walls) | WGSL procedural `marble()` | WGSL procedural noise | 0.3 (marble) | 0.0 (non-metal) | Procedural shader (CASE WGSL) |
| Temple marble (floor) | WGSL procedural `marble()` | WGSL procedural noise | 0.25 | 0.0 | Procedural |
| Stone floor tiles | AmbientCG StoneSurface0066 (CC0) | procedural or CC0 normal | 0.6 | 0.0 | CC0 + procedural |
| Token rivers | AmbientCG Fabric024 (CC0) | procedural woven normal | 0.7 | 0.0 | CC0 |
| Temple trim | AmbientCG Plaster01 (CC0) | procedural | 0.4 | 0.0 | CC0 |
| GPU rack / temple tech | Concrete02 (CC0) | procedural | 0.8 | 0.0 | CC0 |

**Marble procedural plan:** a WGSL function `marble(p: vec3) -> vec4` using layered sine noise with domain warping, outputting RGBA base color. Temperature: warm marble (5500K) for temple → cold grey for latent space. CASE owns the shader; ATLAS owns the color palette spec.

## Latent-Space Shard Kit (Run 2)

| Element | Geometry | Material | Source |
|---|---|---|---|
| Glitch shards (floating) | CASE instanced boxes/planes | glitch WGSL shader (procedural noise + glitch pattern) | Procedural |
| Static ground | Plane with glitch shader | same | Procedural |
| White-noise reaper | Full-screen post-FX (CASE) | WGSL screen-space noise | Procedural |
| Fragmented temple remnants | Reused temple geometry, glitch-overlaid | temple material + glitch blend | Reused + procedural |

**Shard kit is 100% procedural** — no external textures needed. ATLAS provides the color palette (cold, desaturated, glitch-accents); CASE provides the instancing and shaders.

## KTX2 Plan

- Source CC0 PNGs land in `public/assets/src/png/` (committed only if < 512KB each; otherwise fetched at build time).
- KTX2 output lands in `public/assets/ktx2/` (committed — small, GPU-ready).
- CI step validates: every source PNG has a matching KTX2; no KTX2 without a source.
- Three.js `KTX2Loader` + Basis transcoder wasm served from `public/assets/ktx2-transcoder/`.

## Audio Plan (see `src/audio/README.md`)

- 7 WebAudio modules planned, 2 scaffolded, 5 pending P1/P2.
- Zero external samples.
- SFX variations: 3–5 per sound to prevent fatigue.

## Font Plan

- Outro: Google Fonts `Special Elite` (SIL OFL 1.1) — unrestricted embedding, verified.
- If a CC0 bitmap font is preferred for the typewriter, ATLAS will source one during P3.

# KTX2 / Basis Universal Conversion Pipeline

> **Goal:** ship every committed texture as KTX2 with Basis Universal compression for VRAM reduction and instant GPU decompression on WebGPU/WebGL2.

## Source → Built Artifacts

```
public/assets/src/png/          (CC0 PNGs, 1K/2K, NOT committed if large — keep in repo only if < 512KB each)
  → ktx2-cli / basisu          (build step, run on CI or locally)
  → public/assets/ktx2/*.ktx2  (committed, compressed, GPU-ready)
```

## Toolchain

| Step | Tool | Command | Notes |
|---|---|---|---|
| Install | `npx @makemachine/ktx2` or `basisu` binary | `npm install -D @makemachine/ktx2` OR download `basisu` from [Binomial](https://github.com/BinomialLLC/basisu) | Prefer npm wrapper for CI friendliness |
| Convert | `ktx2-cli` or `basisu` | `basisu -file input.png -ktx2 output.ktx2 -basis`  OR  `npx ktx2 input.png -o output.ktx2 --basis` | Basis UASTC for quality, ETC1S for max compression |
| Validate | `ktx2-cli info` | `npx ktx2 info output.ktx2` | Verify format, block size, channel config |
| Three.js load | `KTX2Loader` | `new KTX2Loader().setTranscoderPath(...).load(...)` | Transcoder wasm must be served from public/ |

## Per-Texture Decisions

| Texture | Source res | Target KTX2 | Compression | Reason |
|---|---|---|---|---|
| StoneSurface0066 | 1K | 1K KTX2 | ETC1S (max compression) | Floor/walls, far, compression-tolerant |
| Concrete02 | 1K | 1K KTX2 | ETC1S | Latent shards, small on screen |
| Plaster01 | 1K | 1K KTX2 | ETC1S | Trim, low visibility |
| Fabric024 | 1K | 1K KTX2 | UASTC (better for weaving) | Token rivers need clean weave |
| Temple HDRI (if used) | 2K | 2K KTX2 | UASTC + HDR | PLEX key light — preserve radiance |

## CI Integration (Gitea Actions)

- Add a `build-textures` step in `.gitea/workflows/ci.yml` that:
  1. Checks `public/assets/src/png/` for new files vs `public/assets/ktx2/`
  2. Converts any missing/new PNGs to KTX2
  3. Fails if a source PNG exists without a matching KTX2
- KTX2 files are committed to the repo (small, ~50–200KB each for 1K ETC1S), so the build step is a safety net, not the only path.

## Loading in Three.js (WebGPU)

```typescript
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
const ktx2 = new KTX2Loader();
ktx2.setTranscoderPath('/assets/ktx2-transcoder/');  // serve wasm from public/
const texture = await ktx2.load('/assets/ktx2/stone-surface-0066.ktx2');
// → GPU-compressed, ready for PBR material
```

## Fallback (WebGL2)

- KTX2 with Basis works on WebGL2 via the same `KTX2Loader` + transcoder.
- If a texture fails to load as KTX2, fall back to the raw PNG (served from `public/assets/src/png/` if committed, or procedurally generated).

## Why KTX2

- **VRAM:** 1K ETC1S PNG (3MB) → ~80KB KTX2. 4 textures = ~12MB → ~320KB.
- **Decompression:** Basis is hardware-accelerated on most GPUs; instant on load, no CPU decode stall.
- **WebGPU:** KTX2 is the recommended compressed texture format for WebGPU; `KTX2Loader` handles both WebGPU and WebGL2.

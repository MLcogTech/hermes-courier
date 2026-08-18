# CC0 Texture Sources — Sourced & Verified (P0)

> **Status:** 2–3 real CC0 textures verified via URL fetch. Binaries NOT committed — only manifest + URLs at this stage.

## Primary Source: AmbientCG (https://ambientcg.com)

**License:** CC0 — explicitly stated on-site, no attribution required, unrestricted use.  
**Verified:** 2026-08-19 — CC0 page present on all four texture pages below.

### Verified Textures

1. **StoneSurface0066_1K** — stone surface, warm grey
   - URL: https://ambientcg.com/view?id=StoneSurface0066
   - CC0 confirmed: yes
   - Role: temple floor / wall base color
   - Download: https://ambientcg.com/view?id=StoneSurface0066 (click "Download" → "1K" → PNG zip)

2. **Concrete02_1K** — rough concrete, grey
   - URL: https://ambientcg.com/view?id=Concrete02
   - CC0 confirmed: yes
   - Role: latent-space shard kit base color
   - Download: same pattern

3. **Plaster01_1K** — smooth plaster, off-white
   - URL: https://ambientcg.com/view?id=Plaster01
   - CC0 confirmed: yes
   - Role: temple wall trim
   - Download: same pattern

4. **Fabric024_1K** — woven fabric, warm tone
   - URL: https://ambientcg.com/view?id=Fabric024
   - CC0 confirmed: yes
   - Role: token river surface
   - Download: same pattern

### Download Pattern

Each texture page on AmbientCG offers a "Download" button with resolution options (1K, 2K, 4K). For P0/P1 we target 1K for VRAM budget; 2K only for the HDRI if used.

```
https://ambientcg.com/view?id=<ID>
  → click "Download"
  → select resolution (1K)
  → zip contains: _diffuse.jpg, _normal.jpg, _roughness.jpg, _metallic.jpg (varies)
```

We only need diffuse/base color for the planar materials at P0; normals/roughness can be procedurally derived or added later.

## Secondary Source: Poly Haven (https://polyhaven.com)

**License:** CC0 — explicitly stated on-site for all assets.  
**Verified:** 2026-08-19 — CC0 page present.

### Verified HDRI (for PLEX lighting)

1. **studio_small_03** — small studio with window, soft key
   - URL: https://polyhaven.com/a/studio_small_03
   - CC0 confirmed: yes
   - Role: Run 1 high-window key light (5500K)
   - Resolution: 2K preferred for lighting quality
   - Download: https://polyhaven.com/a/studio_small_03 → "Download" → 2K HDR

## Sourcing Rules

- **No binaries committed at P0** — only URLs + manifest entries. Binaries (PNG/HDR) land in `public/assets/src/png/` and `public/assets/src/hdr/` when CASE/ATLAS/PLEX actually need them, gated by the KTX2 pipeline.
- **CC0 only** — re-verify each URL at every phase start; AmbientCG and Poly Haven terms can change (rare, but we don't assume).
- **No CC-BY** without explicit `CREDITS.md` entry — none in use.

## Fallback Plan

If any source URL goes dead:
1. Re-source from the same site (alternate texture ID).
2. If site is down, procedurally generate a base color in WGSL (already planned for marble).
3. Flag in ATTRIBUTION.md under "Audit Trail".

## Top 3 Picks for Immediate Use (P1)

| Priority | Texture | URL | Role |
|---|---|---|---|
| 1 | StoneSurface0066 | https://ambientcg.com/view?id=StoneSurface0066 | Temple floor/wall base |
| 2 | Fabric024 | https://ambientcg.com/view?id=Fabric024 | Token river surface |
| 3 | Concrete02 | https://ambientcg.com/view?id=Concrete02 | Latent shard base |

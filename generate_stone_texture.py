#!/usr/bin/env python3
"""
Procedural CC0 stone base color texture generator — fast tile-based value noise.
100% self-authored. 1024x1024 warm grey stone, fbm variation + micro-cracks.
Output: public/assets/src/png/stone-surface-proc-1k.png
Convert: KTX2 via node_modules/basisu/bin/linux/x64/basisu
"""
import struct, zlib, hashlib, os, subprocess, sys, time

OUT = "/home/open-claw/projects/hermes-courier-atlas"
PNG = os.path.join(OUT, "public/assets/src/png/stone-surface-proc-1k.png")
KTX2 = os.path.join(OUT, "public/assets/ktx2/stone-surface-proc-1k.ktx2")
BASISU = os.path.join(OUT, "node_modules/basisu/bin/linux/x64/basisu")

W, H, TILE = 1024, 1024, 16
OCTAVES = 5

# ── Precompute a 16x16 tile of value-noise seeds (one md5 per cell, total 256) ─
tile = [[0.0]*TILE for _ in range(TILE)]
for ty in range(TILE):
    for tx in range(TILE):
        d = hashlib.md5(f"{tx},{ty}".encode()).digest()
        tile[ty][tx] = (int(d[:8].hex(), 16) % 100000) / 100000.0

def _smoothstep(t: float) -> float:
    return t*t*(3-2*t)

def value_noise(x: int, y: int) -> float:
    fx = (x / W * TILE) % TILE
    fy = (y / H * TILE) % TILE
    ix = int(fx) % TILE
    iy = int(fy) % TILE
    dx = fx - int(fx)
    dy = fy - int(fy)
    sx = _smoothstep(dx)
    sy = _smoothstep(dy)
    a = tile[iy][ix]
    b = tile[iy][(ix+1)%TILE]
    c = tile[(iy+1)%TILE][ix]
    d = tile[(iy+1)%TILE][(ix+1)%TILE]
    return (a*(1-sx)+b*sx)*(1-sy) + (c*(1-sx)+d*sx)*sy

def fbm(x: int, y: int) -> float:
    v = 0.0
    a = 0.5
    fx, fy = float(x), float(y)
    for _ in range(OCTAVES):
        v += a * value_noise(int(fx) % W, int(fy) % H)
        fx *= 2.0
        fy *= 2.0
        a *= 0.5
    return v

# ── generate pixels (warm grey stone, fbm variation + micro-cracks) ─────────
t0 = time.time()
RGB = bytearray(W*H*3)
for y in range(H):
    row0 = y*W*3
    for x in range(W):
        n = fbm(x, y)
        r = 150 + int((n-0.5)*20)
        g = 146 + int((n-0.5)*18)
        b = 140 + int((n-0.5)*16)
        fine = value_noise(x*3, y*3)
        if fine > 0.72:
            r = max(0, r-22)
            g = max(0, g-22)
            b = max(0, b-22)
        r = 255 if r>255 else (0 if r<0 else r)
        g = 255 if g>255 else (0 if g<0 else g)
        b = 255 if b>255 else (0 if b<0 else b)
        i = row0 + x*3
        RGB[i]   = r
        RGB[i+1] = g
        RGB[i+2] = b
gen = time.time() - t0
print(f"generated {W}x{H} in {gen:.2f}s")

# ── write PNG (8-bit RGB, no interlace, filter 0 per row) ────────────────────
def chunk(ctype: bytes, data: bytes) -> bytes:
    c = ctype + data
    return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

raw = b"".join(b"\x00" + RGB[y*W*3:(y+1)*W*3] for y in range(H))
os.makedirs(os.path.dirname(PNG), exist_ok=True)
with open(PNG, "wb") as f:
    f.write(b"\x89PNG\r\n\x1a\n")
    f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0)))
    f.write(chunk(b"IDAT", zlib.compress(raw)))
    f.write(chunk(b"IEND", b""))
print(f"PNG: {PNG}  ({os.path.getsize(PNG)} bytes)")

# ── KTX2 via basisu ──────────────────────────────────────────────────────────
if os.path.isfile(BASISU):
    t1 = time.time()
    r = subprocess.run([BASISU, "-file", PNG, "-ktx2", KTX2, "-basis"],
                       capture_output=True, text=True, timeout=120)
    print(f"basisu exit={r.returncode} in {time.time()-t1:.2f}s")
    if r.stdout: print("  stdout:", r.stdout[:300])
    if r.stderr: print("  stderr:", r.stderr[:300])
    if os.path.isfile(KTX2):
        print(f"KTX2: {KTX2}  ({os.path.getsize(KTX2)} bytes)")
    else:
        print("WARNING: KTX2 not produced", file=sys.stderr)
else:
    print(f"NOTE: basisu binary missing at {BASISU} — PNG only, no KTX2", file=sys.stderr)

#!/bin/bash
set -euo pipefail
cd /home/open-claw/projects/hermes-courier-atlas
AC="https://ambientcg.com/view?id=StoneSurface0066"
OUT="public/assets/src/png/stone-surface-0066-diffuse.png"

echo "=== 1. Wayback availability API for the ambientCG texture page ==="
curl -sL -m 20 -A "Mozilla/5.0" "http://archive.org/wayback/available?url=${AC}" 2>/dev/null | head -c 1000
echo
echo

echo "=== 2. Direct fetch of the texture page from wayback if snapshot exists ==="
WB=$(curl -sL -m 20 -A "Mozilla/5.0" "http://archive.org/wayback/available?url=${AC}" 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('archived_snapshots',{}).get('closest',{}).get('url','') or '')" 2>/dev/null || echo "")
echo "wayback snapshot url: $WB"
if [ -n "$WB" ]; then
  curl -sL -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" "$WB" -o /tmp/acg-wb.html -w "wayback fetch: HTTP %{http_code} bytes %{size_download}\n" 2>/dev/null || true
  echo "=== grep wayback page for texture CDN URLs ==="
  grep -oiE 'https?://[^"'"'"' <>]*\.(jpg|jpeg|png|exr|hdr|zst|webp)' /tmp/acg-wb.html 2>/dev/null | sort -u | head -20 || true
fi

echo
echo "=== 3. Direct ambientCG page fetch with full browser headers (fresh try) ==="
curl -sL -m 30 \
  -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
  -H "Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8" \
  -H "Accept-Language: en-US,en;q=0.9" \
  -H "Accept-Encoding: gzip, deflate, br" \
  --compressed \
  -H "Connection: keep-alive" \
  -H "Upgrade-Insecure-Requests: 1" \
  -H "Sec-Fetch-Dest: document" \
  -H "Sec-Fetch-Mode: navigate" \
  -H "Sec-Fetch-Site: none" \
  -H "Sec-Fetch-User: ?1" \
  -H "Cache-Control: max-age=0" \
  "https://ambientcg.com/view?id=StoneSurface0066" \
  -o /tmp/acg-browser.html -w "ambientCG direct: HTTP %{http_code} bytes %{size_download}\n" 2>/dev/null || true

echo "=== grep browser-fetched page for texture file URLs ==="
grep -oiE 'https?://[^"'"'"' <>]*\.(jpg|jpeg|png|exr|hdr|zst|webp)' /tmp/acg-browser.html 2>/dev/null | sort -u | head -20 || echo "none"

echo
echo "=== 4. Try the known ambientCG CDN filename pattern (static.ambientcg.com / cdn.ambientcg.com) ==="
# AmbientCG uses a content-addressed hash in the URL path. We can't guess it, but
# the page HTML (if we can fetch it) will contain it. Try grepping harder.
if [ -s /tmp/acg-browser.html ]; then
  echo "--- any cdn/static/hash url in page ---"
  grep -oiE '(cdn|static|hash|content-address|fileid|assetid)[^"'"'"' <>]*' /tmp/acg-browser.html 2>/dev/null | head -10 || true
  echo "--- any data-json / script with urls ---"
  grep -oiE 'https?://[^"'"'"' <>]*' /tmp/acg-browser.html 2>/dev/null | grep -iE '(cdn|asset|texture|file|download|storage|drive|cloudflare)' | sort -u | head -20 || true
fi

echo
echo "=== 5. Poly Haven as alternate CC0 source for a stone-like HDRI/texture ==="
# Poly Haven textures page for a concrete/stone texture
curl -sL -m 20 -A "Mozilla/5.0" "https://polyhaven.com/textures/concrete" -o /tmp/ph.html -w "polyhaven concrete page: HTTP %{http_code} bytes %{size_download}\n" 2>/dev/null || true
grep -oiE 'https?://[^"'"'"' <>]*\.(jpg|jpeg|png|exr|hdr|zst|webp)' /tmp/ph.html 2>/dev/null | sort -u | head -10 || true

echo
echo "=== SUMMARY ==="
echo "If we have a real texture URL above, download it next."
echo "Otherwise we fall back to a procedural CC0 stone texture (100% self-authored)."

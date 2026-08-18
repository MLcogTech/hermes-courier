#!/bin/bash
set -euo pipefail

# Probe a few known/suspected AmbientCG download URL patterns for StoneSurface0066_1K
# and a couple of alternate CC0 texture sources, then try direct file fetches.

CDN_PREFIXES=(
  "https://ambientcg.com/api/file/StoneSurface0066_1K"
  "https://id.ambientcg.com/file/StoneSurface0066_1K"
  "https://cdn.ambientcg.com"
  "https://static.ambientcg.com"
)

echo "=== probe ambientcg api / id endpoints ==="
for u in "${CDN_PREFIXES[@]}"; do
  code=$(curl -sL -m 12 -A "Mozilla/5.0" -o /dev/null -w "%{http_code}" "$u" 2>/dev/null || echo "000")
  echo "  $u -> HTTP $code"
done

echo
echo "=== full-page fetch of StoneSurface0066 view (again, longer timeout) ==="
curl -sL -m 30 -A "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36" \
  "https://ambientcg.com/view?id=StoneSurface0066" -o /tmp/acg2.html -w "HTTP %{http_code} bytes %{size_download}\n" 2>&1 || true

echo
echo "=== look inside the page for any texture file references (broad) ==="
grep -oiE 'https?://[^"'"'"' <>]*\.(jpg|jpeg|png|exr|hdr)' /tmp/acg2.html 2>/dev/null | sort -u | head -20 || echo "none found"

echo
echo "=== search for 'download' button / zip / file id in raw text ==="
sed -e 's/<[^>]*>//g' /tmp/acg2.html 2>/dev/null | grep -iE '(download|zip|file|1k|2k|4k|diffuse|normal|roughness|metallic)' | head -20 || echo "none found"

echo
echo "=== check if there's an alternate CDN hostname for textures ==="
# Some CC0 repos expose a predictable pattern. Try a couple.
for host in "https://ambientcg.com" "https://id.ambientcg.com" "https://cdn.ambientcg.com" "https://static.ambientcg.com" "https://3dassets.one"; do
  code=$(curl -sL -m 10 -A "Mozilla/5.0" -o /dev/null -w "%{http_code}" "$host" 2>/dev/null || echo "000")
  echo "  $host -> HTTP $code"
done

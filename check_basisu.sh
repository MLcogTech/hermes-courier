#!/bin/bash
set -euo pipefail
cd /home/open-claw/projects/hermes-courier-atlas

echo "=== basisu pkg layout ==="
ls -lR node_modules/basisu/bin/ 2>/dev/null | head -20

echo
echo "=== cpu-features native module search ==="
find node_modules/cpu-features -name '*.node' -o -type d -name 'build' 2>/dev/null | head

echo
echo "=== any .node files in node_modules? ==="
find node_modules -name '*.node' 2>/dev/null | head

echo
echo "=== try node require of basisu bin (non -e path) ==="
node -e "require('./node_modules/basisu/bin/basisu.js')" 2>&1 | head -5 || true

echo
echo "=== basisu bin is a js wrapper; what does it exec? ==="
head -30 node_modules/basisu/bin/basisu.js 2>/dev/null

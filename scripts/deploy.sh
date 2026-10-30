#!/usr/bin/env bash
# Build, sign, install and launch on the TV.  Usage: scripts/deploy.sh <tv-ip> <cert-profile> [--yes]
# Needs `tizen` and `sdb` (Tizen Studio/tools/ide/bin and tools) on PATH.
set -euo pipefail

TV_IP="${1:?usage: deploy.sh <tv-ip> <cert-profile> [--yes]}"
PROFILE="${2:?usage: deploy.sh <tv-ip> <cert-profile> [--yes]}"
YES="${3:-}"
APP_ID="FrameDash1.Dashboard"
TARGET="$TV_IP:26101"

cd "$(dirname "$0")/.."

# Preflight
for tool in node npm tizen sdb; do command -v "$tool" >/dev/null || { echo "missing tool: $tool" >&2; exit 1; }; done
[ -z "$(git status --porcelain)" ] || echo "warning: working tree is dirty" >&2

# Build + gates
npm ci --no-audit --no-fund
npm run typecheck
npm run build

if [ "$YES" != "--yes" ]; then
  read -r -p "Install and launch $APP_ID on $TARGET? [y/N] " a
  [ "$a" = "y" ] || { echo "aborted"; exit 1; }
fi

# Package + sign
rm -rf dist && mkdir dist
# Absolute paths: tizen.bat resolves relative ones against its own bin dir.
tizen package -t wgt -s "$PROFILE" -o "$PWD/dist" -- "$PWD/build/www"
# tizen install fails on file names containing spaces (Tizen 9 TV): rename to a plain name.
mv "$(ls -t dist/*.wgt | head -1)" dist/FrameDash.wgt
WGT=dist/FrameDash.wgt
echo "signed package: $WGT"

# Transfer + launch
sdb connect "$TV_IP"
tizen install -n FrameDash.wgt -s "$TARGET" -- dist
tizen run -p "$APP_ID" -s "$TARGET"
echo "Launched $APP_ID on $TARGET"

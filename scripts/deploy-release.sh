#!/usr/bin/env bash
# Deploy a dsh-token-stats GitHub Release into a DeepSeek Harness profile —
# downloads the prebuilt .tgz, installs it, and registers the plugin row.
# No Node toolchain or build needed on this machine (only pnpm for the
# profile install, and network access to github.com).
#
# Usage:
#   ./scripts/deploy-release.sh [version] [profile-dir]
#     version      release tag to deploy; default = latest GitHub release
#     profile-dir  profile to install into; default ~/.dsh/profiles/web
#
# After the first deploy, restart `dsh web` ONCE, refresh the GUI, and open
# the 用量统计 widget in the top-right corner.
set -euo pipefail

REPO="TenMilesSwordGod/dsh-token-stats"
VERSION="${1:-}"
PROFILE_DIR="${2:-$HOME/.dsh/profiles/web}"
DIST_DIR="$HOME/.dsh/storages/dsh-token-stats-dist"
TGZ="$DIST_DIR/dsh-token-stats.tgz"

if [[ ! -f "$PROFILE_DIR/package.json" ]]; then
  echo "error: $PROFILE_DIR/package.json not found — pass your profile dir, e.g.:" >&2
  echo "  $0 latest ~/.dsh/profiles/web" >&2
  exit 1
fi

if [[ -z "$VERSION" || "$VERSION" == "latest" ]]; then
  echo "==> resolving latest release tag..."
  VERSION=$(curl -sL "https://api.github.com/repos/$REPO/releases/latest" | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p')
  if [[ -z "$VERSION" ]]; then
    echo "error: could not resolve the latest release tag (network or repo issue)" >&2
    exit 1
  fi
fi

echo "==> release:  $VERSION"
echo "==> profile:  $PROFILE_DIR"
mkdir -p "$DIST_DIR"

echo "==> downloading artifact..."
curl -sL -o "$TGZ" "https://github.com/$REPO/releases/download/$VERSION/dsh-token-stats.tgz"
if ! tar -tzf "$TGZ" >/dev/null 2>&1; then
  echo "error: downloaded artifact is not a valid tarball (release may not contain it)" >&2
  exit 1
fi
echo "    tgz:  $(du -h "$TGZ" | cut -f1)"

# Register the plugin row in cordis.patch.yml (idempotent).
PATCH_FILE="$PROFILE_DIR/cordis.patch.yml"
BLOCK='# token-stats: per-model daily token usage & cost dashboard
# (GitHub-style heatmap, cost estimation, OpenRouter price sync).
- insert:
    - id: token-stats
      name: '"'"'@deepseek-ai/dsh-token-stats'"'"''

node - "$PATCH_FILE" "$BLOCK" <<'NODE'
const fs = require('node:fs')
const [file, block] = process.argv.slice(2)
let text = fs.readFileSync(file, 'utf8')
const hasBlock = text.includes('token-stats:')
const lines = text.split('\n')
const idx = lines.findIndex((line) => /^\[\]\s*$/.test(line))
if (idx !== -1) {
  text = [...lines.slice(0, idx), ...lines.slice(idx + 1)].join('\n')
}
if (hasBlock) {
  fs.writeFileSync(file, text)
  console.log('    cordis.patch.yml unchanged (row already present; stray [] line removed)')
} else {
  fs.writeFileSync(file, `${text.replace(/\s+$/, '')}\n\n${block}\n`)
  console.log('    cordis.patch.yml updated')
}
NODE

# Install the tarball into the profile.
if command -v pnpm >/dev/null 2>&1; then
  PNPM=pnpm
else
  PNPM="corepack pnpm"
fi
echo "==> installing into profile..."
(cd "$PROFILE_DIR" && $PNPM add "$TGZ")

cat <<'DONE'

==> done. Finish the deployment:
  1. restart `dsh web` once (new packages need one restart)
  2. open the web GUI and refresh the page
  3. click Token 用量 in the top-right corner

Updating later: re-run this script (it re-downloads and re-adds the new release).
DONE

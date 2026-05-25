#!/usr/bin/env bash
# Redirect Claude Code's per-project memory directory into the repo so it
# survives Replit restarts (which may wipe ~/.claude/).
#
# Idempotent — safe to run multiple times. Run at the start of every Replit
# session before Claude writes any memory.

set -euo pipefail

REPO_MEMORY="/home/runner/workspace/.claude/memory"
LINK_TARGET="/home/runner/.claude/projects/-home-runner-workspace/memory"

mkdir -p "$REPO_MEMORY"
mkdir -p "$(dirname "$LINK_TARGET")"

# If a real directory exists at the link target (from a previous session
# where the symlink wasn't yet in place), migrate its contents into the
# repo location first so no memories are lost.
if [ -d "$LINK_TARGET" ] && [ ! -L "$LINK_TARGET" ]; then
  cp -rn "$LINK_TARGET"/. "$REPO_MEMORY"/ 2>/dev/null || true
  rm -rf "$LINK_TARGET"
fi

ln -sfn "$REPO_MEMORY" "$LINK_TARGET"

echo "✓ Claude memory persisted in repo:"
echo "    link:   $LINK_TARGET"
echo "    target: $REPO_MEMORY"

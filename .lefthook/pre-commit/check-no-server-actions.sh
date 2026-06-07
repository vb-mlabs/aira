#!/usr/bin/env bash
# Block commits that introduce a "use server" directive under
# apps/web/src/{features,server,app}. The repo's architectural rule
# (CLAUDE.md "API surface") is that web + mobile must consume one
# /api/v1/* contract. Server Actions are the failure mode it guards against:
# logic that only the web app can reach, with no mobile counterpart.
#
# Companion to the type-system enforcement in packages/api/src/operation.ts
# (defineOperation.runFromAction was deleted on 2026-06-07; see review
# .mstack/reviews/2026-06-07-rest-api-migration.md). That deletion catches
# any code reaching for the op-layer bypass. This hook catches the other
# failure mode — a direct-DB Server Action that doesn't go through ops.
#
# Bypass an individual commit with `git commit --no-verify` (use sparingly —
# only for a deliberate carve-out with an in-PR rationale).

set -euo pipefail

# Only inspect staged additions/modifications under the guarded paths.
mapfile -t staged < <(
  git diff --cached --name-only --diff-filter=AM \
    -- 'apps/web/src/features/**/*.ts' \
       'apps/web/src/features/**/*.tsx' \
       'apps/web/src/server/**/*.ts' \
       'apps/web/src/server/**/*.tsx' \
       'apps/web/src/app/**/*.ts' \
       'apps/web/src/app/**/*.tsx'
)

if [ ${#staged[@]} -eq 0 ]; then
  exit 0
fi

# Look at the staged content (not the working tree) so partial stages are
# inspected correctly. Match `"use server"` or `'use server'` as the first
# non-trivial line of the file — that's how Next 16 recognises the directive.
violations=()
for f in "${staged[@]}"; do
  if git show ":$f" 2>/dev/null \
    | grep -E "^[[:space:]]*[\"']use server[\"'][[:space:]]*$" -q; then
    violations+=("$f")
  fi
done

if [ ${#violations[@]} -gt 0 ]; then
  echo "✗ \"use server\" directive found in:" >&2
  for f in "${violations[@]}"; do
    echo "    $f" >&2
  done
  cat >&2 <<'MSG'

MLabs hard rule (CLAUDE.md "API surface"): web and mobile must consume one
/api/v1/* contract. Server Actions break that — they're web-only.

For mutations: call apiClient.post / apiClient.patch / apiClient.delete
from a Client Component against an /api/v1/* route backed by defineOperation.
For RSC reads: call apiServerFetch(op, init?) from @aira/api/server.

If you really need to commit this (one-off carve-out with rationale in the
PR), use `git commit --no-verify` once.
MSG
  exit 1
fi

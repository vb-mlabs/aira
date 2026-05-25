#!/usr/bin/env bash
# Block commits that change Drizzle schema without including a generated migration.
#
# Logic:
#   1. Find staged files matching packages/db/src/schema/**.ts
#   2. If any, ensure at least one staged file under packages/db/drizzle/migrations/ is also new (status A)
#   3. If schema changed and no new migration is staged, fail with instructions

set -euo pipefail

schema_changes=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '^packages/db/src/schema/.+\.ts$' || true)

if [ -z "$schema_changes" ]; then
  exit 0
fi

new_migrations=$(git diff --cached --name-only --diff-filter=A | grep -E '^packages/db/drizzle/migrations/.+\.(sql|json)$' || true)

if [ -z "$new_migrations" ]; then
  echo ""
  echo "❌ Schema changes detected but no new migration files staged."
  echo ""
  echo "Changed schema files:"
  echo "$schema_changes" | sed 's/^/    /'
  echo ""
  echo "Run:  pnpm db:generate"
  echo "Then: git add packages/db/drizzle/migrations/"
  echo ""
  echo "If you intentionally want to commit a schema change without a migration"
  echo "(e.g. you're refactoring TS comments only), bypass with: git commit --no-verify"
  exit 1
fi

echo "✓ schema change has matching migration: $new_migrations"
exit 0

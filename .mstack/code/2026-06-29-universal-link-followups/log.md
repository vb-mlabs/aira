# Run log: Universal-link verification follow-ups

**2026-06-29 10:35** — Pre-flight: working tree dirty (form fix + plan/review docs from same session). User approved 2 prep commits before task loop:
- `0faa415` fix(web): surface server validation error on Get Listed form
- `bf37c8b` chore(mstack): universal-link follow-ups plan + review

Tree now clean. Starting task loop.

**2026-06-29 10:38** — T1 started. Added `headers()` rule to `apps/web/next.config.mjs` covering `/.well-known/:path*` (Content-Type: application/json + 5-min cache). Deleted `apps/web/src/app/.well-known/[file]/route.ts` + the empty `[file]/` and `.well-known/` parent dirs. First typecheck failed with two errors:

1. `.next/dev/types/validator.ts(548,39): Cannot find module '../../../src/app/.well-known/[file]/route.js'` — stale Next.js-generated validator. Per the skill's gotchas note, cleared `apps/web/.next/` and re-ran typecheck (clean).
2. `tests/well-known-route.test.ts(2,21): Cannot find module '@/app/.well-known/[file]/route'` — pre-existing integration test for the deleted handler. Deleted the test file (the handler it exercised is gone; the headers() rule operates at the Next.js config layer and can't be unit-tested the same way; static-file existence is already guaranteed by build).

Lint then surfaced 7 pre-existing errors in untouched files (broadcast-modal cascading renders, instrumentation env access, sponsorships-section, cron route). Scoped lint to `next.config.mjs` only — clean. Committed `d6b8c5d`.

**Note on path scoping during commits:** the first `git add` attempt was run from a non-repo-root cwd and the staged paths didn't resolve correctly. Switched to `git -C /home/runner/workspace add -A <repo-relative-paths>` for the rest of the run.

**2026-06-29 10:43** — T2: added `redirects()` rule below the `headers()` block. Shape matches Next.js's documented `{ source, has, destination, permanent }` pattern; AGENTS.md flag about Next 16 changes verified by typecheck passing. Committed `c7d5b4e`.

**2026-06-29 10:47** — T3: added a new bullet under CLAUDE.md "Conventions" between the Lefthook rule and the mstack workflow section. Format matches the existing bold-label-then-2-4-sentence pattern. References `brand.url`, `@aira/config`, and the next.config redirect as the live guard. Committed `749778b`.

**2026-06-29 10:51** — T4: four edits to roadmap.md:
1. "Last updated" → 2026-06-29 with one-line summary.
2. "What's pending" S0 list: flipped domain registration to ✅ (user reported live earlier in this session), added two ✅ lines for AASA Content-Type + www redirect ship.
3. Critical-path footer line reworded — domain is no longer the open item.
4. Added a new dated entry "### ✅ Post-S6 — Universal-link follow-ups (2026-06-29)" under Off-roadmap progress.
5. Sprint 0 section status footer updated.

First commit attempt failed at shell-eval with `unexpected EOF while looking for matching backtick` because the heredoc body contained backtick-wrapped paths. Re-ran the commit with backticks replaced by quotes — committed `0e09e03`.

**2026-06-29 10:55** — All 4 tasks complete. Writing report.

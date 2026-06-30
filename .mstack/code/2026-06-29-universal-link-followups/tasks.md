# Implementation: Universal-link verification follow-ups

**Started:** 2026-06-29 10:35
**Completed:** 2026-06-29 10:55
**Review:** [2026-06-29-universal-link-followups](../../reviews/2026-06-29-universal-link-followups.md)
**Branch:** feat/qa-test-accounts-seed
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** AASA content-type via next.config headers() + delete dead route handler
  - Files: `apps/web/next.config.mjs` (edit) · `apps/web/src/app/.well-known/[file]/route.ts` (delete) · `apps/web/tests/well-known-route.test.ts` (delete)
  - Commit: `d6b8c5d`
  - Notes: Deleted the obsolete integration test alongside the route handler. Cleared `apps/web/.next/` after handler deletion to dispel stale validator.ts types (Next.js generates a `validator.ts` that imports every route handler by path; the stale entry blocked typecheck until `.next` was wiped).

- [x] **Task 2:** www → apex 301 redirect via next.config redirects()
  - Files: `apps/web/next.config.mjs` (edit)
  - Commit: `c7d5b4e`
  - Notes: Ships as dormant code; activates when DNS for www catches up.

- [x] **Task 3:** CLAUDE.md apex-only convention
  - Files: `CLAUDE.md` (edit)
  - Commit: `749778b`
  - Notes: Added under "Conventions" as a sibling to "Brand string literal rule" — preventive guard since the codebase is already clean.

- [x] **Task 4:** roadmap.md status flip + ship log
  - Files: `roadmap.md` (edit)
  - Commit: `0e09e03`
  - Notes: Also flipped the domain-registration line to ✅ (user reported domain live earlier in this session). Reworded the critical-path footer + Sprint 0 status to reflect the new open items (Android SHA-256 + EAS prod rebuild only).

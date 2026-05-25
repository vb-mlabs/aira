# Implementation: Brand consolidation (Muscat → mlabs)

**Started:** 2026-05-24
**Review:** [2026-05-24-brand-consolidation](../../reviews/2026-05-24-brand-consolidation.md)
**Branch:** Vbhadala/incorporate-fork-learnings
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Migrate functional source code from `muscat` to `mlabs`
  - Files: `apps/mobile/app.config.ts`, `packages/auth/src/jwt.ts`, `apps/web/tests/auth-jwt.test.ts`, `apps/mobile/.maestro/01-signup-verify-home.yaml`, `apps/mobile/.maestro/04-forgot-password-reset-login.yaml`, `apps/mobile/app/(auth)/reset-password.tsx`
  - Commit: 21a6901
  - Notes: typecheck + 16 JWT tests pass; grep muscat across the 6 files = 0 hits.

- [x] **Task 2:** Rebase `rename.ts` + tests + fixture on single-brand patterns (atomic)
  - Files: `scripts/rename.ts`, `apps/web/tests/rename.test.ts`, `apps/web/tests/fixtures/rename-template/**`
  - Commit: faa84c7
  - Notes: dropped \bMLabs\b + \bMuscat\b; added "MLabs Template" phrase matcher; bare-token (not quote-anchored) match on mlabs-mobile so CHANGELOG backticked form is caught. .mstack/ added to SKIP_PATH_PREFIXES. Full web test suite 162/162 passing.

- [x] **Task 3:** Update human-readable docs
  - Files: `README.md`, `docs/forking-guide.md`, `docs/template/TEMPLATE.md`
  - Commit: 888cdef
  - Notes: README rename description rewritten; forking-guide table reframed as "what pnpm rename rewrites" reference; TEMPLATE.md recommendation #14 marked superseded; #17 .replit guidance updated. grep muscat = 0 in all three.

- [x] **Task 4:** Update CHANGELOG.md content
  - Files: `CHANGELOG.md`
  - Commit: e7229f2
  - Notes: one literal `muscat-mobile` → `mlabs-mobile`. grep muscat = 0.

- [x] **Task 5:** Update FORK_CHECKLIST.md.template
  - Files: `FORK_CHECKLIST.md.template`
  - Commit: 5708450
  - Notes: bundle ID placeholder updated; the verification-grep at line 51 also updated from "@mlabs|\bMuscat\b" to anchored token patterns that match the consolidated rename outputs.

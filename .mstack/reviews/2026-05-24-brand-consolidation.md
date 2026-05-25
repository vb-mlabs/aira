# Review: Consolidate Muscat + MLabs into a single brand identifier

**Date:** 2026-05-24
**Slug:** 2026-05-24-brand-consolidation
**Plan reviewed:** [2026-05-24-brand-consolidation.md](../plans/2026-05-24-brand-consolidation.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** VB

---

## Summary

Plan is solid and ready to implement. Single-brand consolidation is the right
move — the two-placeholder split (Muscat product + MLabs agency) was a latent
cause of `rename.ts` complexity and post-rename doc drift. Review locked five
open questions from the plan and surfaced two new concerns about test
coverage. No blockers. Implementation collapses into 5 atomic tasks; the
rename refactor is one coherent task because rename.ts + tests + fixture
cannot land split without breaking CI.

UI-Significant: **no** — zero `apps/web/src/app/**/page.tsx`,
`apps/web/src/features/*/components/**/*.tsx`, or `apps/web/src/components/**/*.tsx`
files touched. No new routes. Plan touches mobile config, rename
machinery, tests, and docs only. Skip the `/mlabs-mockup` gate.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan's `\bMLabs\b` open question was the largest source of
  ambiguity — kept open it would have forced `/mlabs-code` to pause mid-run.
  **Decision (locked with user):** **DROP** the `\bMLabs\b` matcher entirely.
  Only the new `"MLabs Template"` phrase matcher rewrites the capital-M form.
  Bare `MLabs` in `HANDOVER.md.template`, `DESIGN.md`, `AGENTS.md`,
  `tooling/eslint-config/**`, `.replit` stays as agency attribution.
  Cleanest outcome — no SKIP_PATH_SUFFIXES growth required for these files.

- **Concern:** CHANGELOG.md handling — full rewrite vs skip vs partial.
  **Decision (locked with user):** **Full rewrite.** The fork takes
  ownership; history reads as "our history now." Implementation: update
  CHANGELOG.md at template source to use `mlabs-mobile` everywhere (replace
  the backticked `` `muscat-mobile` `` mention); rename script's existing
  `.md` text handling then rewrites it cleanly per fork. No new SKIP entry.

- **Concern:** Bundle ID placeholder string.
  **Decision (locked with user):** `com.example.mlabs` (consistent with
  single-brand story). Placeholder still requires manual fork-time
  replacement per `FORK_CHECKLIST.md`; rename script does not touch it.

- **Concern:** Test fixture refresh scope.
  **Decision (locked with user):** **Full refresh.** The fixture mirrors
  real source structure precisely; every `Muscat`/`muscat` in the fixture
  becomes the consolidated `mlabs`/`MLabs Template` equivalent. Preserves
  the fixture's role as canonical pre-rename state.

- **Concern:** Mobile permission string in `apps/mobile/app.config.ts` is
  `"Muscat needs access to your photos to set your profile picture."`
  After consolidation, what becomes of this user-visible string?
  **Decision (reviewer):** Use `"MLabs Template needs access to your photos
  to set your profile picture."` — the new `"MLabs Template"` phrase
  matcher rewrites it cleanly to `"<displayName> needs access..."` post-rename.

- **Concern:** rename.test.ts completeness test (lines 231–274) currently
  asserts `/\bMuscat\b/.test(cleaned)` is false after rename. After
  consolidation, the post-rename invariant becomes: no `\bmlabs\b` (case-
  sensitive, lowercase or capital) remains in the rewritten fork.
  **Decision (reviewer):** Update the assertion to
  `/\bMLabs\b/.test(cleaned) === false && /\bmlabs\b/.test(cleaned) === false`,
  with the allowlist extended to cover the agency-attribution exceptions
  (`HANDOVER.md.template`, `DESIGN.md`, `AGENTS.md`, `tooling/eslint-config/**`,
  `.replit`) so the test reflects the new "agency preserved, product replaced"
  semantic.

- **Concern:** The plan listed 2 Maestro YAML files; I verified via grep
  that those are the only `.maestro/*.yaml` files containing `muscat`
  references. **Decision:** Scope confirmed — no expansion needed.

### Suggestions (taken or deferred)

- **Suggestion (taken):** rename.ts banner update. New form:
  `info(\`Target: @mlabs → ${cfg.namespace} | MLabs Template → "${cfg.displayName}" | mlabs → ${cfg.slug}\`)`
- **Suggestion (taken):** rename.ts docstring should reflect single-brand.
  Remove the "Muscat" mention in the leading comment block; describe the
  consolidated `mlabs` / `MLabs Template` placeholder identity instead.
- **Suggestion (deferred):** A future task could add the `mlabs/mlabs template`
  CHANGELOG matcher (replacing the existing `mlabs/muscat template`). After
  consolidation that string becomes `mlabs/mlabs template` which rewrites
  to `${nsBare}/${slug} template` — still functional, just looks redundant.
  Defer the cleanup; current matcher logic continues to work.

## Decisions locked

Net new decisions made during review (beyond the plan):

1. **DROP `\bMLabs\b` matcher.** Only `"MLabs Template"` phrase matcher
   handles the capital-M case. Bare `MLabs` preserved as agency attribution.
2. **CHANGELOG.md: full rewrite** at rename time. Source content updated to
   use `mlabs-mobile`.
3. **Bundle ID placeholder: `com.example.mlabs`** — kept manual in FORK_CHECKLIST.
4. **Test fixture: full refresh** — mirror real source structure.
5. **Mobile permission string** uses `"MLabs Template needs access..."` so
   the phrase matcher rewrites cleanly.
6. **rename.test.ts completeness assertion** updated to check
   `\bMLabs\b` AND `\bmlabs\b` (case-sensitive both) absence, with
   agency-attribution files allowlisted.
7. **No new SKIP_PATH_SUFFIXES entries** for HANDOVER/DESIGN/AGENTS/eslint
   (since `\bMLabs\b` dropped, they don't need protection).
8. **`.mstack/` added to SKIP_PATH_PREFIXES** (per plan, user-direction).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each is atomic
(reviewable as a single commit). The repo stays in a runnable state at
each step, with one caveat noted on Task 1.

### Task 1: Migrate functional source code from `muscat` to `mlabs`

- **Files:**
  - `apps/mobile/app.config.ts` (edit) — 8 substitutions:
    - `name: "Muscat"` → `name: "MLabs Template"`
    - `slug: "muscat-mobile"` → `slug: "mlabs-mobile"`
    - `scheme: "muscat"` → `scheme: "mlabs"`
    - `bundleIdentifier: "com.example.muscat"` → `bundleIdentifier: "com.example.mlabs"`
    - `package: "com.example.muscat"` → `package: "com.example.mlabs"`
    - `associatedDomains: ["applinks:muscat.example.com"]` → `["applinks:mlabs.example.com"]`
    - `host: "muscat.example.com"` → `host: "mlabs.example.com"`
    - `photosPermission: "Muscat needs access..."` → `"MLabs Template needs access..."`
    - Update the `BUNDLE_ID PLACEHOLDER` doc comment (lines 4–10) to reference `com.example.mlabs`
  - `packages/auth/src/jwt.ts` (edit) — `const ISSUER = "muscat-mobile"` → `"mlabs-mobile"`
  - `apps/web/tests/auth-jwt.test.ts` (edit) — 3 issuer string literals from `"muscat-mobile"` → `"mlabs-mobile"` (lines 89, 112, 138)
  - `apps/mobile/.maestro/01-signup-verify-home.yaml` (edit) — `muscat://verify` → `mlabs://verify`
  - `apps/mobile/.maestro/04-forgot-password-reset-login.yaml` (edit) — `muscat://reset-password` → `mlabs://reset-password`
  - `apps/mobile/app/(auth)/reset-password.tsx` (edit) — comment URL `muscat://reset-password` → `mlabs://reset-password`
- **What:** Single sweep replacing every Muscat-family literal in production source with the consolidated `mlabs` / `MLabs Template` equivalent. Functional behavior unchanged — these are arbitrary identifier strings (issuer, scheme, slug, host, bundle id). Tests update in lockstep so the jwt suite stays green.
- **Acceptance:**
  - [ ] `pnpm typecheck` passes.
  - [ ] `pnpm --filter @mlabs/web test apps/web/tests/auth-jwt.test.ts` passes with the new issuer.
  - [ ] `pnpm --filter @mlabs/mobile web` boots; browser tab title reads `MLabs Template`.
  - [ ] `grep -ri muscat apps/mobile apps/web/tests/auth-jwt.test.ts packages/auth/src/jwt.ts` returns 0 hits.
- **Pause if:** any of the 6 files has additional `muscat` references not enumerated above (would indicate scope drift since the plan was written).

### Task 2: Rebase `rename.ts` + tests + fixture on single-brand patterns (atomic)

- **Files:**
  - `scripts/rename.ts` (edit, major)
  - `apps/web/tests/rename.test.ts` (edit, rewrite assertions)
  - `apps/web/tests/fixtures/rename-template/**` (edit, full refresh)
- **What:** This is one coherent change — splitting it produces a broken state because rename.ts behavior is asserted by tests against a fixture. Three coupled edits:

  **rename.ts changes:**
  - Replace Muscat matchers (lines 296, 300, 302, 309, 315, 327, 330) with the consolidated mlabs matchers:
    - `"muscat-mobile"` → `"mlabs-mobile"` (find pattern only — replacement still uses `${cfg.slug}-mobile`)
    - `scheme: "muscat"` → `scheme: "mlabs"`
    - `muscat://` → `mlabs://`
    - `muscat.example.com` → `mlabs.example.com`
    - Add a `"MLabs Template"` phrase matcher → `${cfg.displayName}` running BEFORE any namespace handling.
    - **Drop** the `/\bMuscat\b/g` matcher.
    - **Drop** the `/\bMLabs\b/g` matcher.
    - Update the `mlabs/muscat template` CHANGELOG matcher to `mlabs/mlabs template` → `${nsBare}/${cfg.slug} template`.
  - Add `".mstack" + path.sep` to `SKIP_PATH_PREFIXES`.
  - Update CLI banner (line ~431):
    `info(\`Target: @mlabs → ${cfg.namespace} | MLabs Template → "${cfg.displayName}" | mlabs → ${cfg.slug}\`)`
  - Update file-leading docstring (lines 1–29) and the in-body comments at lines 211–217, 290–311 to describe the single-brand placeholder identity. Remove all "Muscat" mentions.

  **rename.test.ts changes:**
  - Rewrite each `transform()` test from Muscat input → mlabs input:
    - `'name: "Muscat"'` → `'name: "MLabs Template"'`, expects `'name: "ACME App"'`
    - `'"muscat-mobile"'` → `'"mlabs-mobile"'`, expects `'"acme-mobile"'`
    - `'scheme: "muscat"'` → `'scheme: "mlabs"'`, expects `'scheme: "acme"'`
    - `"muscat://verify?token=abc"` → `"mlabs://verify?token=abc"`, expects `"acme://verify?token=abc"`
    - `'"muscat.example.com"'` → `'"mlabs.example.com"'`, expects `'"app.acme.com"'`
    - `"Changes to the mlabs/muscat template."` → `"Changes to the mlabs/mlabs template."`
  - Add a NEW test for the `"MLabs Template"` phrase matcher: `transform('# MLabs Template', ACME_CFG)` → `'# ACME App'` (no leftover `Template` word).
  - Update fixture-level test assertions (lines 139–168) to match the refreshed fixture content (mlabs throughout).
  - Update bundle-ID allowlist test from `"com.example.muscat"` → `"com.example.mlabs"`.
  - Update the completeness test (lines 231–274):
    - Strip `com.example.mlabs` instead of `com.example.muscat` in `cleaned`.
    - Replace the Muscat assertion with TWO assertions:
      `expect(/\bMLabs\b/.test(cleaned)).toBe(false)` and
      `expect(/\bmlabs\b/.test(cleaned)).toBe(false)`.
    - Add an allowlist for agency-attribution files (`HANDOVER.md.template`, `DESIGN.md`, `AGENTS.md`, `tooling/eslint-config`, `.replit`) — skip these in the completeness loop since they legitimately retain `MLabs`.

  **Fixture refresh (`apps/web/tests/fixtures/rename-template/**`):**
  - Mirror real source: every `muscat`/`Muscat` reference in the fixture becomes its `mlabs`/`MLabs Template` equivalent. Specifically:
    - `apps/mobile/app.config.ts` — 8 swaps matching real source structure (name, slug, scheme, bundle id × 2, deeplink host × 2, permission string).
    - `apps/mobile/.maestro/01-smoke.yaml` — `appId`, `openLink`, and `Welcome to Muscat` strings → mlabs equivalents.
    - `packages/auth/src/jwt.ts` — `ISSUER = "mlabs-mobile"`.
    - `CHANGELOG.md` — drop `mlabs/muscat template`, replace with `mlabs/mlabs template`.
    - `FORK_CHECKLIST.md.template` — `com.example.muscat` → `com.example.mlabs`.
  - Add a minimal `HANDOVER.md.template` / `DESIGN.md` / `AGENTS.md` sample to the fixture IF the new completeness-test allowlist depends on them existing. Otherwise leave fixture structure as-is and rely on path-based allowlist.

- **Acceptance:**
  - [ ] `pnpm --filter @mlabs/web test apps/web/tests/rename.test.ts` — all tests green, including the new `"MLabs Template"` phrase test and the updated completeness check.
  - [ ] `pnpm rename --namespace @acme --slug acme --display-name "ACME App" --deeplink-host app.acme.com --dry-run` (in a scratch clone of the repo or via the test harness) produces no errors and lists the expected swap count.
  - [ ] Banner output reads: `Target: @mlabs → @acme | MLabs Template → "ACME App" | mlabs → acme`.
  - [ ] Re-run with `--from .fork-config.json` is a no-op (idempotency check).
- **Pause if:**
  - Fixture refresh requires structural file additions beyond what the plan envisaged (e.g., adding `HANDOVER.md.template` to the fixture for allowlist coverage).
  - Any rename pattern unexpectedly matches strings in unrelated files (collision discovered during dry-run).
  - The `"MLabs Template"` phrase matcher needs ordering tweaks (e.g., must run before the `mlabs-mobile` matcher? — verify with concrete failing test before guessing).

### Task 3: Update human-readable docs

- **Files:**
  - `README.md` (edit) — rename-script description section (~lines 99–105). Replace the "Muscat / muscat / muscat-mobile" enumeration with the single `mlabs / MLabs Template` placeholder description.
  - `docs/forking-guide.md` (edit) — update placeholder examples (table at line ~143 and surrounding prose).
  - `docs/template/TEMPLATE.md` (edit) — rename-machinery sections (lines 158–170, 525–545, 565–580). Describe the consolidated single-brand approach; drop the historical two-placeholder explanation OR retain it as a one-paragraph "previously" note. Recommendation: drop, history is in git.
- **What:** Mechanical prose updates so docs accurately describe the post-consolidation rename machinery. No structural rewrites.
- **Acceptance:**
  - [ ] `grep -ri "muscat" README.md docs/forking-guide.md docs/template/TEMPLATE.md` returns 0 hits.
  - [ ] Read-through confirms the rename section in each doc accurately describes single-brand consolidation.
- **Pause if:** Doc prose change requires more than mechanical find/replace (e.g., a section's whole point was the two-brand split — needs restructuring).

### Task 4: Update CHANGELOG.md content

- **Files:** `CHANGELOG.md` (edit)
- **What:** Replace the backticked historical mention `` `muscat-mobile` `` → `` `mlabs-mobile` `` (line ~13). Per locked decision #2, no other changelog rewrite needed at template source — the rename script will rewrite the entire CHANGELOG.md content per-fork at rename time (full ownership transfer).
- **Acceptance:**
  - [ ] `grep -i muscat CHANGELOG.md` returns 0 hits.
- **Pause if:** None.

### Task 5: Update FORK_CHECKLIST.md.template

- **Files:** `FORK_CHECKLIST.md.template` (edit)
- **What:** Replace `com.example.muscat` → `com.example.mlabs` in instruction text (line 24).
- **Acceptance:**
  - [ ] `grep -i muscat FORK_CHECKLIST.md.template` returns 0 hits.
- **Pause if:** None.

## Verification (after all 5 tasks complete)

Final invariants to check at the end of `/mlabs-code` run:

- [ ] `grep -ri muscat .` (excluding `node_modules`, `.mstack`, `apps/web/tests/fixtures`, `pnpm-lock.yaml`) returns **0 hits**.
- [ ] `pnpm typecheck` passes across all workspaces.
- [ ] `pnpm lint` passes across all workspaces.
- [ ] `pnpm test` passes (full suite, including rewritten `rename.test.ts`).
- [ ] `pnpm gen:mobile-tw:check` is green.
- [ ] `pnpm --filter @mlabs/mobile web` shows `<title>MLabs Template</title>` in the browser tab.
- [ ] Dry-run rename against the real repo produces a clean target list (sanity check, not a real rename).

## Open questions

None remaining. All five plan-level open questions were resolved during review:

1. ~~Agency-name role~~ → DROP `\bMLabs\b`, no SKIP entries for agency-prose files.
2. ~~CHANGELOG.md~~ → Full rewrite at rename time; source updated to `mlabs-mobile`.
3. ~~`MLabs Template` matcher~~ → Implemented as phrase matcher (Task 2).
4. ~~Bundle ID placeholder~~ → `com.example.mlabs`.
5. ~~Skip-list additions~~ → Only `.mstack/` added. Docs are rewritten (not skipped) because they need updating to reflect single-brand reality.

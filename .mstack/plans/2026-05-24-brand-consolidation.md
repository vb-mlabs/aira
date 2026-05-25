# Plan: Consolidate Muscat + MLabs into a single brand identifier

**Date:** 2026-05-24
**Slug:** 2026-05-24-brand-consolidation
**Status:** implemented — see [.mstack/code/2026-05-24-brand-consolidation/report.md](../code/2026-05-24-brand-consolidation/report.md)
**Author:** VB

---

## Problem

The template ships with two brand placeholder identifiers:

- **`MLabs` / `mlabs`** — the agency name, used in docs, `@mlabs/*` workspace
  scope, `mlabs-template` root pkg, ESLint plugin namespace, comments.
- **`Muscat` / `muscat`** — the product-name placeholder, used in
  `apps/mobile/app.config.ts` (name, slug, scheme, bundle id, deeplink host),
  JWT issuer, Maestro YAML deep links, one mobile screen comment.

A new dev forking the template has to mentally track two find/replace
targets that are conceptually one thing ("the brand of this template").
`scripts/rename.ts` handles each separately:

- The `Muscat` family is cleanly covered (anchored literal matchers per
  context — `scheme: "muscat"`, `"muscat-mobile"`, `muscat.example.com`,
  `muscat://`, `\bMuscat\b`).
- The `MLabs` family is partially over-aggressive: `\bMLabs\b` →
  `displayName` fires on every word-boundary match, mangling doc prose
  that legitimately mentions "MLabs" as the agency (HANDOVER warranty
  ownership, DESIGN.md colour-token attribution).
- Bare lowercase `mlabs` standalone (not in `@mlabs/...`) is **not
  matched at all** — fine today because there are no such callsites that
  matter, but a latent gap.

**Who benefits:**

- New devs forking — single mental model: "this template is mlabs; rename
  swaps it for our brand."
- MLabs team maintaining the template — one set of patterns to keep in
  sync, not two.

**Success looks like:** searching the repo for `muscat` (case-insensitive)
returns zero hits outside `.mstack/`, `node_modules/`, the rename test
fixture, and the pnpm lockfile. The unrenamed template's mobile app
launches with title "MLabs Template", scheme `mlabs://`, JWT issuer
`mlabs-mobile`.

## Scope

**In:**

- Replace `Muscat` / `muscat` literal placeholders in functional source
  with `MLabs` / `mlabs` equivalents:
  - `apps/mobile/app.config.ts` — `name`, `slug`, `scheme`,
    `bundleIdentifier`, `package`, `associatedDomains`, intent-filter
    `host`, photo permission string (8 hits).
  - `packages/auth/src/jwt.ts` — `ISSUER = "muscat-mobile"` →
    `"mlabs-mobile"`.
  - `apps/web/tests/auth-jwt.test.ts` — 3 issuer assertions.
  - `apps/mobile/.maestro/01-signup-verify-home.yaml` and
    `apps/mobile/.maestro/04-forgot-password-reset-login.yaml` — `muscat://`
    URIs.
  - `apps/mobile/app/(auth)/reset-password.tsx` — doc comment URL.
- Refactor `scripts/rename.ts`:
  - Remove all `muscat` / `Muscat` matchers.
  - Add anchored `mlabs` matchers in safe contexts only — quoted
    `"mlabs-mobile"`, `scheme: "mlabs"`, `mlabs://`, `mlabs.example.com`.
  - Add a `"MLabs Template"` phrase matcher → `displayName` (runs before
    the `\bMLabs\b` fallback so `# MLabs Template` becomes `# ACME App`,
    not `# ACME App Template`).
  - Decide the fate of the bare `\bMLabs\b` rule (see Open Questions).
  - Update CLI banner messages + docstring to reflect the single brand.
- Refresh `apps/web/tests/fixtures/rename-template/**` to reflect the
  new mlabs-everywhere canonical pre-rename state.
- Rewrite `apps/web/tests/rename.test.ts` cases for the new patterns
  (no test deletions — re-cover every existing assertion under the new
  patterns).
- Update `FORK_CHECKLIST.md.template` — `com.example.muscat` →
  `com.example.mlabs` in instruction text.
- Update human-readable docs that describe placeholder names:
  - `README.md` (lines describing what the rename does).
  - `docs/forking-guide.md`.
  - `docs/template/TEMPLATE.md` (the rename-machinery prose).
- `CHANGELOG.md`: update the `` `muscat-mobile` `` backticked historical
  mention to `` `mlabs-mobile` `` so the consolidated brand reads
  consistently in history (see Open Question on full vs. partial
  changelog rewrite).

**Out (deferred — explicit):**

- **`.mstack/` planning history** — frozen by user direction. The
  existing `.mstack/plans/`, `.mstack/reviews/`, `.mstack/code/`,
  `.mstack/qa/`, `.mstack/learnings.jsonl` are time-stamped artifacts;
  rewriting them rewrites history. Add `.mstack/` to
  `SKIP_PATH_PREFIXES` in `rename.ts` as part of this change.
- **Bundle ID auto-derivation** — bundle IDs remain manual via
  `FORK_CHECKLIST.md` (only the placeholder string changes from
  `com.example.muscat` → `com.example.mlabs`).
- **`@mlabs/` npm scope handling** — current `namespaceRe` is correct
  and stays untouched.
- **`@mlabs` ESLint plugin namespace** — code-level identifier, not a
  brand string. Stays.
- **Rebrand layer** (`packages/config/src/brand.ts`) — already the source
  of truth for the *fork's* end-user brand; that's a different layer
  from this template-placeholder consolidation and stays untouched.

## Approach

**Chosen: surgical single-brand consolidation.** One coordinated change
across functional source + the rename script + the rename test fixture,
landing as a single mstack implementation. The placeholder identifier
becomes "mlabs" universally; the rename script becomes a single-brand
find/replace; the fixture matches.

The chosen approach inherits the existing `rename.ts` architecture
(`SKIP_PATH_PREFIXES`, `SKIP_PATH_SUFFIXES`, `transform()`, `walk()`,
`.fork-config.json` idempotency, `--from` re-run, `--dry-run`) — only
the patterns inside `transform()` change and the SKIP lists grow.

Pattern-design principle (carries over from the existing script): each
replacement is **anchored in a unique context** — `scheme: "mlabs"`,
`"mlabs-mobile"` quoted, `mlabs.example.com` host, `mlabs://` URI
scheme — never a bare `mlabs` match that could collide with the
`@mlabs/` namespace handling. The `@mlabs/` regex runs after these
anchored bare-mlabs matchers so it picks up its own contexts cleanly.

**Alternatives considered:**

- **Dual-token transition** (keep both `Muscat` and `mlabs` valid in
  rename.ts during a deprecation window) — rejected. The template has
  no external production users who need migration grace; we own all
  callsites; transition complexity buys nothing.
- **Configuration-driven** (introduce `.template-brand.json` consumed by
  rename.ts so the placeholder is data, not literal) — rejected. Adds
  an abstraction layer for a single-org-owned template. MLabs philosophy
  is boring tools. The current anchored-literal-patterns approach works;
  we just need to point them at one brand instead of two.

## Data model changes

None.

## Files to touch

**New:**

- None.

**Edit (functional source — 5 files):**

- `apps/mobile/app.config.ts` — 8 `muscat`/`Muscat` references →
  `mlabs`/`MLabs`/`MLabs Template` equivalents.
- `packages/auth/src/jwt.ts` — `ISSUER` literal.
- `apps/web/tests/auth-jwt.test.ts` — 3 issuer assertions.
- `apps/mobile/.maestro/01-signup-verify-home.yaml` and
  `04-forgot-password-reset-login.yaml` — deep-link URIs.
- `apps/mobile/app/(auth)/reset-password.tsx` — doc comment URL.

**Edit (rename script + tests + fixture):**

- `scripts/rename.ts` — replace Muscat patterns with anchored mlabs
  patterns; add `"MLabs Template"` phrase matcher; add `.mstack/` to
  `SKIP_PATH_PREFIXES`; update banner messages + docstring.
- `apps/web/tests/fixtures/rename-template/**` — full refresh: every
  occurrence of `muscat` / `Muscat` in the fixture becomes the
  consolidated `mlabs` / `MLabs Template` equivalent, mirroring the
  real source.
- `apps/web/tests/rename.test.ts` — rewrite assertions for new patterns.
  Maintain the existing test coverage shape (per-pattern transform
  tests + the post-rename completeness test).

**Edit (docs — 4 files):**

- `README.md` — placeholder description in the "rename" section
  (lines ~99–105).
- `docs/forking-guide.md` — placeholder examples.
- `docs/template/TEMPLATE.md` — rename-machinery prose (multiple
  sections).
- `FORK_CHECKLIST.md.template` — `com.example.muscat` →
  `com.example.mlabs`.
- `CHANGELOG.md` — `` `muscat-mobile` `` → `` `mlabs-mobile` `` in the
  one historical entry (or skip; see Open Question).

**Conditionally edit (pending Open Question resolutions):**

- `HANDOVER.md.template` — `MLabs` references as the agency / warranty
  grantor. Decision: rewrite via rename OR add to SKIP list with a
  documented "agency name stays" policy.
- `DESIGN.md` — `MLabs orange`, `MLabs navy` colour-token attribution.
  Decision: same as above.
- `.replit` — `# Replit configuration for the MLabs template` header
  comment. Decision: same.
- `AGENTS.md` — `mstack — the MLabs skill suite` heading + body.
  Decision: same (likely SKIP — mstack is a genuinely MLabs invention,
  attribution should travel).

## Edge cases

- **`@mlabs/` collision.** Bare `mlabs` matchers must not eat the `@`
  in `@mlabs/web`. Mitigation: all bare-mlabs matchers are anchored to
  unique contexts (`"mlabs-mobile"`, `scheme: "mlabs"`,
  `mlabs.example.com`, `mlabs://`); the `@mlabs/` regex runs after,
  unchanged.
- **`MLabs` in identifier prose.** Docs that talk *about* the rename
  script (TEMPLATE.md, forking-guide.md, scripts/rename.ts) describe
  `\bMLabs\b` as a pattern. After rename, these docs get partially
  mangled. Mitigation: TEMPLATE.md and `scripts/rename.ts` are
  already / will-be in `SKIP_PATH_SUFFIXES`. `forking-guide.md` should
  also be added.
- **Bundle ID lingering.** `com.example.mlabs` in `app.config.ts` is
  still a placeholder (no real org owns this reverse-domain).
  `FORK_CHECKLIST.md.template` instructs the dev to replace manually —
  no script change beyond the placeholder string update.
- **Test fixture / test rewrite sync.** If `rename.ts`, the fixture,
  and the test cases drift, CI breaks. `/mlabs-code` should land all
  three in one atomic commit (per the "one commit per task" rule, this
  is one task: "rebase the rename system on the consolidated brand").
- **`MLabs Template` vs. `MLabs` alone.** The phrase matcher must run
  *before* the `\bMLabs\b` matcher; otherwise `\bMLabs\b` consumes the
  `MLabs` and leaves a dangling `Template` word.
- **CHANGELOG.md as history.** Changelogs are historical artifacts.
  Rewriting `Notable changes to the MLabs template` →
  `Notable changes to the ACME App template` is debatable. See Open
  Question 2.
- **`.replit`'s extensionless config.** Already in `KNOWN_FILES` per
  the prior template-hardening pass — no new handling needed.
- **Idempotent re-run.** After rename, `.fork-config.json` exists.
  Re-running `pnpm rename --from .fork-config.json` should be a no-op
  on the consolidated codebase. Test fixture re-run should also be a
  no-op after first apply.

## Acceptance criteria

- [ ] `grep -ri muscat .` (excluding `node_modules`, `.mstack`,
      `apps/web/tests/fixtures`, `pnpm-lock.yaml`) returns **0 hits**.
- [ ] `pnpm typecheck` passes across all workspaces.
- [ ] `pnpm lint` passes across all workspaces.
- [ ] `pnpm test` passes — including the rewritten
      `apps/web/tests/rename.test.ts`.
- [ ] `pnpm gen:mobile-tw:check` stays green (the mobile tailwind
      config generator does not depend on these strings).
- [ ] `pnpm --filter @mlabs/mobile web` boots with `<title>MLabs Template</title>`
      in the browser tab (no "Muscat" anywhere in the page chrome).
- [ ] `pnpm rename --namespace @acme --slug acme --display-name "ACME App"
      --deeplink-host app.acme.com --dry-run` lists changes that
      produce a clean fork (no half-translated docs in user-facing
      files outside the agreed SKIP set).
- [ ] After actual rename: `apps/mobile/app.config.ts` reads
      `scheme: "acme"`, `slug: "acme-mobile"`, `name: "ACME App"`,
      `bundleIdentifier: "com.example.acme"`, host
      `app.acme.com`.
- [ ] After actual rename: JWT issuer `acme-mobile`; auth-jwt.test.ts
      passes against the new issuer.
- [ ] After actual rename: `README.md` heading reads `# ACME App` (no
      lingering "Template" word, no "MLabs" or "Muscat" residue in
      user-facing files).
- [ ] After actual rename: re-run with `--from .fork-config.json` is a
      no-op (no files changed).

## Open questions

For `/mlabs-review` to resolve:

1. **Agency-name role.** Does "MLabs" in HANDOVER.md.template
   (warranty grantor, project ownership) and DESIGN.md (`MLabs orange`,
   `MLabs navy` colour-token attribution) travel with the fork as a
   rewrite, OR stay preserved as the agency that delivered the
   template? **Recommendation: preserve in HANDOVER + DESIGN + AGENTS;
   rewrite elsewhere.** Add those three files to `SKIP_PATH_SUFFIXES`
   and document the "agency vs. product" distinction in `rename.ts`'s
   docstring.
2. **CHANGELOG.md.** Full rewrite (`# Changelog — MLabs template` →
   `# Changelog — ACME App template`, and historical entries about
   `muscat-mobile` become `acme-mobile`) OR add to SKIP (changelogs
   are historical, content reflects state at the time of the entry)?
   **Recommendation: full rewrite** — the fork is taking ownership of
   the codebase; the changelog reads as "our history now."
3. **`\bMLabs\b` fallback rule.** Keep it (sweeping all remaining
   `MLabs` mentions in user-facing files) or drop it entirely now that
   the `"MLabs Template"` phrase matcher handles the most common case?
   **Recommendation: keep, but only after the phrase matcher runs.**
   Catches things like `MLabs custom rules` comments that are
   genuinely user-facing branding.
4. **Bundle ID placeholder string.** `com.example.mlabs` (continues
   the "looks-like-a-real-bundle-id placeholder" approach) OR something
   more obviously placeholder like `com.example.fork`? **Recommendation:
   `com.example.mlabs`** — consistent with the single-brand story; the
   `com.example.` prefix already signals "not a real org" to anyone
   reading.
5. **Skip-list additions for docs about the rename system.** Should
   `docs/forking-guide.md`, `docs/template/TEMPLATE.md`,
   `tooling/eslint-config/src/**` (which has `MLabs custom rules`
   comments) all be added to SKIP? **Recommendation:** TEMPLATE.md
   and forking-guide.md → SKIP (they describe the rename machinery
   itself); eslint comments → rewrite (they're just branding).

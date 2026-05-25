# Review: Darken brand primary so white text passes WCAG AA

**Date:** 2026-05-24
**Slug:** 2026-05-24-primary-color-darken
**Plan reviewed:** [2026-05-24-primary-color-darken.md](../plans/2026-05-24-primary-color-darken.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7)

---

## Summary

Plan is the right shape (one-token shift across `design.ts` + `globals.css`
mirror + `brand.ts` email mirror + regenerated mobile tailwind + new
contrast pair). Two blockers caught during review: (1) the locked ring
value `oklch(0.62 0.19 39)` ended up *lighter* than the new primary
`oklch(0.55 0.20 32)`, contradicting the user's stated "ring slight-tint-
darker than primary" principle from the plan questionnaire; (2)
`DESIGN.md` at repo root has six+ lines that document the old primary
values and quote the exact contrast math we're invalidating — it was
missing from the plan's Files-to-touch. Both resolved with the user
during this review: light-theme ring darkens to `oklch(0.48 0.20 30)`,
dark-theme ring stays at the current `oklch(0.69 0.18 39)` (a darker
ring would be invisible on the navy background — the contrast hook
would fail), `DESIGN.md` gets a full sync including the "Brand voice"
and "Don't" sections. One pleasant non-issue surfaced: no hardcoded
`#FF6B2C` SVGs exist outside `brand.ts`/`design.ts` — the token system
is fully respected by every consumer (email templates already centralize
via `brand.emailColors` per `packages/email/src/components/theme.ts:9`).
`UI-Significant: no` (touches design tokens, CSS vars, a script, and
docs — no `apps/web/src/app/**/page.tsx` or `layout.tsx` or feature
components).

## Findings

### Blockers (must fix before /mlabs-code)

- **Ring vs primary relationship inverted.** Plan locked ring at
  `oklch(0.62 0.19 39)` while primary moved to `oklch(0.55 0.20 32)`,
  but the user's Q3 principle was "ring stays slight-tint-darker than
  primary (legacy shadcn)." With those values ring is *lighter*, not
  darker. **Resolution (user, 2026-05-24):** darken light-theme ring
  to `oklch(0.48 0.20 30)` — restores the "slight-tint-darker" hierarchy
  in a coherent terracotta family.

- **Dark-theme ring inversion problem.** Initial user direction was
  "dark theme mirrors whatever we pick for light-theme ring." But a
  ring at `oklch(0.48 0.20 30)` (very dark orange) on the dark theme's
  navy background `oklch(0.18 0.02 260)` yields ~1.7:1 — fails the 3:1
  ring-visibility check (`scripts/check-contrast.ts:192`). The
  contrast hook would block the commit. **Resolution (user, 2026-05-24):**
  dark-theme ring stays at the current `oklch(0.69 0.18 39)` (bright
  orange against navy gives ~3.5:1, comfortably passes). Documented as
  a deliberate light/dark divergence — light surfaces want a darker
  ring for prominence, dark surfaces want a lighter ring for visibility.

- **`DESIGN.md` missing from Files-to-touch.** Has six explicit
  references to the old primary values (`#FF6B2C` on lines 37, 57; the
  contrast-reasoning paragraph at line 142 quoting "white-on-orange
  fails AA ≈3.4:1; dark-on-orange passes ~6:1"). Leaving it untouched
  ships docs that contradict the implementation. **Resolution (user,
  2026-05-24):** full sync — update both theme tables, the "Brand voice"
  prose, and the "Don't flip primary contrast pairs" bullet.

### Concerns (raised, decided, recorded)

- **Concern:** Plan estimated primary-on-white at ~4.85:1; actual is
  ~6.0:1 (WCAG ratio is symmetric — same as white-on-primary, since both
  pairs are the same two relative luminances). **Decision:** harmless
  estimation error, fixed in the acceptance criteria below. Both pairs
  pass AA body comfortably.

- **Concern:** A single atomic commit was the plan's open question. The
  five edits ARE tightly coupled (token + CSS var + email hex + mobile
  regen + new contrast pair must all land together or `check-contrast`
  goes red mid-task). **Decision:** single commit. Split would only
  introduce a window where the hook fails between commits.

- **Concern:** Adding the `primary vs background` pair to
  `check-contrast.ts` must land *after* the token shift, not before —
  otherwise the hook fails the pre-commit on the very edit that fixes
  it. **Decision:** order matters; bake into the task sequencing below.

- **Concern:** `font-mono text-primary` snippets in `cta-band.tsx:19`
  and `testimonial.tsx:71` (`/mlabs-plan`, "mstack flow:") get visually
  deeper with the new terracotta. **Decision:** accept — still readable
  and arguably more on-brand for the "production-grade template" framing
  than the fluorescent original.

- **Concern:** `bg-primary/10` overlays in `hero.tsx:20`,
  `feature-grid.tsx:128`, `why-mstack.tsx:85` shift from a light peach
  tint to a slightly deeper warm tint. **Decision:** accept — visually
  consistent with the deeper primary; eyeball during implementation.

- **Concern:** Sidebar tokens (`--sidebar-*`) in `globals.css` are
  unrelated brand-neutral tokens not in `design.ts`. **Decision:** out
  of scope, do not touch.

### Suggestions (taken or deferred)

- **Taken:** Update doc-comment at `design.ts:18-19` with the new
  contrast reasoning (terracotta deep orange chosen so both white-on-
  primary AND primary-on-white pass AA body 4.5:1).
- **Taken:** Update doc-comment at `globals.css:23` to match.
- **Taken:** Update doc-comment at `brand.ts:32` (`WCAG AA on primary`)
  — the comment is correct in spirit but the value changed.
- **Taken:** Add the `primary vs background` pair as `severity: "body"`
  (4.5:1) — matches the small-text usage in marketing check icons
  (`hero.tsx:72-81`), not just the large-text eyebrows.
- **Deferred:** Visual regression screenshots. `/mlabs-qa` covers this
  as the next step in the chain.
- **Deferred:** Re-evaluate `ring` against the new primary on focused
  buttons (visual feel of dark-orange ring on terracotta-orange button).
  Light-theme ring at `oklch(0.48 0.20 30)` on primary surface
  `oklch(0.55 0.20 32)` — close in hue/chroma; may read as muddy or
  may read as a confident extra-emphasis. Flagged for `/mlabs-qa`.

## Decisions locked

Net new decisions made during review:

- **Light-theme ring: `oklch(0.48 0.20 30)`** (darkens from current
  `oklch(0.62 0.19 39)` — keeps "slight-tint-darker than primary").
- **Dark-theme ring: stays at `oklch(0.69 0.18 39)`** (cannot mirror
  light theme — would fail the 3:1 navy-background visibility check).
- **`DESIGN.md`: full sync** — token tables (light + dark), Brand voice
  prose, "Don't" bullet about white-on-orange contrast.
- **Single atomic commit** — all five files land together so the hook
  stays green at every step.
- **Order within the commit:** token changes first; `PAIRS` addition to
  the contrast script can be in the same commit (the new pair will
  pass with the new primary), but if split, must come after the token
  change.
- **No hardcoded SVGs need updating** — confirmed via grep; the
  template's brand consumers all read tokens.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: Shift primary + primaryForeground + ring tokens in `design.ts`

- **Files:** `packages/config/src/design.ts` (edit)
- **What:**
  - Light theme: `primary` → `oklch(0.55 0.20 32)`, `primaryForeground`
    → `oklch(0.985 0 0)`, `ring` → `oklch(0.48 0.20 30)`.
  - Dark theme: `primary` → `oklch(0.55 0.20 32)`, `primaryForeground`
    → `oklch(0.985 0 0)`, `ring` → `oklch(0.69 0.18 39)` (UNCHANGED —
    intentional divergence for dark-bg visibility).
  - Replace the comment block at lines 18-19 with: "MLabs terracotta
    orange (~#A8421A). Deep enough that white-on-primary AND primary-
    on-background both pass WCAG AA body (~6:1 and ~6:1)." Keep the
    note on dark ring at line 48-ish explaining the divergence.
- **Acceptance:** File diff shows exactly these four (or six, counting
  ring) line changes plus comment updates. No other tokens touched.
- **Pause if:** the file has been refactored since the plan was written
  and the line numbers no longer match — re-read first.

### Task 2: Mirror token changes into `globals.css`

- **Files:** `apps/web/src/app/globals.css` (edit)
- **What:** `:root` block (lines 24-25, 35): `--primary` →
  `oklch(0.55 0.20 32)`, `--primary-foreground` → `oklch(0.985 0 0)`,
  `--ring` → `oklch(0.48 0.20 30)`. `.dark` block (lines 68-69, 79):
  `--primary` → `oklch(0.55 0.20 32)`, `--primary-foreground` →
  `oklch(0.985 0 0)`, `--ring` UNCHANGED at `oklch(0.69 0.18 39)`.
  Update the comment at line 23 to match the new contrast reasoning.
- **Acceptance:** Diff shows the matching values; nothing else in the
  file changed. `--sidebar-*`, `--chart-*`, `--accent-*` etc. untouched.

### Task 3: Update email color hex mirror in `brand.ts`

- **Files:** `packages/config/src/brand.ts` (edit)
- **What:** `emailColors.primary` → `"#A8421A"`,
  `emailColors.primaryForeground` → `"#FFFFFF"`. Update the inline
  comments to reference the new oklch values and the AA pass note.
- **Acceptance:** Diff shows two value changes plus two comment
  updates. No other `emailColors.*` touched.
- **Pause if:** the linter complains about `no-brand-string-literal`
  on `"#A8421A"` (it shouldn't — hex colors aren't brand strings, only
  `brand.name` matches that rule) — investigate.

### Task 4: Regenerate `apps/mobile/tailwind.config.js`

- **Files:** `apps/mobile/tailwind.config.js` (edit, regenerated)
- **What:** Run `pnpm tsx scripts/gen-mobile-tailwind.ts`. The script
  reads `design.colors` directly (`scripts/gen-mobile-tailwind.ts:44-54`)
  and emits the Tailwind color map. Stage the resulting diff — should
  show `primary` / `primaryForeground` / `ring` updated for both light
  (default keys) and dark (`primaryDark` etc keys).
- **Acceptance:** Generated file's `primary` value is the new oklch
  string; `ring` light = `oklch(0.48 0.20 30)`, `ring` dark =
  `oklch(0.69 0.18 39)`. No other color values changed (or only changes
  that strictly reflect design.ts current state).
- **Pause if:** the generator script errors (e.g. import resolution
  drift) — fix the generator before regenerating, do not hand-edit
  the output.

### Task 5: Add `primary vs background` pair to the contrast script

- **Files:** `scripts/check-contrast.ts` (edit)
- **What:** Append to the `PAIRS` array (around line 192, after the
  border/input/ring entries):
  ```ts
  { fg: "primary", bg: "background", severity: "body",
    note: "primary used as inline accent text on background" }
  ```
- **Acceptance:** `pnpm check-contrast` passes — the new pair reports
  ~6.0:1 in both themes (since both themes have the same primary and
  light theme has white bg, dark theme has navy bg). All pre-existing
  pairs still green.

### Task 6: Update `DESIGN.md`

- **Files:** `DESIGN.md` (edit)
- **What:**
  - **Token table rows (light)** at lines 37-38: `primary` row →
    `oklch(0.55 0.20 32)` / `#A8421A` / "Brand accent, CTAs, links";
    `primaryForeground` row → `oklch(0.985 0 0)` / `#FAFAFA` / "Text on
    primary (white for WCAG AA, ~6:1)".
  - **Token table rows (dark)** at lines 57-58 + 62: same primary
    update; `ring` dark row → `oklch(0.69 0.18 39)` / `#FF6B2C` /
    "Focus indicator (light to stay visible on navy)".
  - **Brand voice paragraph** at line 23: replace "single accent in
    MLabs orange" wording if it contradicts the new terracotta — or
    keep "MLabs orange" as the brand name and note the shade is
    terracotta-deep.
  - **"Don't" bullet** at lines 141-142: invert — was "Flip primary
    contrast pairs without re-running `check-contrast` — white-on-orange
    fails AA (≈3.4:1); dark-on-orange passes (~6:1)." Becomes: "Lighten
    primary back toward `oklch(0.69 …)` — the current terracotta deep
    orange is calibrated so both white-on-primary AND primary-on-
    background pass AA at ~6:1. Reverting either direction breaks the
    contract `check-contrast` enforces."
- **Acceptance:** All six+ references to the old primary values are
  updated; no stale `#FF6B2C` mentions remain (except in historical /
  changelog contexts if any). `grep -n "#FF6B2C\|oklch(0.69 0.18 39)"
  DESIGN.md` returns only the deliberately-kept dark-theme ring row.

### Task 7: Single commit + verify hooks

- **Files:** none (process step)
- **What:** Stage all five edited files (`design.ts`, `globals.css`,
  `brand.ts`, `tailwind.config.js`, `check-contrast.ts`, `DESIGN.md`)
  into ONE commit. Commit message:
  ```
  feat(design): darken primary to terracotta for AA white-on-primary

  Shifts primary from oklch(0.69 0.18 39) (bright orange, ~2.6:1 with
  white) to oklch(0.55 0.20 32) (terracotta deep orange, ~6:1 with
  white). primaryForeground flips from near-black to near-white across
  light + dark themes. Light-theme ring darkens to oklch(0.48 0.20 30)
  to remain slight-tint-darker than primary; dark-theme ring stays at
  oklch(0.69 0.18 39) so it remains visible against the navy bg (a
  darker ring there fails the 3:1 visibility check).

  Adds a check-contrast pair for primary-vs-background (4.5:1) — caught
  a latent failure where text-primary on white was ~3.4:1 in marketing
  components but went unenforced. New primary makes it ~6:1.

  Updates DESIGN.md tables, prose, and the "Don't" bullet. Regenerates
  the mobile tailwind config from design.ts.

  Implements all tasks from .mstack/reviews/2026-05-24-primary-color-darken.md
  ```
- **Acceptance:** `pnpm check-contrast` passes; `pnpm typecheck` passes;
  `pnpm lint` passes; lefthook pre-commit (check-migrations +
  check-contrast) passes; the commit shows ~6 files changed.
- **Pause if:** any hook fails on the staged commit — DO NOT pass
  `--no-verify`. Pause and report which hook failed and the output.

### Task 8: Manual visual smoke (notes only — no commit)

- **Files:** none
- **What:** After Task 7 commits, write a short post-commit note to
  the run log listing what the developer should eyeball before moving
  to `/mlabs-qa`:
  1. Web hero CTA at `/` — white text on terracotta, hero pill tint.
  2. Web feature grid — icon tiles, hover border, eyebrow color.
  3. Mobile welcome screen — "Create account" button white-on-terracotta.
  4. `/dev/emails` preview routes — at least one email template's CTA
     button.
- **Acceptance:** Note appended to `.mstack/code/<slug>/log.md`. No
  code edits.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **None.** All blockers and concerns resolved during this review.
  Visual feel of the new terracotta vs the original bright orange is
  intentionally deferred to `/mlabs-qa` — if it doesn't sit right
  visually, follow-up plan to re-tune. The current values are
  accessibility-correct and the user has approved them.

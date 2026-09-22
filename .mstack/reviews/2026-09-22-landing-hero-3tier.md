# Review: Landing hero — 3-tier "Discover. Support. Grow."

**Date:** 2026-09-22
**Slug:** 2026-09-22-landing-hero-3tier
**Plan reviewed:** [2026-09-22-landing-hero-3tier.md](../plans/2026-09-22-landing-hero-3tier.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** vb-mlabs (Claude Code)

---

## Summary

Plan is ready to implement with three review-driven changes:
(1) both Owner-column CTAs reuse existing exported dialogs from
`business-cta-pair.tsx` instead of anchor-scrolling to `#businesses`,
which requires a small extraction refactor;
(2) `page.tsx` gets flag-gated OG metadata so "Launching soon" vanishes
in the same flip that shows HeroV2;
(3) `.env.example` lives at repo root (not `apps/web/.env.example` as
the plan asserted) — corrected below.

**UI-Significant: no** — the plan touches only one file under
`apps/web/src/app/**/page.tsx` (existing, not new) and the changed
components live under `apps/web/src/components/marketing/*` which the
heuristic excludes. The mockup phase already ran (winner: v1), so
re-mocking would be redundant. Proceed directly to `/mlabs-code`.

## Findings

### Blockers (must fix before /mlabs-code)

None after the concerns below were resolved.

### Concerns (raised, decided, recorded)

- **Concern:** Owner-column CTAs anchor-scroll to `#businesses`, but
  `business-cta-pair.tsx` already exports `GetListedDialog` (a full
  signup-form modal wired to `/api/v1/business-waitlist`) and contains
  a self-contained "View Launch Offer" `Dialog.Root` with real
  pricing (6-Month $69 / 1-Year $99 memberships + Sponsorship L1/L2
  tiers + Trust features). Anchor-scroll = two clicks and a scroll for
  the same action the hero could do in one click.
  **Decision:** Reuse both dialogs directly from HeroV2. `GetListedDialog`
  imports as-is (already exported). Add a small refactor task to
  extract the "View Launch Offer" markup into a new
  `LaunchOfferDialog` mirroring the `GetListedDialog` signature
  (children + triggerClassName), then HeroV2 imports both. `BusinessCtaPair`
  must render byte-identically after the extraction (same trigger button,
  same dialog contents) — pause trigger listed on the extraction task.

- **Concern:** Current `page.tsx` metadata says "Launching soon — get
  notified." Once the flag flips to `"1"`, the visible hero (HeroV2)
  markets an app-live product, but the OG snippet crawlers see still
  says "get notified." Cosmetic on-site, real problem for Google/social
  previews.
  **Decision:** Update `page.tsx` metadata in the same plan, gated on
  the same env flag. Two metadata objects; pick one at
  `generateMetadata` time based on
  `env.NEXT_PUBLIC_LANDING_HERO_V2 === "1"`. Flip is atomic.

- **Concern:** Plan says the flag + `.env.example` entry live in
  `apps/web/.env.example`. There is no such file — the repo's single
  `.env.example` lives at `/home/runner/workspace/.env.example` (root)
  and its `pnpm dev` filter (`pnpm --filter @aira/web dev`) reads
  process env from the root workspace.
  **Decision:** `.env.example` update targets the root file, not
  `apps/web/`. Task list corrects this.

- **Concern:** `env.NEXT_PUBLIC_LANDING_HERO_V2` uses
  `z.enum(["0", "1"]).default("0")`. This works, but the value is
  **build-time inlined** by Next (it's a `NEXT_PUBLIC_*` var), so
  `.env.local` changes require a dev-server restart to take effect —
  not just a page refresh.
  **Decision:** Acceptable; add a one-line comment in the
  `.env.example` entry so forkers aren't surprised. No code change beyond
  the comment.

- **Concern:** Both `Hero` and `HeroV2` will end up in the client bundle
  even though the flag branch is build-time constant, because the
  `ternary` in `page.tsx` is a runtime expression from Next's tree-shake
  perspective. Plan already flagged this — recording the decision
  formally.
  **Decision:** Accept the small bundle cost (~a few KB gzipped). The
  safety valve is worth it. When the flag is deleted (follow-up PR after
  sign-off), the old `Hero` gets removed and the bundle shrinks back.

### Suggestions (taken or deferred)

- **Taken:** Flip `NEXT_PUBLIC_LANDING_HERO_V2=1` in this workspace's
  `.env.local` at the end of the run so `pnpm dev` shows HeroV2 by
  default here. Prod stays at `"0"` until manual flip. No commit
  (`.env.local` is gitignored). Added as final task.

- **Deferred:** Real Play Store / App Store URLs and real QR PNGs. Plan
  ships `href="#"` placeholders and CSS-drawn decorative QR blocks.
  Follow-up ticket wires real assets once the store listings are
  approved. Acceptance criterion: flag must NOT flip to `"1"` in prod
  until real URLs land. Documented in Open Questions.

- **Deferred:** Playwright smoke test for the flag swap. Marketing pages
  don't have Playwright coverage today; adding it just for this swap is
  disproportionate. Manual `pnpm dev` verification (both flag states)
  is the acceptance gate.

- **Deferred:** Ornamental leaves (olive + burnt-orange SVG) flanking
  the phone. Ship v1 mockup fidelity (both leaves) at first; a
  taste-review during the `/mlabs-code` PR can drop one or both without
  reopening this plan.

## Decisions locked

Net-new decisions made during review, beyond the plan:

1. **Both Owner CTAs reuse existing dialogs** — one-click UX from
   HeroV2, single source of truth for pricing/signup content.
2. **`LaunchOfferDialog` gets extracted** from `business-cta-pair.tsx`
   into its own file, mirroring the `GetListedDialog` export pattern
   (children + triggerClassName). Extraction must be a pure refactor —
   BusinessCtaPair's rendered output is unchanged.
3. **Flag-gated OG metadata** ships in the same plan.
4. **`.env.example` at repo root** is the target file, not the
   nonexistent `apps/web/.env.example`.
5. **Local flag flip** to `"1"` is a run-end side effect (not a commit)
   so this workspace's dev server shows HeroV2 by default.
6. **Placeholder QR + store links** ship in this plan; prod flag flip
   is gated on real URLs landing in a follow-up ticket.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (one commit). Verify the previous task's acceptance criteria
before starting the next.

### Task 1: Add `NEXT_PUBLIC_LANDING_HERO_V2` flag to env schema + document in .env.example

- **Files:**
  - `apps/web/src/config/env.ts` (edit — add to `client:` block +
    `runtimeEnv`)
  - `.env.example` (edit — repo root; add commented entry with
    build-time-inline note)
- **What:** In `env.ts`, add
  `NEXT_PUBLIC_LANDING_HERO_V2: z.enum(["0", "1"]).default("0")` to the
  currently-empty `client:` block and
  `NEXT_PUBLIC_LANDING_HERO_V2: process.env.NEXT_PUBLIC_LANDING_HERO_V2`
  to `runtimeEnv`. In `.env.example`, add a documented section (matches
  existing section-header style) explaining the flag, noting build-time
  inlining requires a dev-server restart to take effect.
- **Acceptance:**
  - `pnpm typecheck` passes.
  - `pnpm dev` starts with flag unset (should default to `"0"`).
  - `pnpm lint` passes.
  - No functional change on `/` (flag defaults to `"0"`; existing hero
    still renders).
- **Pause if:** none.

### Task 2: Extract `LaunchOfferDialog` from `business-cta-pair.tsx`

- **Files:**
  - `apps/web/src/components/marketing/launch-offer-dialog.tsx` (new)
  - `apps/web/src/components/marketing/business-cta-pair.tsx` (edit)
- **What:** Move the "View Launch Offer" `Dialog.Root` block from
  `business-cta-pair.tsx` (lines ~400-537, including `PERKS`,
  `MEMBERSHIP_PLANS`, `ADDON_COLUMNS` constants and their JSX) into a
  new `launch-offer-dialog.tsx` as an exported `LaunchOfferDialog`
  component with `{ children, triggerClassName, triggerAriaLabel }`
  props — signature identical to the sibling `GetListedDialog` pattern
  (which stays where it is, in `business-cta-pair.tsx`). Update
  `business-cta-pair.tsx`'s `BusinessCtaPair` to render
  `<LaunchOfferDialog triggerClassName="…same classes as before…">View
  Launch Offer</LaunchOfferDialog>`, keeping the visible button pixel-
  identical.
- **Acceptance:**
  - `pnpm typecheck` passes.
  - `pnpm lint` passes.
  - Visiting `/#businesses` and clicking the "View Launch Offer"
    button opens the same dialog contents (PERKS list, Membership
    Plans grid, Optional Add-Ons grid) with the same visual styling
    as before.
  - `BusinessCtaPair` component's rendered DOM tree is unchanged (only
    the internal implementation moves).
- **Pause if:**
  - The extraction cannot be done without visually diffing
    `BusinessCtaPair` (e.g., the "View Launch Offer" button styling
    depends on inherited context that only works inline).
  - The dialog references any state that lives in
    `BusinessCtaPair`'s scope (there shouldn't be any — verify).

### Task 3: Build `HeroV2` component

- **Files:**
  - `apps/web/src/components/marketing/hero-v2.tsx` (new)
- **What:** Server Component implementing the v1 mockup structure.
  Section root reuses the paper-cream texture background from the
  current `Hero`. Centered eyebrow + Cormorant `<h1>` + lede + sub
  above a `md:grid-cols-[1fr_minmax(280px,360px)_1fr]` 3-column grid.
  - **Left col (For Users):** `<Users />` icon in circle, title,
    blurb, 4 `<li>` with `<Check />` icons, decorative QR placeholder
    block (2 CSS-only conic-gradient tiles), 2 store-badge `<a>`
    links (Google Play + App Store) with placeholder `href="#"`.
  - **Center col (Phone):** `next/image` for `home-screen.png` inside
    a rounded phone frame (bezel + notch via CSS pseudos), two
    single-tone SVG leaves flanking. Ships mockup fidelity — leaf
    reduction is deferred.
  - **Right col (For Business Owners):** `<Store />` icon in circle,
    title, blurb, primary CTA "Get Listed on AIRA" wrapping
    `GetListedDialog` from `./business-cta-pair`, secondary CTA
    "View Pricing & Add-Ons" wrapping `LaunchOfferDialog` from
    `./launch-offer-dialog` (Task 2), then 3 benefit `<li>` rows with
    `<ShieldCheck />` / `<Star />` / `<TrendingUp />` icons.
  - Brand string handling: import `brand` from `@aira/config`.
    Eyebrow renders `brand.tagline` (`"ROOTS & REACH"`). "AIRA Review"
    benefit title uses `` `${brand.name} Review` ``. No bare literal
    of `"AIRA"` in the file (respects `no-brand-string-literal`).
  - Eyebrow uses `text-muted-foreground uppercase tracking-[2px]`
    (NOT `text-brand-gold`) to avoid the DESIGN.md AA-Large exemption.
  - CTA styling: primary uses `bg-primary` (solid, no gradient) with
    cream foreground; secondary uses `border border-primary` outline
    with `text-foreground`.
  - Mobile stacking order: phone column first (`order-first` /
    `md:order-none`), then user column, then owner column.
- **Acceptance:**
  - `pnpm typecheck` passes.
  - `pnpm lint` passes (including `no-brand-string-literal`).
  - Component exports as named `HeroV2`.
  - When temporarily rendered on `/` (via Task 4's flag), the DOM
    contains: 1 `<h1>` with "Discover. Support. Grow." text; the
    three column headings "For Users" / "For Business Owners"; one
    `<img>` referencing `/marketing-images/home-screen.png`; both
    dialog triggers (Get Listed on AIRA, View Pricing & Add-Ons)
    open the correct dialog on click.
- **Pause if:**
  - `GetListedDialog` or `LaunchOfferDialog` triggers can't be styled
    to match the mockup's CTA appearance without a Dialog API
    refactor (would need a bigger plan).
  - The `home-screen.png` asset dimensions / aspect ratio break the
    phone frame at mobile widths (need to add a `sizes` prop or crop).

### Task 4: Wire flag swap in `page.tsx` + gate OG metadata on the same flag

- **Files:**
  - `apps/web/src/app/page.tsx` (edit)
- **What:** Import `HeroV2` and `env` alongside the existing imports.
  Compute two metadata objects (`PRE_LAUNCH_META` — current copy,
  `APP_LIVE_META` — app-live copy). Replace the top-level `metadata`
  export with `generateMetadata` (Next 16 supports both — pick the
  simpler one that reads `env` at build time). Choose which hero to
  render via
  `const HeroComponent = env.NEXT_PUBLIC_LANDING_HERO_V2 === "1" ? HeroV2 : Hero`
  and use `<HeroComponent />` in the JSX where `<Hero />` currently
  sits. Section order (`AboutEditorial` / `PhoneShowcase` /
  `BusinessPanel` / `MarketingFooter`) is unchanged.
- **Acceptance:**
  - `pnpm typecheck` + `pnpm lint` + `pnpm build` all pass.
  - With flag unset or `"0"`: `/` renders the existing `Hero` +
    pre-launch OG. Snapshot vs `main` = zero visual diff on hero.
  - With flag set to `"1"`: `/` renders `HeroV2` + app-live OG. All
    Task 3 acceptance criteria satisfied end-to-end.
  - `MarketingNav` untouched. Below-hero sections untouched.
- **Pause if:**
  - Any existing test breaks (page-level or component-level).
  - Next 16 requires a different pattern for reading env inside
    `generateMetadata` than build-time — should surface, not guess.

### Task 5: Flip local `NEXT_PUBLIC_LANDING_HERO_V2=1` in this workspace

- **Files:**
  - `apps/web/.env.local` (create-or-edit; gitignored, NOT committed)
- **What:** Append `NEXT_PUBLIC_LANDING_HERO_V2=1` to
  `apps/web/.env.local` so `pnpm dev` in this Replit workspace shows
  HeroV2 by default going forward. Confirm `.env.local` is on the
  gitignore path (root `.gitignore` should already list it — verify).
  This step produces **no git commit** — it's a workspace-config side
  effect logged in the run report.
- **Acceptance:**
  - `apps/web/.env.local` contains the flag line.
  - `git status` shows no `.env.local` (still ignored).
  - Restarting `pnpm dev` and visiting `/` shows HeroV2.
- **Pause if:**
  - `.env.local` is NOT gitignored (fix the gitignore first, then
    proceed; do NOT commit the env file).

## Open questions

For `/mlabs-code` to escalate rather than guess, and for the follow-up
PR after sign-off:

1. **Prod flag-flip gate:** Do not set `NEXT_PUBLIC_LANDING_HERO_V2=1`
   in the production deploy env until the real Play Store + App Store
   URLs and QR code PNG assets have landed. Placeholder `href="#"` +
   CSS QR blocks are dev-only. This is a policy note for the humans,
   not a task for `/mlabs-code`.
2. **QR asset paths:** When real QR PNGs land, place at
   `apps/web/public/marketing-images/qr-play.png` +
   `qr-appstore.png`, and swap the placeholder blocks in
   `HeroV2.tsx` for `<Image>` tags. Small follow-up plan.
3. **Post-signoff cleanup PR:** After the flag has been at `"1"` in
   prod for a stable week, delete the old `Hero` component, delete
   the flag from `env.ts` + `.env.example`, remove the
   `HeroComponent` ternary from `page.tsx`, and collapse the
   `generateMetadata` back to a single object. Not part of this run.
4. **`WaitlistCard` future:** With the flag on, `WaitlistCard` has no
   consumer on the landing hero. It's still imported inside the
   fallback `Hero`. When the cleanup PR runs, decide whether to
   remove `WaitlistCard` entirely or keep it available for a future
   footer-capture surface.
5. **Ornamental leaves review:** Ship both leaves in Task 3. During
   the `/mlabs-code` PR review, decide keep-both vs keep-one vs
   remove. Non-blocking taste call.

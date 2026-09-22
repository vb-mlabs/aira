# Implementation report — landing-hero-3tier

**Status:** complete
**Branch:** `feat/landing-hero-v2`
**Review:** [`2026-09-22-landing-hero-3tier`](../../reviews/2026-09-22-landing-hero-3tier.md)
**Plan:** [`2026-09-22-landing-hero-3tier`](../../plans/2026-09-22-landing-hero-3tier.md) (status → `implemented`)

## Tasks

| # | Status | Task | Commit |
|---|--------|------|--------|
| 0 | ✓ done | Docs artifacts (plan + review + 3 mockup variants + reference image + public symlink + learnings) | `007b9a5` |
| 1 | ✓ done | Add `NEXT_PUBLIC_LANDING_HERO_V2` flag to env schema + document in root `.env.example` | `9f1e066` |
| 2 | ✓ done | Extract `LaunchOfferDialog` from `business-cta-pair.tsx` (pure refactor) | `4ee5cbb` |
| 3 | ✓ done | Build `HeroV2` component (Server Component, reuses both extracted dialogs) | `2212616` |
| 4 | ✓ done | Wire flag swap + conditional OG metadata in `page.tsx` | `c30d3bd` |
| 5 | ✓ done | Flip `NEXT_PUBLIC_LANDING_HERO_V2=1` in local `.env.local` (gitignored, no commit) | — |

## Commits

```
c30d3bd feat(web/landing): flag-gate HeroV2 + app-live OG in page.tsx
2212616 feat(web/marketing): add HeroV2 (3-tier landing hero)
4ee5cbb refactor(web/marketing): extract LaunchOfferDialog for reuse
9f1e066 feat(web/env): add NEXT_PUBLIC_LANDING_HERO_V2 flag
007b9a5 docs(marketing): plan + review + mockups for landing hero v2
```

## Verification passes

- `pnpm --filter @aira/web typecheck` — green on every task that
  touched `.ts` / `.tsx`.
- `pnpm --filter @aira/web build` — green after Task 4; `/` still
  prerenders as static content.
- `pnpm --filter @aira/web lint` — 17 pre-existing warnings (0 errors)
  unrelated to this change; 0 new warnings introduced.
- Lefthook `check-migrations` + `check-contrast` — green on every
  commit.
- Local flag flip verified via `git check-ignore` matching `.env*` at
  `.gitignore:34`; `git status` shows no trace.

## Behaviour under the flag

- **`NEXT_PUBLIC_LANDING_HERO_V2` unset or `"0"`:** `/` renders
  exactly as before — same pre-launch centered Hero, same
  `<WaitlistCard />`, same "Launching soon" OG title/description.
  Zero visual diff.
- **`NEXT_PUBLIC_LANDING_HERO_V2="1"`:** `/` renders the 3-tier
  HeroV2 — centered "Discover. Support. Grow." masthead above a
  For Users / Phone / For Business Owners grid — plus the app-live
  OG description. `MarketingNav` unchanged; below-hero sections
  (`AboutEditorial`, `PhoneShowcase`, `BusinessPanel`,
  `MarketingFooter`) unchanged.

## Follow-ups (not part of this run)

1. **Real store URLs + QR PNG assets.** Ship `qr-play.png` +
   `qr-appstore.png` under `apps/web/public/marketing-images/` and
   swap the CSS placeholder blocks in `hero-v2.tsx` for `<Image>`
   tags. Wire real Play Store + App Store URLs into the store-badge
   `href`s. **Prod flag flip is gated on this.**
2. **Cleanup PR after client sign-off.** Delete the old `Hero`
   component, delete `NEXT_PUBLIC_LANDING_HERO_V2` from `env.ts` and
   `.env.example`, remove the ternary from `page.tsx`, and collapse
   `generateMetadata` back to a single object. Consider whether to
   also drop `<WaitlistCard />` (currently only consumed by the
   fallback `Hero`).
3. **Ornamental-leaf taste review.** During the code-review PR,
   decide keep-both / keep-one / remove-all for the olive +
   burnt-orange leaves flanking the phone.
4. **Below-hero rework decision.** The new HeroV2 already includes a
   phone image, so `PhoneShowcase` may become redundant. Separate
   plan when there's appetite for it.

## Recommended next step

Run **`/mlabs-qa`** focused on the landing (`/`) — verify the flag
swap end-to-end in Playwright: page renders under both flag states,
Owner CTAs open the correct dialogs, mobile stacking order, no
console errors from the reused dialogs when triggered from HeroV2.

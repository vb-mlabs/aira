# Run report — marketing-page-launch

**Status:** ✅ complete · 12/12 tasks shipped
**Started:** 2026-05-25 10:50
**Completed:** 2026-05-25 11:18 (~28 minutes elapsed)
**Branch:** main (12 commits, all clean pre-commit hooks)
**Review:** [.mstack/reviews/2026-05-25-marketing-page-launch.md](../../reviews/2026-05-25-marketing-page-launch.md)

---

## Tasks

| | Task | Commit | Notes |
|---|---|---|---|
| ✓ | **T1** Waitlist Drizzle schema + migration | `4fdfb21` | First schema in this repo to use a CHECK constraint (review pre-approved) |
| ✓ | **T2** Waitlist Zod validator | `97d2ab0` | Reuses shared `emailSchema` from auth.ts; refined in T4 to keep `_h` permissive |
| ✓ | **T3** Welcome email template + wrapper + dev preview | `e504493` | Needed an `exports` map entry in `@aira/email/package.json` for the new subpath |
| ✓ | **T4** `/api/v1/waitlist` POST route | `d98e5ea` | Route-direct (documented exception — `defineOperation` is auth-only) |
| ✓ | **T9** ESLint allowlist + `brand.ts` swap | `bc976cf` | Executed early per reorder — unblocks T5-T8 marketing copy linting |
| ✓ | **T5** waitlist-card.tsx | `35ae639` | Client component, honeypot via offscreen inline styles |
| ✓ | **T6** about-editorial + categories-roster | `95c4e51` | Drop-cap via `:first-letter` in a dedicated CSS file (Tailwind v4 limitation) |
| ✓ | **T7** phone-showcase + marketing-images | `4991d88` | ~940 KB of committed PNGs; `next/image` handles optimization |
| ✓ | **T8** business-panel | `0678d77` | mailto uses `brand.supportEmail` from @aira/config |
| ✓ | **T10** marketing-nav + marketing-footer rewrites | `2b758a8` | Added a `signedIn?` backward-compat shim to keep T10 typechecking; T11 removed it |
| ✓ | **T11** Cutover (hero + page.tsx + og-image) | `15587ef` | OG image composed via Sharp at runtime (~275 KB); `brand.name` template literals in page.tsx |
| ✓ | **T12** Delete 7 retired + fixture backfill | `2e8b935` | Surfaced + fixed a latent check-contrast test fixture gap |

## Commits

```
2e8b935 feat(marketing): T12 delete 7 retired components + fixture backfill
15587ef feat(marketing): T11 cutover — hero + page.tsx + og-image
2b758a8 feat(marketing): T10 rewrite marketing-nav + marketing-footer
0678d77 feat(marketing): T8 business-panel component
4991d88 feat(marketing): T7 phone-showcase + committed marketing-images
95c4e51 feat(marketing): T6 about-editorial + categories-roster
35ae639 feat(marketing): T5 waitlist-card client component
bc976cf chore(brand+tooling): T9 ESLint allowlist + brand.ts swap to airabynisarga.com
d98e5ea feat(waitlist): T4 /api/v1/waitlist POST route + docs
e504493 feat(waitlist): T3 welcome email template + wrapper + dev preview
97d2ab0 feat(waitlist): T2 Zod validator
4fdfb21 feat(waitlist): T1 schema + migration
```

Pre-commit hooks (check-migrations · check-contrast · check-mobile-tailwind) passed on every commit. Zero `--no-verify` usage. Zero amends.

## Final verification

| Check | Result |
|---|---|
| `pnpm typecheck` | ✅ 10/10 packages |
| `pnpm lint` | ✅ 3/3 packages, zero warnings |
| `pnpm test` | ✅ 18 files / 162 tests |
| `pnpm check-contrast` | ✅ 36 token pairs all pass |
| `pnpm gen:mobile-tw:check` | ✅ in sync |
| `curl /` | ✅ 200, HTML contains AIRA brand strings |
| `curl /og-image.png` | ✅ 200, image/png, 275124b |
| `curl POST /api/v1/waitlist` | ✅ 200 `{"ok":true}` with row insertion + welcome email |

## Pivots from the review (none required user re-approval)

1. **`_h.max(0)` Zod constraint dropped** (T4). Plan/review specified `max(0)` for the honeypot, but that would make Zod 400 instead of letting the route return 200-silent. Behavior moved to the route; validator stays permissive on type.
2. **Backward-compat `signedIn?: boolean` shim on `MarketingNav`** (T10). Without it, T10's commit would break typecheck mid-PR-sequence because `page.tsx` still passes the prop until T11. Shim removed in T11.
3. **`page.tsx` brand strings use `brand.name` template literals** instead of hardcoded "AIRA" (T11). ESLint allowlist only covers `components/marketing/`, not `app/page.tsx`. Template literals via `@aira/config` are the codebase convention anyway.

## Latent bug surfaced (and fixed)

The earlier design-system commit (`85fe59f`) added `tier1/2/3/info` pairs to `scripts/check-contrast.ts` `PAIRS` array but did not update the matching fixtures in `apps/web/tests/check-contrast.test.ts`. The 3 fixture themes were missing those keys, causing `evaluatePairs()` to throw on every test that walked the array. The bug was latent because the design-system run only verified typecheck/lint/contrast — not the full Vitest suite. T12's verification swept the full suite and caught it. Fixed in `2e8b935` by backfilling the fixtures with compliant pairs.

## Follow-ups (not done in this slice)

- **Postmark sender for `airabynisarga.com`** — currently falls back to the console driver (per `@aira/email`'s existing graceful-degradation pattern). Sprint 0 follow-up per `roadmap.md`.
- **OG image is auto-composed** (Sharp + Georgia serif fallback). A designed version with Cormorant Garamond rendered at 1200×630 would be a nice polish — current image is functional but plain.
- **`scripts/build-og-image.ts`** — the Sharp compose is a one-off bash invocation right now; if we want it deterministic at deploy time, lift it into a build script and wire into `apps/web/package.json` `build`. Out of scope for v1.
- **No anti-spam beyond honeypot.** Watch the `waitlist.honeypot_tripped` logger output; if real bots evade the honeypot, add IP rate limit (10/hour per IP) as a fast follow.
- **Admin waitlist view** at `/admin/waitlist` — not built. Sprint 4+ when admin tooling expands.

## Recommended next step

`/mlabs-qa` with focus area "marketing-page-launch": exercise the waitlist form on real iOS Safari + Android Chrome (the v4 mockup CSS hasn't been validated on real mobile yet — only Chrome DevTools 375px viewport). Also worth: a quick e2e Playwright test that posts a fake email and asserts the success state.

Or `/mlabs-ux-audit` for a polish pass on whitespace/spacing/typography in the live page now that it's mounted in the real Next.js stack (mockup vs production-rendered Tailwind output can drift subtly).

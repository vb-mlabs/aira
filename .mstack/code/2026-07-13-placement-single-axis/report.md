# Implementation report — placement-single-axis

**Started:** 2026-07-13 13:30
**Finished:** 2026-07-13 14:15
**Review:** [2026-07-13-placement-single-axis](../../reviews/2026-07-13-placement-single-axis.md)
**Branch:** feat/landing-explainer-videos
**Status:** complete

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Audit script + baseline | ✓ done | `227faa8` |
| 2 | Design token rename + mobile Tailwind regen | ✓ done | `d9cae06` |
| 3 | Schema drop + backend refactor + cron delete + min UI | ✓ done | `6725631` (see log)  ⇒ actual commit `<schema>` |
| 4 | Admin display_slot picker + slot column + banner | ✓ done | `b82453c` |
| 5 | Public listings web rewrite | ✓ done | `42b8062` |
| 6 | Public listings mobile rewrite | ✓ done | `17d3b50` |

(Task 3's actual SHA is the "sponsorship-only placement" commit in the log — see full commit list below.)

## Commits (chronological)

```
17d3b50 feat(mobile/listings): two-section Sponsored + Regular layout parity
42b8062 feat(listings): two-section Sponsored + Regular layout driven by display_slot
b82453c feat(admin/sponsorship-tiers): display_slot picker + slot column + post-migration banner
<schema> feat(sponsorship): drop tier from membership + businesses — sponsorship-only placement
d9cae06 refactor(design-tokens): rename tier1/2/3 to sponsoredTop/sponsoredMid/regular
227faa8 chore(db): add audit-subscription-tier-holders script
5d5790c docs(mstack): placement-single-axis plan + review
```

## Deviations from the review

- **Task 3 scope expanded to include Tasks 5 + 6 minimum UI edits.** Same pattern as the per-business-sponsorship refactor Task 3 — schema shrink couples with UI file compile fallout. Task 5 restored the two-section rendering with proper slot buckets; Task 6 did mobile parity.
- **Admin dashboard slot counts (Task 4) deferred.** The stat requires a new query op that joins businesses with sponsorships to bucket by slot. Not blocking; noted below as a follow-up. Current dashboard shows Total + Verified only.
- **`sponsored_slot` added to Business validator.** Not in the review's explicit file list — needed to drive Task 5/6's two-section rendering. Nullable enum (`'top' | 'mid' | 'regular' | null`); populated by listing queries via a correlated subquery, null on detail-only endpoints.

## Verification

- `pnpm typecheck` — clean across all packages
- `pnpm test` — no regressions; `apps/web/tests/check-contrast.test.ts` fixtures renamed to the new tokens
- `pnpm --filter @aira/db migrate` — 0036_fluffy_leader.sql applied cleanly on dev DB
- `pnpm --filter @aira/db audit:subscription-tier-holders --verify` — passes (columns dropped, display_slot populated)
- `pnpm gen:mobile-tw` — mobile Tailwind picked up the renamed tokens; classname sweep confirmed no lingering `bg-tier{1,2,3}` / `text-tier*` hits
- Lefthook (contrast, migrations, no-server-actions, mobile-tailwind) — pass on every commit

## Follow-ups

- **Admin dashboard slot count stat cards.** Currently shows Total + Verified. Once a `listBusinessesWithSlot` op exists (or the existing `listBusinessesOp` output is extended to include `sponsored_slot`), populate three cards: Top / Mid / Regular counts.
- **Client outreach for tier1/tier2 subscribers.** Task 1's audit script found 0 affected businesses on the dev DB. Prod deploy plan: run `pnpm --filter @aira/db audit:subscription-tier-holders` on prod BEFORE applying the migration. If non-empty, brief the client with the list before proceeding.
- **Post-migration admin task.** Every existing sponsorship_tier row was seeded to `display_slot='regular'`. The tier list page now shows a warning banner listing high-priority tiers still stuck at Regular — admins re-classify via the tier form post-deploy or sponsored businesses appear in the wrong section.
- **`toBusinessAdmin` returns `sponsored_slot: null` always.** Admin queries don't project the correlated subquery — the field is a public-listing concern. If future admin UI wants to show which slot a business's sponsorship maps to, add the projection to `getAllBusinesses`.
- **Marketing sweep clean** — no lingering tier refs found in `apps/web/src/components/marketing/`. The demo fixture in `business-panel.tsx` now uses `sponsored_slot: "top"`.
- **The `sponsored_slot` on detail pages.** `getBusinessById` projects it — a business's detail page could show a "Sponsored" chip on the hero (currently doesn't). Small UX polish.

## Recommended next step

**`/mlabs-qa --focus sponsorship-placement`** — drive through the flows end-to-end with Playwright:

1. Admin flow: create a sponsorship_tier with each display_slot value; verify the tier list shows correct labels + the warning banner clears
2. Add a sponsorship to a business tied to a top-slot tier → verify the business appears in the Sponsored section on that category's listing page with the sponsoredTop card chrome
3. Same with mid-slot → sponsored section, sponsoredMid chrome
4. Same with regular-slot → Regular section (sorted before unsponsored), no color badge
5. Cancel a sponsorship → business drops back to Regular section
6. Membership plan flow: create plan without any Placement field (verify field is gone), subscribe a business to it, verify business appears in Regular section (no placement boost from subscription)
7. Mobile parity: repeat 2–6 on the Expo app

If prod smoke shows the audit surfaces real tier1/tier2 subscribers, the review's client-signoff gate becomes retroactively required — pause and brief before publishing.

# Implementation report: S5 — Renewal Reminder, Homepage Sponsored Sort, Sponsorship Slot Limits

**Status:** complete
**Started:** 2026-06-10
**Review:** [2026-06-10-s5-renewal-reminder-homepage-slots](../../reviews/2026-06-10-s5-renewal-reminder-homepage-slots.md)

## Tasks

| Task | Status | Commit | Note |
|---|---|---|---|
| T1: DB migration 0019 — max_slots on sponsorship_tier | ✓ done | b0a124b | Generated as 0019 (0018 was used by S4) |
| T2: Validators — max_slots + slots_used on sponsorship-tier schemas | ✓ done | 3493aeb | Removed .strict() from create/update inputs |
| T3: Service layer — slot enforcement + max_slots threading | ✓ done | b9ac764 | Used new ApiError({status:409}) — no conflict() factory exists |
| T4: Homepage sponsored sort — correlated subqueries in getFeaturedBusinesses | ✓ done | 50081c1 | 3 new homepage-scoped helpers matching S4 pattern |
| T5: Operation — listSponsorshipTiersOp slot annotation | ✓ done | a95f352 | Also exported countActiveSponsorships from sponsorships/index.ts |
| T6: UI — slot info in Add Sponsorship dialog + max_slots in tier form | ✓ done | b000d61 | Category-triggered tier re-fetch with slot annotations; disabled Full tiers |
| T7: F20 — Renewal reminder email template + cron handler | ✓ done | c7cbf05 | Named sendRenewalReminderEmail to match convention |

## Commits

- `b0a124b` feat(db): add max_slots column to sponsorship_tier (migration 0019)
- `3493aeb` feat(validators): add max_slots + slots_used to sponsorship-tier schemas
- `b9ac764` feat(services): slot enforcement + max_slots threading for sponsorship tiers
- `50081c1` feat(services): homepage sponsored sort in getFeaturedBusinesses (F21)
- `a95f352` feat(api): listSponsorshipTiersOp slot annotation + category_id param (F22)
- `b000d61` feat(admin): slot annotations in Add Sponsorship dialog + max_slots in tier form (F22)
- `c7cbf05` feat(cron): renewal reminder email + daily cron handler (F20)

## Follow-ups

- `ApiError.conflict` static factory doesn't exist in `packages/api/src/errors.ts`. Used `new ApiError({ status: 409, ... })` directly. Consider adding the factory if 409s become common.
- `findRenewingSoon` hardcodes `contact_email: null` (businesses table has no email field). Renewal reminder email omits contact email as a result — expected for MVP.
- The renewal reminder cron is registered at `0 8 * * *` (8 AM UTC). In dev, the schedule fires normally but the consoleDriver renders to stdout.

## Recommended next step

`/mlabs-qa` — focus areas:
1. Admin `/admin/sponsorship-tiers` — create a tier with max_slots, verify it saves; try creating a sponsorship that exceeds the slot limit and confirm the 409 error surfaces.
2. Homepage `/` — verify sponsored businesses float to the top of the featured tile vs. unsponsored same-tier businesses.
3. Admin cron page — verify 3 job cards (subscription-status-rollover, sponsorship-status-rollover, renewal-reminder); run each with "Run now".

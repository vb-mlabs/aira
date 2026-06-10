# Implementation report: S4 — Membership, Sponsorship, sponsored sort

**Status:** complete
**Review:** [2026-06-10-s4-membership-sponsorship](../../reviews/2026-06-10-s4-membership-sponsorship.md)
**Branch:** feat/rest-api-migration
**Finished:** 2026-06-10

---

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| T1 | Drizzle schemas + migration 0018 | ✓ done | fca0074 |
| T2 | Validators | ✓ done | d78870b |
| T3 | AuditMeta extension | ✓ done | d678b15 |
| T4 | Service layer — membership_plans + business_subscriptions | ✓ done | 9b8816b |
| T5 | Service layer — sponsorship_tiers + sponsorships + cron_runs | ✓ done | 1984922 |
| T6 | Visibility gate + sponsored sort | ✓ done | d96c7cb |
| T7 | Payment-evidence pipeline + admin operations | ✓ done | 3983351 |
| T8 | Route handlers + CSV export | ✓ done | 6d4d68a |
| T9 | Cron registry + instrumentation.ts wire-up | ✓ done | 3251c2f |
| T10 | Admin Membership Plans CRUD pages | ✓ done | c79ff0d |
| T11 | Admin Sponsorship Tiers CRUD pages | ✓ done | 81546c4 |
| T12 | Subscriptions + Sponsorships sections on business edit page | ✓ done | ec44795 |
| T13 | Businesses list — subscription column, renewing filter, CSV | ✓ done | 4afef94 |
| T14 | Cron page + sidebar nav + roadmap update | ✓ done | 5c9ef49 |

## Commits (14 total)

- `fca0074` feat(db): S4 schemas + migration 0018 — membership, subscriptions, sponsorships, cron
- `d78870b` feat(validators): S4 Zod schemas — membership plans, subscriptions, sponsorship tiers, sponsorships
- `d678b15` feat(db): extend AuditMeta with 4 S4 subscription + sponsorship variants
- `9b8816b` feat(services): membership plans + business subscriptions service layer
- `1984922` feat(services): sponsorship tiers, sponsorships + cron service layer
- `d96c7cb` feat(services): visibility gate + sponsored sort on public business queries
- `3983351` feat(web): evidence pipeline + admin operations for S4 resources
- `6d4d68a` feat(web): S4 route handlers + CSV renewals export
- `3251c2f` feat(web): cron registry + instrumentation wire-up (node-cron^4)
- `c79ff0d` feat(admin): membership plans CRUD pages (T10)
- `81546c4` feat(admin): sponsorship tiers CRUD pages (T11)
- `ec44795` feat(admin): subscriptions + sponsorships sections on business edit page (T12)
- `4afef94` feat(admin): businesses list — subscription column, renewing filter, CSV button (T13)
- `5c9ef49` feat(admin): cron page + sidebar nav + S4 roadmap done (T14)

## Deviations from review

- **Migration 0017 → 0018:** The review said "produce migration 0017" but 0017 was already taken by the S3 sprint. `db:generate` correctly produced 0018.
- **Add subscription/sponsorship form modals:** Review said "flat layout (no modals)" for T12 but mockup v4 FEEDBACK.md + the user's explicit "popup modals" request locked this to `@base-ui/react/dialog` modals.
- **`claimWithAdvisoryLock` fn signature:** Used `fn: () => Promise<void>` (closure-based) to avoid the `PgTransaction` ≠ `Database` type mismatch inside Drizzle's `db.transaction()` callback.
- **DISTINCT ON for latest subscription:** Used raw `db.execute(sql...)` in `listAllBusinessesAdminOp` to efficiently get the latest subscription per business.

## Follow-ups

- Evidence upload: if the server fails between creating a subscription and uploading evidence, the sub exists with no evidence. The "No evidence" warning chip ensures this is visible.
- The `renewing-filter.tsx` client component is wrapped in `<Suspense>` in the page per Next.js requirements for `useSearchParams`.

## Recommended next step

Run `/mlabs-qa` focused on:
1. Admin → Membership plans: create, edit, deactivate
2. Admin → Sponsorship tiers: create with priority conflict detection
3. Admin → Businesses → [id]: Add subscription (with/without evidence), Add sponsorship, Cancel sponsorship
4. Admin → Businesses list: subscription column, renewing filter, CSV download
5. Admin → Cron: "Run now" triggers a run row that progresses to succeeded/skipped
6. Public listings: unpaid business doesn't appear; sponsored business floats to top of its category

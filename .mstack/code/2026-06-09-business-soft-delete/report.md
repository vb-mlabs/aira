# Implementation report — Business soft-delete + restore (F13 partial)

**Status:** complete
**Plan:** [2026-06-09-business-soft-delete](../../plans/2026-06-09-business-soft-delete.md)
**Review:** [2026-06-09-business-soft-delete](../../reviews/2026-06-09-business-soft-delete.md)
**Branch:** `feat/rest-api-migration`
**Run window:** 2026-06-09 20:30 → 21:10

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Schema column + partial index | ✓ done | `92db3a6` |
| 2 | AuditMeta extension | ✓ done | `005fbc9` |
| 3 | Validator widening | ✓ done | `466dc94` (with T4) |
| 4 | Public-read filters + admin reads | ✓ done | `466dc94` (with T3) |
| 5 | archive/restore service mutations | ✓ done | `0f7a079` |
| 6 | archive/restore/listAdmin ops | ✓ done | `816c6b9` |
| 7 | POST routes | ✓ done | `5d231e3` |
| 8 | /admin/businesses page rework | ✓ done | `3551a29` |
| 9 | ArchiveControl + AlertDialog | ✓ done | `e0575c0` |
| 10 | Admin detail page op switch | ✓ done | `8db0856` |
| 11 | Smoke test + report | ✓ done | (this commit) |

## Commits

```
8db0856 feat(admin): admin detail page uses getBusinessByIdAdminOp
e0575c0 feat(admin): ArchiveControl component + integrated in detail header
3551a29 feat(admin): /admin/businesses gains Active/Archived filter + Status column
5d231e3 feat(api): POST /admin/businesses/[id]/archive + /restore routes
816c6b9 feat(api): archive/restore/listAdmin/getByIdAdmin ops
0f7a079 feat(businesses): archiveBusiness + restoreBusiness service mutations
466dc94 feat(businesses): filter archived in public reads; add admin read paths
005fbc9 feat(audit): extend AuditMeta with business.archived + business.restored
92db3a6 feat(db): deleted_at column + partial active-subset index on businesses
```

## Deviations from review

- **T3 + T4 combined into one commit.** Same coupling pattern surfaced
  on the prior two runs (pagination/search and rating): widening
  `Business` to require `deleted_at: string | null` forces
  `toBusiness()` to populate the field, otherwise the validator
  commit fails typecheck. The split is intrinsically wrong for this
  category of change.

- **`updateBusiness` post-update read switched** from `getBusinessById`
  (which now filters archived) to `getBusinessByIdIncludingArchived`,
  to preserve the locked-decision behavior that admin can edit
  archived rows. Folded into T5 since it's a logical extension of
  the soft-delete plumbing.

- **Pre-existing `/admin/businesses` featured-only bug fixed** as
  planned: now uses `listAllBusinessesAdminOp` which returns all
  active rows (and archived when `?archived=1`).

## Notable observation — phantom audit rows on failed mutation

The audit-before-mutation convention is explicit in `audit_log.ts`:
write the audit first, do the mutation second. If the mutation fails
(in our case, a double-archive attempt where the `WHERE deleted_at IS
NULL` clause filters out the already-archived row), the audit row is
still committed.

In the smoke run, the audit history shows 3 rows for 2 successful
user actions because of one failed double-archive attempt. This is
the documented tradeoff — "audit succeeded but mutation failed →
phantom row" is the lesser evil vs "mutation succeeded with no trail".
Anyone investigating audit data should know about this.

If this proves noisy in practice, the standard mitigation is to
wrap audit + mutation in a transaction (which would roll back the
audit on mutation failure). But that flips the failure-mode tradeoff
and would need a deliberate convention change across the whole admin
service. Out of scope for this feature.

## Follow-ups

- **Hard-purge cron** (180-day default) — S5 (F14). Cron job that
  hard-deletes rows where `deleted_at < now() - interval '180 days'`.
- **Bulk archive / restore on the admin list** — single-row only
  today. Could add row-checkbox selection + bulk action later.
- **audit_log filter UI** for archive actions — `audit_log` has the
  data, but there's no admin UI to filter by action type yet.
- **Restore-from-archive button on the admin list** — admins currently
  have to click into the archived row's edit page to restore. A
  one-click restore inline on the table row would be ergonomic.
- **Mobile parity** — same REST endpoints already work for mobile if
  it ever ships an admin surface.

## Recommended next step

Run `/mlabs-qa` with focus `archive/restore round-trip + public surfaces`
— Playwright will exercise the admin UI's archive dialog → confirm →
RSC refresh cycle that the curl smoke can't cover, plus the
public-surface filtering on all three reads (home featured, category
listing, detail deep-link).

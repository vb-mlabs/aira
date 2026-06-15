# Implementation report: F22 admin audit log UI (minimal scope)

**Date:** 2026-06-15
**Review:** [2026-06-15-audit-log-ui](../../reviews/2026-06-15-audit-log-ui.md)
**Status:** complete
**Branch:** feat/rest-api-migration

---

## Tasks

| # | Task | Result | Commit |
|---|---|---|---|
| T1 | Extract AuditMeta + KNOWN_AUDIT_ACTIONS to validators | ✓ done | `7600c3d` |
| T2 | Extend `listAudit` filters + LEFT JOINs + validator schema | ✓ done | `3b148e3` |
| T3 | Renderer helpers + AuditTable wiring | ✓ done | `6504604` |
| T4 | FilterBar + ActorTypeahead + page wiring | ✓ done | `d2723e8` |

## Commits

| SHA | Message |
|---|---|
| `77e1c70` | docs(mstack): plan + review for F22 audit log UI |
| `7600c3d` | refactor(audit): extract AuditMeta + KNOWN_AUDIT_ACTIONS to validators |
| `3b148e3` | feat(audit): actor/target_type/action filters + business-id JOINs |
| `6504604` | feat(audit): readable detail rendering + target-id linking in admin table |
| `d2723e8` | feat(admin): FilterBar + ActorTypeahead + audit page wiring |

5 commits this run (1 workflow + 4 feature).

## What this delivers

`/admin/audit` is no longer "scroll a wall of raw JSON". The new
surface gives the admin/operator:

- **Filters that compose:** date range (existing) + actor typeahead
  (300ms debounce hitting `listUsersOp`) + target-type closed dropdown
  (7 known types) + action closed dropdown (24 known kinds grouped by
  domain with humanised labels). All URL-driven; pagination resets to
  page 1 when any filter changes. "Clear all" button when filters are
  active.
- **English summaries per row.** Every one of the 24 `AuditMeta.kind`
  variants renders a one-line summary. Nested branches on `reason` for
  `session.revoked` (5 reasons) and `user.signed_in_failed` (4 reasons).
  High-volume auth events (`signed_in`, `signed_in_failed`,
  `signed_up`) render in muted text so they don't drown admin actions
  out of the scan.
- **Target ids link to where the operator is going next.** `user` →
  `/admin/users/<id>`, `business` → `/admin/businesses/<id>`,
  `business_subscription` + `sponsorship` → `/admin/businesses/<parent
  business id>` (resolved through two LEFT JOINs in `listAudit`),
  `community_post` → `/admin/community`, `app_setting` → full key
  text, `session` → muted "session" placeholder.
- **Compile-time exhaustiveness.** Two assertions in
  `packages/validators/src/audit-meta.ts` enforce that
  `AuditMeta["kind"]` and `KNOWN_AUDIT_ACTIONS` stay in sync. The
  renderer's outer `never`-typed default catches any new variant
  shipped without a render case.

## Follow-ups

- **F22 wider scope** stays explicitly deferred per the 2026-06-15
  roadmap: CSV export, `ip_address` column + backfill, full-text
  metadata search, retention cron.
- **QA verification.** Per-task acceptance was typecheck/lint only.
  Send `/mlabs-qa --focus audit` next to drive the page through real
  scenarios:
  1. Page loads with no filters; renders all entries with English
     detail and correct target links
  2. Each of the 24 action kinds present in the seeded audit_log
     renders the expected sentence
  3. Actor typeahead works (300ms debounce); selecting locks
     `?actor_id`; clearing drops it; pagination resets to page 1
  4. Target-type filter drops + clears
  5. Action filter drops + clears (with the optgroups in place)
  6. Combined filters compose with AND semantics
  7. Empty state when filters match zero rows surfaces the friendly
     message
  8. No hydration warnings (regression check from 2026-06-14)
  9. Regression: `/admin/users/<id>` link from a `user` audit row
     navigates correctly; `/admin/businesses/<id>` from a
     `business_subscription` row likewise.
- **Action dropdown labels** — three were hand-curated via the
  override map (`Sign-in failed`, `Subscription recorded`, `Renewal
  follow-up`). Spot-check the auto-derived labels for the other 21
  and add overrides if any read oddly.

## Recommended next step

`/mlabs-qa --focus audit` — verify the 9 scenarios above end-to-end.
After that the S6 remaining items are the TODOS subset
(audit retention cron + super_admin narrowing fix in 4 sibling route
handlers) and the S0-blocked mobile work.

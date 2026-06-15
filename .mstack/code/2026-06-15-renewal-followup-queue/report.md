# Implementation report: F23′ renewal follow-up queue

**Date:** 2026-06-15
**Review:** [2026-06-15-renewal-followup-queue](../../reviews/2026-06-15-renewal-followup-queue.md)
**Status:** complete
**Branch:** feat/rest-api-migration

---

## Tasks

| # | Task | Result | Commit |
|---|---|---|---|
| T1 | Schema — `subscription_followup` + enum | ✓ done | `7303bb1` (+ `21adb61` chore) |
| T2 | AuditMeta variant | ✓ done | `eb0053b` |
| T3 | Validators + subpath export | ✓ done | `7201f4f` |
| T4 | Service queries (`listQueue`, `listForSubscription`) | ✓ done | `1610954` |
| T5 | Service mutation (transactional create) | ✓ done | `b1cf318` |
| T6 | Operations file | ✓ done | `5b23bc1` |
| T7 | REST routes | ✓ done | `fc7f5ca` |
| T8 | Admin page + queue table + window chips (read-only) | ✓ done | `cdc7ea8` |
| T9 | Followup modal + outcome radio + sidebar entry | ✓ done | `2b0cabd` |

## Commits

| SHA | Message |
|---|---|
| `82e6073` | docs(roadmap): trim S6 — defer generic AppSetting admin hub *(pre-existing)* |
| `2657159` | docs(roadmap): reframe F23 as in-UI renewal queue *(pre-existing)* |
| `6df81f6` | docs(mstack): plan + review for F23′ renewal follow-up queue |
| `21adb61` | fix(db): correct 0022 snapshot chain (broken in F17 SQL-only seed) |
| `7303bb1` | feat(db): add subscription_followup table + followup_outcome enum |
| `eb0053b` | feat(db): add business.subscription_followup AuditMeta variant |
| `7201f4f` | feat(validators): add subscription-followup schemas + subpath export |
| `1610954` | feat(services): listQueue + listForSubscription for renewal followups |
| `b1cf318` | feat(services): transactional create followup with audit-before-insert |
| `5b23bc1` | feat(api): renewal followup queue + history + create ops |
| `fc7f5ca` | feat(api): GET queue + GET/POST followups REST routes |
| `cdc7ea8` | feat(admin): /admin/renewals page + queue table + window chips |
| `2b0cabd` | feat(admin): followup modal + outcome radio + sidebar entry |

11 implementation/workflow commits over this run (9 feature + 1 db chore + 1 workflow).

## What this delivers

The PRD F16/F23 renewal-chase workflow as an in-UI queue at `/admin/renewals`:

- Derived view, no batches — subscriptions enter the queue automatically based on `end_date` + `payment_status`, drop out when the latest followup marks them paid or reschedules them past now.
- 6 outcomes: `called` / `voicemail` / `no_answer` / `refused` / `paid` / `reschedule`. Each outcome writes both a `subscription_followup` row and a typed `audit_log` row in one transaction (audit-before-INSERT with pre-generated UUID).
- Reschedule = scheduled_next timestamp; the row reappears automatically when due.
- Phone + WhatsApp tap-targets inline on each queue row (stopPropagation pattern matching the community-table action cell).
- Modal mirrors `features/admin/community/post-detail-modal` exactly — base-ui Dialog with controlled `open`, lazy-fetched history panel, parent unmounts on close (clean state lifecycle without reset effects).
- Sidebar entry "Renewals" at position 2 (between Businesses and Categories) with `PhoneCall` icon.
- Existing CSV at `/api/v1/admin/businesses/renewals.csv` preserved unchanged.

## Follow-ups

- **Runtime verification.** Per-task acceptance was typecheck/lint only — `import "server-only"` blocks tsx smoke tests outside Next.js. Send `/mlabs-qa` next with focus on: queue ordering (overdue first), reschedule round-trip (record outcome → row disappears → manually advance scheduled_next → reappears), audit row written in the same transaction, paid → record-payment deep-link.
- **Audit UI rendering.** Until F22 polish ships, the new `business.subscription_followup` rows render as raw JSON in `/admin/audit`. Cosmetic; pre-existing pattern for all variants.
- **The dropped-from-review sub-tasks.** T6 added `listFollowupHistoryOp` (the modal needs it) which wasn't in the review's REST routes section explicitly; included anyway because T9 acceptance required it. Mention this as a review-completeness note for future plans.

## Recommended next step

`/mlabs-qa --focus renewals` — drive Playwright through the queue:
1. Land on `/admin/renewals`, default window 30d
2. Switch chip to 7 / 14 / 60 / 90 — URL + queue update
3. Click a row → modal opens with subscription detail + history (empty initial)
4. Outcome = voicemail, optional note → Save → row drops from queue
5. Outcome = reschedule (no scheduleDays) → blocked with friendly error
6. Outcome = reschedule with scheduleDays = 1 → row disappears; advance DB clock or scheduled_next directly, re-render → reappears
7. Outcome = paid → modal shows "Record payment →" deep-link before close
8. Outcome = called (no note) → blocked with friendly error
9. Phone + WhatsApp icon-buttons fire correct `tel:` and `wa.me/` URLs without opening the modal
10. Visit `/admin/audit` → confirm 5 `business.subscription_followup` rows (one per save above) with correct metadata.outcome
11. Sidebar shows "Renewals" highlighted while on `/admin/renewals`

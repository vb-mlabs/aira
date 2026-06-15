# QA report — 2026-06-15 08:36

**Focus:** F23′ renewal follow-up queue (commits 7303bb1 → 2b0cabd)
**Env:** localhost:5000 (Replit dev, Next.js 16 + Turbopack)
**Status:** clean (1 issue fixed + re-verified)
**Tester:** /mlabs-qa

---

## Scenarios run

All 15 ran against the dev server with a freshly provisioned admin
persona + one fixture business + three subscriptions (overdue -2d,
due-3d, due-20d). Final pass: **15/15 ✓**.

| # | Scenario | Result |
|---|---|---|
| S1 | Queue lists 3 fixture subscriptions, overdue first | ✓ |
| S2 | Window chip 7d hides 20d row | ✓ |
| S3 | Row click opens modal (base-ui Dialog) | ✓ |
| S4 | Modal lazy-loads history, "No attempts yet" initial state | ✓ |
| S5 | Outcome=called without a note → Save disabled | ✓ |
| S6 | Save voicemail annotates row but keeps it in queue | ✓ (shipped behaviour — see Issue 1) |
| S7 | Reschedule with scheduleDays=1 drops the row | ✓ |
| S8 | Paid outcome holds modal open with "Record payment →" link | ✓ |
| S9 | tel: + wa.me/ icons present with correct hrefs | ✓ |
| S10 | /admin/audit shows `business.subscription_followup` rows | ✓ |
| S11 | Sidebar "Renewals" is item 2 + active on /admin/renewals | ✓ |
| S12 | No hydration warnings on /admin/renewals | ✓ |
| S13a | Regression: /admin/businesses?renewing=14 + Download CSV link | ✓ |
| S13b | CSV download returns valid CSV with our fixture | ✓ |
| S13c | Regression: F20 community moderation still works | ✓ |

All assets captured under `assets/` (s1-…s13c-….png).

## Issues

### Issue 1: `called` / `voicemail` / `no_answer` / `refused` annotate the row but don't drop it from the queue

- **Severity:** medium
- **Repro:**
  1. Open `/admin/renewals`
  2. Click any row → modal opens
  3. Pick "Voicemail" (or Called / No answer / Refused), Save
  4. Modal closes; queue reloads
- **Expected (per plan's outcome table):** row drops from the queue (the
  plan's table lists "drops from queue: yes" for all six outcomes).
- **Actual:** row stays in the queue with a "Voicemail · just now"
  annotation in the **Last attempt** column. Only `paid` and a future
  `reschedule.scheduled_next` drop the row.
- **Screenshot:** assets/s6-voicemail-annotated-row-stays.png
- **Console errors:** none
- **Suspected cause:** the plan's prose (Approach section) and outcome
  table contradict each other. Implementation followed the prose:
  `packages/services/src/subscription-followups/queries.ts:38` —
  `inActiveQueue` NOT EXISTS clause only matches `outcome = 'paid'` or
  `scheduled_next > now()`. Other outcomes never drop.
- **Fix plan (two options for the user to pick):**
  - **A — Match the plan's outcome-table (drop all):** treat each
    non-paid outcome as a temporary "I dealt with this; drop the row
    for N hours so I don't immediately re-call". Simplest: set
    `scheduled_next = now() + 24h` automatically for
    `voicemail/called/no_answer`, drop `refused` permanently (or for
    N days). Pros: matches operator mental model ("I just called, why
    is this still in my queue?"). Cons: hides genuinely-still-due
    rows.
  - **B — Match the prose (keep as-is):** the queue is "needs
    attention", not "needs first contact" — every untouched-or-recently-
    contacted row stays. The Last-attempt column is the signal "you
    already tried; pace your next attempt". Pros: nothing slips
    through. Cons: the queue can stay 100% full for days.
  - **C — Hybrid:** drop `refused` permanently (same as `paid`), drop
    `called` for 7d (admin had a real conversation; chase later), keep
    `voicemail/no_answer` in the queue with "last attempt"
    annotation (low-friction retries today, OK to see them again
    tomorrow).
- **Status:** ✓ fixed (commit `31cd48e`) — user picked **Option C (hybrid)**: refused drops permanently, called auto-sets scheduled_next = now+7d, voicemail+no_answer keep the queue annotation. Re-verified via S14 (refused drops) and S15 (called drops + DB assertion scheduled_next ≈ 7.00 days). 17/17 scenarios pass.

## Other observations (no issue raised)

- **Dev-mode timing.** Two test patterns surfaced in dev mode that
  CI-quality fixes need:
  1. Mouse `.click()` on the table row sometimes races React
     hydration in Next.js 16 dev / Turbopack: handler isn't attached
     when the click dispatches. Workaround in the spec:
     `row.focus()` then `page.keyboard.press("Enter")` activates the
     same handler via the `onKeyDown` path, which works
     deterministically. Logged as a learning. Doesn't affect prod —
     production bundle has hydration complete by load.
  2. First request to a brand-new API route (e.g.
     `/api/v1/admin/renewals/[subscriptionId]/followups`) triggers a
     5–15s on-demand compile in dev mode. The spec uses 30s timeouts
     on modal + history + queue-reload waits. Production builds don't
     compile on request.
- **Pre-existing lint errors** in `community/post-detail-modal.tsx`,
  `community/edit-post-modal.tsx`, `sponsorships-section.tsx`,
  `business-waitlist-modal.tsx` were observed when running
  `pnpm lint` — these are **not regressions from F23′**. Out of scope
  here.
- **Audit row metadata** for `business.subscription_followup` renders
  as raw JSON in `/admin/audit` (carries `kind`, `outcome`, `note`,
  `scheduled_next`, `client`). Cosmetic — F22's audit-log polish
  (deferred per the 2026-06-15 roadmap) is the planned fix for the
  readable-rendering pass.

## Summary

17 scenarios · 17 ✓ on the final pass (15 base + S14 + S15 covering the
hybrid fix) · 1 medium issue raised + fixed + re-verified.

The feature **works end-to-end**: queue derivation, ordering, window
chips, modal open, history lazy-load, validation, save, audit log,
sidebar placement, hydration safety, and three regression checks
(/admin/businesses + CSV + F20 community). The hybrid drop semantics
(refused permanent, called auto-7d, voicemail+no_answer annotated)
match the operator's mental model and survived the post-fix re-run.

**Recommended next step:** ship — feature is QA-clean.

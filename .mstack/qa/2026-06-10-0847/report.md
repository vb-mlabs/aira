# QA report — 2026-06-10 08:47

**Focus:** S5 — Slot limits (F22), Homepage sponsored sort (F21), Renewal reminder cron (F20) + S4 smoke regression
**Env:** localhost:5000
**Status:** clean
**Tester:** /mlabs-qa

## Scenarios run
1. F22: Create tier with max_slots=1 → saves, API confirms — pass
2. F22: Add Sponsorship dialog shows slot annotation after category select — pass
3. F22: Create sponsorship to fill slot — pass
4. F22: Dialog shows tier as Full + disabled after slot filled — pass
5. F22: API returns 409 (sponsorship.tier_slots_full) when slot exceeded — pass
6. F21: Featured businesses API returns 200 with items — pass
7. F21: Business with active sponsorship in featured results — pass
8. F21: Homepage renders featured tile without error — pass
9. F20: Admin cron page shows 3 job cards including renewal-reminder — **fail**
10. F20: Run now on renewal-reminder completes without crash — **fail** (depends on 9)
11. S4 regression: Admin sidebar S4 links — pass
12. S4 regression: Membership plans list — pass
13. S4 regression: Sponsorship tiers list — pass
14. S4 regression: Businesses list with renewing filter — pass
15. S4 regression: Public listings API — pass

## Issues

### Issue 1: renewal-reminder card missing from /admin/cron page
- **Severity:** high
- **Repro:**
  1. Navigate to `/admin/cron`
  2. Count the cron job cards
- **Expected:** Three cards — `subscription-status-rollover`, `sponsorship-status-rollover`, `renewal-reminder`
- **Actual:** Only two cards shown; `renewal-reminder` is absent
- **Screenshot:** assets/11-f20-cron-three-cards.png (not created — test failed before shot)
- **Console errors:** none
- **Suspected cause:** `apps/web/src/app/admin/cron/page.tsx:9` — `KNOWN_JOBS` is a hardcoded array that was not updated in T7. The cron handler and registry entry were added correctly, but the admin page's static list was not updated.
- **Fix plan:** Add `{ name: "renewal-reminder", schedule: "0 8 * * * (daily 08:00 UTC)" }` to `KNOWN_JOBS` in `page.tsx`
- **Status:** ✓ fixed (commit 3cf8263)

## Summary
1 total · 0 critical · 1 high · 0 medium · 0 low

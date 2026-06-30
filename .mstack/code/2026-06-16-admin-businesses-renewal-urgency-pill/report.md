# Implementation report — admin businesses renewal urgency pill

**Status:** complete
**Branch:** `feat/admin-businesses-renewal-urgency-pill`
**Plan:** [2026-06-16-admin-businesses-renewal-urgency-pill](../../plans/2026-06-16-admin-businesses-renewal-urgency-pill.md)
**Review:** [2026-06-16-admin-businesses-renewal-urgency-pill](../../reviews/2026-06-16-admin-businesses-renewal-urgency-pill.md)

---

## Tasks

| | Task | Commit |
|---|---|---|
| ✓ | Task 1 — Extract expiryLabel into shared helper + Vitest | `f1d30c7` |
| ✓ | Task 2 — Extend AdminBusinessItemSchema with end_date + days_remaining | `c991780` |
| ✓ | Task 3 — Render caption + overdue row treatment on /admin/businesses | `75797a0` |

## Commits

```
75797a0 feat(admin): renewal urgency caption + overdue row stripe on businesses list
c991780 feat(admin): expose latest subscription end_date + days_remaining
f1d30c7 refactor(admin): extract expiryLabel into shared helper + Vitest
8d4a871 docs(mstack): admin businesses renewal urgency pill — mockup + plan + review
```

## Verification

- `pnpm --filter @aira/web typecheck` — clean after each task
- `pnpm --filter @aira/web test` — 171/171 passing (added 4 new test cases in `expiry-label.test.ts`)
- Lefthook pre-commit — passes on every commit (`check-migrations`, `check-no-server-actions`, `check-contrast`, `check-mobile-tailwind` as applicable)
- No deps added, no migrations, no schema changes at the DB layer
- No "use server" directives introduced (gated by `check-no-server-actions`)

## Follow-ups

- **Pre-existing lint noise in `businesses-admin.ts`** — the file has 8 unused-import warnings + the wider app has 8 `process.env` direct-access errors in unrelated files. Both predate this PR. Lefthook doesn't run lint, so they aren't blocking commits, but worth a cleanup sweep.
- **The 4 unrelated tsx files** carried over from main on the feature branch (`business-detail.tsx`, `business-create-form.tsx`, `[id]/page.tsx`, `feature-image-section.tsx`) are still uncommitted. User decision: their work-in-progress stays in the working tree; they'll either stash, commit, or move it as appropriate.
- **`/admin/businesses` rendering not visually verified.** This skill stops at typecheck + unit tests; the actual cell render and the overdue row stripe haven't been seen in a browser. The mockup at `.mstack/mockups/admin-businesses-renewal-pill/v2/index.html` is the reference but not the same as the real page.

## Recommended next step

Run `/mlabs-qa` with the focus area "admin businesses renewal urgency caption + overdue row stripe" to drive Playwright through the directory at a few seeded states (paid+future, paid+critical ≤3d, overdue 3d, overdue 12d, pending+soon, no subscription). The QA pass should also click through to confirm the whole-row navigation still works on overdue rows.

# Implementation report — Admin star rating (F11)

**Status:** complete
**Plan:** [2026-06-09-business-rating](../../plans/2026-06-09-business-rating.md)
**Review:** [2026-06-09-business-rating](../../reviews/2026-06-09-business-rating.md)
**Branch:** `feat/rest-api-migration`
**Run window:** 2026-06-09 19:30 → 19:55

## Tasks

| # | Task | Status | Commit |
|---|------|--------|--------|
| 1 | Schema column + CHECK | ✓ done | `418e796` |
| 2 | Validator widening | ✓ done | `7c945c3` (with T3) |
| 3 | Service mapper + mutation | ✓ done | `7c945c3` (with T2) |
| 4 | RatingPill component | ✓ done | `f79b3cc` |
| 5 | Mount on Card + Detail | ✓ done | `3dc57d5` |
| 6 | Admin RatingSection | ✓ done | `37509cf` |
| 7 | Smoke test + report | ✓ done | (this commit) |

## Commits

```
37509cf feat(admin): RatingSection on business edit form
3dc57d5 feat(listings): render RatingPill on Card + Detail header
f79b3cc feat(listings): add RatingPill component
7c945c3 feat(businesses): thread rating through validator + service layer
418e796 feat(db): add rating column + CHECK constraint to businesses
```

## Deviations from review

- **T2 + T3 combined into one commit.** Same reason as the listings
  pagination run: widening `Business` to require `rating: number | null`
  forces `toBusiness()` to populate the new field, otherwise the validator
  commit fails typecheck on its own. The review's atomicity boundary is
  the wrong split for this category of change. Recorded a learning that
  schema-and-mapper changes are always coupled.

- **`runUpdate` data type widened to `Record<string, string | number | null>`.**
  The admin form's `runUpdate` helper was typed for string-only fields.
  Rating is the first non-string field, so its type widened. Low impact —
  all other callers still pass strings or null and remain assignable.

## Follow-ups

- **Mobile parity.** Same REST endpoint already returns `rating`. Mobile
  renders when its listings screen lands. No server-side work needed.
- **Rating in sponsored sort.** Out of scope per the plan; revisit in S4
  (sponsored placement) if needed.
- **5-star visual render.** Deferred per the open question. The compact
  `★ 4.5` reads cleanly; reopen only if customer feedback wants the
  larger treatment.
- **Search by rating.** Out of scope. F8 stays as name + description +
  address.
- **Sort by rating in admin list.** Could be useful for quickly finding
  unrated businesses — small follow-up if admin asks.

## Recommended next step

Run `/mlabs-qa` with focus `rating display + admin set/clear` —
Playwright will exercise the admin save → public re-render cycle that
the curl smoke can't cover. The QA spec can seed two extra businesses
(one rated, one unrated) to compare the visual output.

# Implementation report — 2026-06-09-s3-finish

**Status:** complete
**Branch:** feat/rest-api-migration
**Tasks:** 7/7 done · 0 paused · 0 skipped

---

## Tasks

| # | Name | Status | Commit |
|---|------|--------|--------|
| T1 | DB schema — business_category + business_image + migration 0017 | ✓ done | a638a3a |
| T2 | Validators — BusinessImageSchema + widen BusinessSchema | ✓ done | 1576c6f |
| T3 | Services — gallery mutations + multi-category queries | ✓ done | 28d9de9 |
| T4 | Image upload pipeline + admin API routes | ✓ done | 44aec30 |
| T5 | Admin UI — multi-category checkboxes + gallery section | ✓ done | 99cd944 |
| T6 | Google Places Autocomplete | ✓ done | d703410 |
| T7 | Public detail page — gallery carousel | ✓ done | f398d35 |

## Commits

- `a638a3a` feat(db): business_category + business_image tables + migration 0017 (T1)
- `1576c6f` feat(validators): BusinessImageSchema + widen BusinessSchema (T2)
- `28d9de9` feat(services): gallery image mutations + multi-category queries (T3)
- `44aec30` feat(api): image upload pipeline + admin gallery routes (T4)
- `99cd944` feat(admin): multi-category checkboxes + gallery upload section (T5)
- `d703410` feat(admin): Google Places Autocomplete for address field (T6)
- `f398d35` feat(listings): gallery carousel on public business detail page (T7)

## Implementation notes

- `addBusinessImage` auto-computes `sort_order` as `max(sort_order) + 1` — no caller arithmetic needed.
- `getBusinessesByCategoryPaged` now uses an OR subquery: primary category slug match OR business_category join match, so businesses tagged with an extra category appear in that category's listing.
- `updateBusiness` wraps extra-category diff in a `db.transaction()`: delete-not-in-new-set + insert-on-conflict-do-nothing pattern ensures atomicity.
- Google Places Script is injected in the admin layout only when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set; `PlacesAddressInput` falls back to a plain `<Input>` when the SDK is absent.
- Gallery carousel uses CSS `scroll-snap-type: x mandatory` with no extra deps; dot indicators update on `onScroll`.

## Follow-ups

- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in the Replit env (restrict to HTTP referrers first).
- Gallery images are stored as object-storage paths; the `/api/storage/[...key]` route serves them — no CDN caching yet.

## Recommended next step

Run `/mlabs-qa` with focus on: admin business edit (gallery upload, multi-category checkboxes, address autocomplete) + public detail page gallery carousel.

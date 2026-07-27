# Implementation: Business Logo Upload

**Started:** 2026-07-27 08:15
**Finished:** 2026-07-27 08:55
**Review:** [2026-07-27-business-logo](../../reviews/2026-07-27-business-logo.md)
**Branch:** feat/business-logo
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Add `logo_url` column + migration — `8dbe34a`
- [x] **Task 2:** Extend `BusinessSchema` + service projection — `1bd8176`
- [x] **Task 3:** Service functions `setBusinessLogo` / `clearBusinessLogo` — `226d378`
- [x] **Task 4:** Upload pipeline `processAndStoreBusinessLogo` — `6602f53`
- [x] **Task 5:** Route handlers `POST` / `DELETE .../logo` — `0547318`
- [x] **Task 6:** Add `react-easy-crop` dep — `5442fcc`
- [x] **Task 7:** `LogoControl` + `LogoCropModal` — `4f601ca` (+ lint fix `d7370e7`)
- [x] **Task 8:** Wire `LogoControl` into admin business detail — `906f454`
- [x] **Task 9:** Web `BusinessCard` avatar swap — `16f5a91`
- [x] **Task 10:** Web `MyListingsCard` avatar swap — `bc2466f`
- [x] **Task 11:** Mobile `BusinessCard` image branch — `1d3b20d`
- [x] **Task 12:** Typecheck + lint + build — passes (stray fix `b4739f4`)

## Stray fixes (not part of the logo scope)

- `b4739f4` — `fix(admin/subscriptions): move Date.now out of render body`
  Fixes a lint error introduced earlier in this session by
  `5833624 feat(admin/subscriptions): require plan + gate renewals to 30-day window`.
  Committed on this branch because the lint gate refused to pass until
  it was fixed; kept as its own commit so the attribution is clear.

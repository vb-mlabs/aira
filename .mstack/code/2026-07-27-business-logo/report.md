# Implementation Report — Business Logo Upload

**Status:** complete
**Started:** 2026-07-27 08:15
**Finished:** 2026-07-27 08:55 (approx)
**Review:** [.mstack/reviews/2026-07-27-business-logo.md](../../reviews/2026-07-27-business-logo.md)
**Branch:** `feat/business-logo` (off `feat/landing-explainer-videos` @ 4552b47)
**Commits landed on this branch:** 13 (12 task + 1 stray-fix from earlier session work)

---

## Tasks

| # | Task                                                | Status | Commit    |
|---|-----------------------------------------------------|--------|-----------|
| 1 | Add `logo_url` column + migration                   | ✓ done | `8dbe34a` |
| 2 | Extend `BusinessSchema` + service projection        | ✓ done | `1bd8176` |
| 3 | Service functions `setBusinessLogo` / `clearBusinessLogo` | ✓ done | `226d378` |
| 4 | Upload pipeline `processAndStoreBusinessLogo`       | ✓ done | `6602f53` |
| 5 | Route handlers `POST` / `DELETE .../logo`           | ✓ done | `0547318` |
| 6 | Add `react-easy-crop` dep (`^6.2.3`)                | ✓ done | `5442fcc` |
| 7 | `LogoControl` + `LogoCropModal`                     | ✓ done | `4f601ca`, `d7370e7` (lint fix follow-up) |
| 8 | Wire `LogoControl` into admin business detail       | ✓ done | `906f454` |
| 9 | Web `BusinessCard` avatar swap                      | ✓ done | `16f5a91` |
| 10| Web `MyListingsCard` avatar swap                    | ✓ done | `bc2466f` |
| 11| Mobile `BusinessCard` image branch                  | ✓ done | `1d3b20d` |
| 12| Typecheck + lint + build                            | ✓ done | `b4739f4` (stray-fix), verification passing |

## Commits (in order)

- `8dbe34a` — `feat(db): add businesses.logo_url column`
- `1bd8176` — `feat(validators,services): plumb logo_url through BusinessSchema`
- `226d378` — `feat(services): setBusinessLogo / clearBusinessLogo`
- `6602f53` — `feat(admin): processAndStoreBusinessLogo pipeline`
- `0547318` — `feat(api): POST/DELETE /api/v1/admin/businesses/[id]/logo`
- `5442fcc` — `chore(web): add react-easy-crop for client-side logo square crop`
- `4f601ca` — `feat(admin): LogoControl + LogoCropModal`
- `906f454` — `feat(admin): stack LogoControl above FeatureImageControl on business detail`
- `16f5a91` — `feat(listings): web BusinessCard reads logo_url for the avatar`
- `bc2466f` — `feat(account): MyListingsCard reads logo_url for the avatar`
- `1d3b20d` — `feat(mobile/listings): BusinessCard reads logo_url for the avatar`
- `d7370e7` — `fix(admin): wrap setState-in-effect for lint clean` (Task 7 follow-up)
- `b4739f4` — `fix(admin/subscriptions): move Date.now out of render body` (stray fix from earlier session — see notes)

## Deviations from the plan

- **Task 4 bundled a mock-consumer fix.** The static `PREVIEW_BUSINESS`
  mock in `apps/web/src/components/marketing/business-panel.tsx` needed
  the new `logo_url: null` field for the marketing preview page to
  typecheck. Not called out in the review's Files list; folded into the
  Task 4 pipeline commit and noted in that commit's message.
- **Two extra fix commits** landed on this branch:
  - `d7370e7` — react-hooks/set-state-in-effect on the new logo
    components. The disable-next-line above the useEffect only skips
    the effect declaration, not inline `setState`s in the body. Wrapped
    the resets in named helpers (`releasePickedSrc`,
    `resetTransientState`) so the pattern matches the codebase's
    existing sponsorships-section.tsx precedent.
  - `b4739f4` — `Date.now()` in the subscriptions section render body,
    introduced in this session's earlier commit `5833624` (renewal
    window gate on the subscriptions modal). Not part of the logo work,
    but the lint gate refused to pass until it was fixed and there was
    no way to isolate the logo lint state from the pre-existing issue.
    Committed under its own message so the fix is attributable.

## Verification (final gate)

- `pnpm typecheck` — 10 packages, 10 successful, 0 errors.
- `pnpm lint` — 3 packages, 3 successful, 0 errors (17 pre-existing warnings
  in files unrelated to this change; no new lint issues introduced).
- `pnpm build` — 1 successful, ~45s; static + dynamic pages generated for
  the web app, no errors.
- All commits landed with the lefthook pre-commit gate (`check-migrations`,
  `check-no-server-actions`, `check-contrast`) passing without bypass.
- Migration `packages/db/drizzle/migrations/0038_dusty_celestials.sql`
  applied cleanly to the dev DB via
  `pnpm --filter @aira/db migrate`.

## Follow-ups (for `/mlabs-qa` or manual)

1. **Manual smoke test (blocked on Playwright not being in scope):**
   - Admin uploads a transparent PNG logo → tile refreshes.
   - Web business card renders it at 36×36.
   - Owner-side MyListings card renders it at 48×48.
   - Mobile card (Expo Go on device) renders it at 36×36.
   - Replace flow deletes the old storage object.
   - Delete flow reverts to category / Store icon fallbacks.
2. **First-render UX on subscription Add button:** the new
   useEffect-driven `nowMs` stamp treats the button as unblocked on the
   very first paint (`nowMs = 0`), then reconciles. A flash of an
   enabled Add button is possible before the effect fires. Unlikely to
   be noticed in practice (single-tick), but worth watching in QA. If it
   feels off, an alternative is a `useState(() => Date.now())` lazy init
   — will need an eslint-disable comment, but no flash.
3. **`expo-image` migration** (deferred). Both `BusinessHero` and the
   new `BusinessCard` image branch on mobile use `react-native`'s
   `Image` — long-term, `expo-image` gives native caching + placeholder
   fade. Not blocking; a follow-up TODO worth capturing.
4. **Card avatar bump 36→40** was deferred in the review. Re-evaluate
   once real logos are populated on a handful of listings — if the
   36×36 crop reads too small for detailed marks, bump both surfaces.
5. **Hint copy calibration** ("Square, transparent PNG ≥ 512×512 works
   best") — QA against the admin flow: does the message read as advice
   or as a hard rule? If admins upload square JPEGs and are confused,
   soften to "Square works best. Transparent PNG preserved."

## Recommended next step

`/mlabs-qa` scoped to:
- The new admin logo upload flow (`/admin/businesses/[id]`) — drag,
  crop, save, replace, delete.
- Web card avatar rendering on the directory (`/listings/[category]`) and
  owner page (`/account/listings`).
- Mobile card avatar rendering on Home + Category screens in Expo Go.
- Regression: the admin subscription Add button (verify the renewal-
  window gate still triggers correctly after the useEffect stamp
  rewrite — same behaviour, different code path).

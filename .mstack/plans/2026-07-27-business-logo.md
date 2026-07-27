# Plan: Business Logo Upload

**Date:** 2026-07-27
**Slug:** 2026-07-27-business-logo
**Status:** implemented
**Author:** vb-mlabs (with Claude)

---

## Problem

Business listing cards on both web and mobile show a small 36×36 avatar in the
identity row. Today:

- **Web** jams `businesses.image_url` (a landscape 1200×630 feature/hero
  image) into that 36×36 slot with `object-cover`, producing a hard,
  unflattering crop — a hero photo squeezed into a logo tile. Fallback is
  the category icon (`getCategoryMeta(...).icon`, Lucide).
- **Mobile** never renders the image at all — the branch was deferred as
  "P3 polish" (see the source comment at
  `apps/mobile/features/listings/components/BusinessCard.tsx:80`). Every
  card shows the category icon regardless of whether the business has a
  feature image.

Both surfaces need a proper, brand-owned mark in that slot. A hero photo is
the wrong artifact — logos are identity marks, not editorial photography.
The tile is small (36×36) and shows up dozens of times per screen, so the
mark has to read cleanly at that size.

**Who benefits:** end users get scannable listing rows where each business
has a distinct visual identity; admins get a first-class control for the
one graphic asset businesses most reliably provide; the mobile app finally
renders something more distinctive than a category icon in the sponsored
listings the AIRA team is charging for.

## Scope

**In:**

- New nullable `businesses.logo_url` column with an advisory-locked
  migration.
- Admin upload UX on Manage Listings → business detail: **client-side
  square crop with zoom** (react-easy-crop, WhatsApp-avatar style — 1:1
  aspect, zoom slider, drag-to-pan), followed by a POST of the
  already-cropped square bytes.
- Server pipeline finalises to **512×512 PNG** with transparency
  preserved (sharp `.png()`, no background flatten). Stored under
  `businesses/<id>/logo-<uuid>.png`.
- New route pair: `POST /api/v1/admin/businesses/[id]/logo` (upload +
  replace) and `DELETE /api/v1/admin/businesses/[id]/logo` (clear +
  best-effort storage delete).
- New service functions `setBusinessLogo` / `clearBusinessLogo`, mirrors
  of the existing feature-image pair.
- `BusinessSchema` extended so `logo_url` reaches web + mobile via the
  existing `/api/v1/businesses/*` contract with no additional routes.
- Web BusinessCard avatar: `business.logo_url ?? category icon`. Feature
  image no longer touches the card avatar.
- Mobile BusinessCard avatar: same rule, image branch finally wired using
  React Native's `Image` (same import already used by `BusinessHero`;
  no new mobile dep).
- New `LogoControl` admin component, rendered inside `CoreFieldsPreview`
  **above** `FeatureImageControl` as a 128×128 square preview. This
  visually mirrors WhatsApp / Slack settings (avatar-on-top, banner-below)
  and cements the two-artifact model — a square identity mark for cards
  and a landscape hero for the detail page.

**Out (deferred):**

- No backfill from `image_url`. Existing rows keep `logo_url = NULL` and
  cards fall through to the category icon until an admin uploads a real
  logo — clean rule, no baked-in bad crops.
- No changes to the gallery (`business_image` table) or the detail-page
  hero.
- No public-side edit UI (owners can't self-serve — same as feature
  image today).
- No mobile switch to `expo-image` — match `BusinessHero`'s existing
  `react-native` `Image` usage to keep dep surface flat. `expo-image`
  migration is its own follow-up.
- No dark/light-aware logo variants (some brands ship two). Single asset
  for MVP; revisit if admins complain.
- No focal-point stored on the row — the crop is baked into the file at
  upload time, matching how the feature image already works.

## Approach

**Reuse the shared image pipeline.**
`apps/web/src/features/admin/server/business-image-pipeline.ts` already
exports `processAndStoreFeatureImage` and `processAndStoreBusinessImage`
against the same sharp + storage plumbing. Add a third export,
`processAndStoreBusinessLogo`, that:

1. Validates MIME (`image/jpeg | image/png | image/webp`) and size
   against the existing `ALLOWED_MIME` + `MAX_BYTES` (8 MB) constants.
2. `sharp(bytes).rotate()` — auto-orients from EXIF, matching the
   sibling pipelines.
3. `.resize(512, 512, { fit: "cover", position: "centre" })` — the
   client has already cropped square, but a defensive `cover` resize
   guarantees the output dimensions regardless of what the client sent
   (network hiccup, ancient browser, admin drag-drop bypassing the
   modal). At worst it centre-crops a near-square input by a few pixels.
4. `.png()` output — preserves transparency for logos with alpha
   channels (real logo files, wordmarks with padding, etc.). PNG at
   512×512 comes in around 30–80 KB in practice, well under the
   feature-image envelope.
5. Uploads to `businesses/<businessId>/logo-<uuid>.png` via the shared
   storage driver, then calls `setBusinessLogo(db, id, url)`.

**Client-side crop with `react-easy-crop`.**
Admin clicks the `LogoControl` square, picks a file via the existing
`react-dropzone` machinery (already in the workspace, no new dep for
file picking). A `LogoCropModal` opens: `react-easy-crop` renders the
image inside a 1:1 crop window with a zoom slider (0.5×–3×). The
`onCropComplete` callback receives pixel coordinates; a
`getCroppedImage` helper draws the crop region onto a canvas, calls
`toBlob('image/png')`, and the modal POSTs the resulting bytes to the
new route. This is the same UX pattern as WhatsApp / Slack profile
photo pickers — familiar, no explanation required. `react-easy-crop` is
~11 KB gzipped, MIT, tree-shakeable, zero peer deps beyond React.

**Dedicated upload route.**
`POST /api/v1/admin/businesses/[id]/logo` (multipart, single `file`
field). `DELETE .../logo` clears. Mirrors the feature-image route pair
one-for-one so the mental model + auth wiring stay identical:

- Multipart upload lives outside the JSON PATCH surface (same reason as
  `feature-image`).
- Route handler is the ONLY consumer of `packages/services` — matches
  CLAUDE.md's service-layer rule; no Server Action, no direct import
  from RSC.
- Route handler captures the pre-existing `logo_url` before overwriting,
  then best-effort deletes the old storage object after the DB update
  succeeds. Same pattern the feature-image route uses.

**Card wiring.**

- Web (`apps/web/src/features/listings/components/business-card.tsx:56`):
  swap `business.image_url` → `business.logo_url`. Existing 36×36
  `rounded-xl` container stays. The `object-cover` is safe on
  already-square PNG output. Fallback branch (category icon) unchanged.
- Mobile (`apps/mobile/features/listings/components/BusinessCard.tsx:81`):
  replace the always-render `MaterialCommunityIcons` with the
  conditional `business.logo_url ? <Image .../> : <MaterialCommunityIcons .../>`.
  `Image` import from `react-native` matches `BusinessHero`'s pattern —
  no new mobile dep, no `expo-image` decision blocked in this change.

**Schema propagation.**
`BusinessSchema` (`packages/validators/src/businesses.ts`) grows one
field: `logo_url: z.string().min(1).nullable()`. Storage driver returns
relative `/api/storage/...` paths — `.min(1)` not `.url()`, per
`.claude/memory/storage-driver-relative-urls.md`. The public
`/api/v1/businesses/*` ops surface the field automatically since they
return `BusinessSchema`. No change to `BusinessUpdateInputSchema` — logo
lifecycle goes through its dedicated route like feature image does.

**Alternatives considered:**

- **Server-side smart crop** (sharp's entropy heuristic, no client UI).
  Rejected because logos are identity marks — wordmarks and off-centre
  compositions get chopped unpredictably by entropy scoring. WhatsApp
  gives users the zoom slider for a reason.
- **Client resize only, no crop** (contain into a square with transparent
  padding). Rejected because landscape wordmark inputs render at ~30%
  of the tile with huge margins — even worse than today's hard crop.
- **Repurpose `business_image` with a `role: "logo"` column.** Rejected
  because it muddies the gallery table's contract, needs a role-based
  UI split, and forces a compound-unique index change. A dedicated
  scalar column is the right shape for a one-per-business asset.
- **Extend the feature-image pipeline to output both hero and logo from
  one upload.** Rejected — feature image (landscape editorial) and logo
  (square mark) are semantically different artifacts, and admins can't
  always supply an image that works well cropped both ways. Two upload
  flows are simpler than one dual-output flow.
- **Auto-populate `logo_url` from `image_url` on migration.** Rejected
  in the review (locked with user) — bakes in the exact bad crop we're
  trying to fix. Clean fallback to category icon is the better rule.

## Data model changes

**New column:**

```
ALTER TABLE businesses ADD COLUMN logo_url text;
```

- Nullable. No default. No FK. No index (accessed only in-row alongside
  the rest of the business selection).
- Migration generated via `pnpm db:generate`. **Per CLAUDE.md
  (`replit-db-migration-trap.md` memory):** after generate, ALWAYS run
  `pnpm --filter @aira/db migrate` against the dev DB before commit —
  otherwise Replit Publish will diff and propose a DROP COLUMN.

No new tables, no data migration, no back-fill.

## Files to touch

**New:**

- `apps/web/src/app/api/v1/admin/businesses/[id]/logo/route.ts` — POST
  (upload + replace) + DELETE (clear) handlers. Cloned in shape from
  the `feature-image/route.ts` neighbour.
- `apps/web/src/features/admin/components/logo-control.tsx` — square
  preview + upload button. Opens `LogoCropModal` on file selection.
- `apps/web/src/features/admin/components/logo-crop-modal.tsx` — the
  `react-easy-crop` host, zoom slider, Save/Cancel. Exports a helper
  `cropImageToBlob(imageSrc, croppedAreaPixels): Promise<Blob>` that
  wraps the canvas dance so the tests can hit the helper directly.
- `packages/db/migrations/00XX_business_logo_url.sql` — generated by
  Drizzle from the schema edit.

**Edit:**

- `packages/db/src/schema/businesses.ts` — add `logo_url: text("logo_url")`
  under `image_url`.
- `packages/validators/src/businesses.ts` — add
  `logo_url: z.string().min(1).nullable()` to `BusinessSchema`.
- `packages/services/src/businesses/service.ts` — add
  `setBusinessLogo(db, id, url)` + `clearBusinessLogo(db, id)`. Mirror
  the existing `setBusinessFeatureImage` / `clearBusinessFeatureImage`
  pair exactly.
- `packages/services/src/businesses/index.ts` — export the two new
  service functions.
- `packages/services/src/businesses/queries.ts` — include `logo_url`
  in every business projection (search for `image_url: row.image_url`
  in `toBusiness` and add the sibling line).
- `apps/web/src/features/admin/server/business-image-pipeline.ts` — add
  `processAndStoreBusinessLogo` + a `LOGO_SIZE = 512` constant and the
  helper `businessLogoKeyFromUrl` (mirror of the feature-image variant
  used by the DELETE branch of the route).
- `apps/web/src/features/admin/components/business-detail.tsx` — render
  `<LogoControl>` above `<FeatureImageControl>` inside
  `CoreFieldsPreview` (currently at :818). Layout: LogoControl is
  128×128 square, FeatureImageControl stays 1200×630 landscape
  underneath.
- `apps/web/src/features/listings/components/business-card.tsx:56` —
  swap `business.image_url` → `business.logo_url` in the avatar tile.
- `apps/mobile/features/listings/components/BusinessCard.tsx:81` —
  wire the `logo_url` branch of the 36×36 tile using
  `react-native`'s `Image` (matches `BusinessHero`'s import); keep the
  category-icon fallback path.
- `apps/web/package.json` — add `react-easy-crop` (~11 KB gzipped,
  MIT). No new native or mobile dep.

## Edge cases

- **Replace flow:** admin uploads a second logo while one already exists.
  Route handler resolves the current `logo_url` before overwriting, then
  best-effort deletes the old storage object. Same pattern as
  `feature-image/route.ts`; storage delete errors log-and-continue.
- **Cancel mid-crop:** admin closes the `LogoCropModal` without saving.
  Nothing gets uploaded; existing logo unchanged; the ephemeral object
  URL is `URL.revokeObjectURL`'d in the modal's cleanup effect to avoid
  leaks.
- **Non-square client input:** crop UI forces 1:1 via
  `react-easy-crop`'s `aspect={1}` prop. Server does a defensive
  `fit: "cover"` resize as a belt-and-braces guard.
- **Transparent PNG input:** sharp preserves alpha through `.png()`
  output — the whole reason we picked PNG. No `flatten()` call anywhere
  in the logo pipeline.
- **Huge file:** `MAX_BYTES = 8 MB` (shared constant) — same 400 error
  surface as the sibling pipelines.
- **Corrupt/unsupported bytes:** sharp decode failure → 400
  `images.decode_failed`, same code as siblings.
- **Storage delete failure on clear:** log warning, don't surface; DB
  is already cleared, orphaned object is non-critical (matches gallery
  + feature-image posture).
- **Concurrent admin uploads:** last write wins on a single-column
  update; no locking needed. Loser's storage object survives as a
  short-lived orphan — acceptable given rarity on admin surface.
- **Mobile image fetch failure / offline:** `react-native`'s `Image`
  silently shows blank; the `bg-muted` tile fill from the parent `View`
  is visible, giving a graceful degradation. Category icon is NOT
  swapped in on runtime failure (would require an `onError` state
  branch — deferred; the failure mode is rare and the tile still
  looks intentional).
- **`logo_url` present but hostname/proxy broken:** dev-only concern
  from `/api/storage/...` proxy misconfig. Same failure mode as
  `image_url` today; nothing new to guard against.
- **Race between DB update and storage upload:** DB writes AFTER
  storage succeeds (existing sibling pattern). If the storage upload
  succeeds but the DB write throws, the storage object orphans —
  acceptable, matches feature-image behaviour and is very rare.
- **RSC hydration:** LogoControl runs `router.refresh()` after
  upload/delete, same as `FeatureImageControl`.

## Acceptance criteria

- [ ] `pnpm db:generate` produces a single migration adding
      `logo_url text` to `businesses` and nothing else. `pnpm --filter
      @aira/db migrate` applies cleanly to dev.
- [ ] `BusinessSchema` (validators) round-trips `logo_url` as
      `string | null`.
- [ ] `GET /api/v1/businesses/:id` returns `logo_url` on the response
      body (public read path); `GET /api/v1/admin/businesses/:id`
      returns it in admin path too.
- [ ] Admin sees a new 128×128 square "Logo" control above the
      Feature Image control inside `CoreFieldsPreview` on
      `/admin/businesses/[id]`.
- [ ] Clicking the empty Logo tile (or drag-dropping a file onto it)
      opens `LogoCropModal` with a 1:1 crop window and a working zoom
      slider (react-easy-crop rendered, tested by clicking Save with
      a landscape input and confirming the stored file is square).
- [ ] Save uploads to `POST /api/v1/admin/businesses/[id]/logo`; server
      finalises to 512×512 PNG at `businesses/<id>/logo-<uuid>.png` and
      writes `businesses.logo_url`.
- [ ] Uploading a second logo deletes the previous storage object
      (verified by inspecting object storage or by log line
      `logo replaced, old key deleted`).
- [ ] Clear (Delete) button on `LogoControl` sets `logo_url = NULL`
      and best-effort deletes the storage object; the preview reverts
      to the empty state.
- [ ] Web BusinessCard avatar renders `business.logo_url` (square PNG,
      36×36, `object-cover`) when set, and the Lucide category icon
      when null. Feature image is no longer read by the card.
- [ ] Mobile BusinessCard avatar renders `business.logo_url` via
      `react-native`'s `Image` (36×36) when set, and the
      MaterialCommunityIcons category icon when null. Verified in
      Expo Go on a real device against a business with `logo_url` set.
- [ ] Existing listings without a logo continue to show the category
      icon — no backfill, no visual regression, feature image untouched.
- [ ] Transparent PNG inputs render with transparency preserved (verify
      against a business logo with a transparent background on both
      light and dark surfaces on web + mobile).
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass with no new
      errors on any package.
- [ ] No new `"use server"` directives, no new direct
      `packages/services` imports from RSC / client / action code —
      logo lifecycle only touches services from the new route handler.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- Should `LogoControl` render as an inline modal opener, or as a
  drag-drop dropzone that opens the crop modal on file receipt (same
  pattern as `FeatureImageControl`)? Recommendation: dropzone → modal,
  because admins already have the muscle memory from the sibling
  control.
- 128×128 preview size in admin — big enough to see detail, small
  enough not to dominate the sidebar. Reviewer: confirm or bump to
  96 / 160.
- Should we bump the card avatar from 36×36 to 40×40 (both surfaces)
  now that we have a real asset to fill it? Cheap change that would
  make logos more legible. Recommendation: hold at 36×36 for MVP —
  same-size swap keeps diff minimal and card layouts unchanged.
- Should the LogoControl surface a "Recommended: square, transparent
  PNG at ≥ 512×512" copy hint? Recommendation: yes, one line above the
  dropzone; matches how FeatureImageControl explains its aspect.
- `react-easy-crop` v5 is the current major; confirm license (MIT) and
  bundle size against the review threshold. Recommendation: proceed.
- Should the mobile `Image` swap to `expo-image` in the same PR to get
  native caching + placeholder fade? Recommendation: no — keep the
  scope tight; file a follow-up TODO to migrate both `BusinessHero`
  and `BusinessCard` together.

---
UI-Significant: yes
---

# Review: Business Logo Upload

**Date:** 2026-07-27
**Slug:** 2026-07-27-business-logo
**Plan reviewed:** [2026-07-27-business-logo.md](../plans/2026-07-27-business-logo.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** vb-mlabs (with Claude)

---

## Summary

Plan is ready to implement. Codebase verification against the four claimed
files (`feature-image/route.ts`, `feature-image-section.tsx`, `BusinessSchema`,
`toBusiness`, `CoreFieldsPreview`) confirmed the plan's approach maps
one-for-one onto the existing feature-image pattern with no surprises. Two
scope adjustments during review: (1) the owner-side web card
`MyListingsCard` also swaps to `logo_url` (currently shows a generic Store
Lucide icon) — user confirmed inclusion so all card surfaces stay
consistent; (2) mobile task must wrap logo URL in `resolveMediaUrl`, same
helper `BusinessHero` uses for the feature image — plan didn't spell this
out and it would break on a real device otherwise. Five plan open-questions
resolved with recommendations baked into the tasks below. `react-easy-crop`
is the only new dep (~11 KB gzipped, MIT); approved. Stored logo output
locked at 512×512 PNG. No blockers.

## Findings

### Concerns (raised, decided, recorded)

- **Concern C1 — output schema shape drift.** The plan wrote
  `logo_url: z.string().min(1).nullable()` on `BusinessSchema`, but
  `image_url` above it uses the looser `z.string().nullable()` with an
  in-file comment stating "Output-shape URLs stay `z.string().nullable()` —
  they're what the service returns, already-validated at write time."
  **Decision:** match `image_url`'s house style — `logo_url: z.string().nullable()`.
  The `.min(1)` guard belongs on any future *input* schema (like a
  hypothetical logo-from-JSON path we don't have today). Task 2 encodes
  this correction.

- **Concern C2 — mobile `Image` needs `resolveMediaUrl` wrapping.** The plan
  says "wire mobile's image branch using React Native's `Image`" but
  didn't spell out that `business.logo_url` is a relative
  `/api/storage/...` path from the API. Mobile devices can't resolve that
  directly — `apps/mobile/features/listings/components/BusinessHero.tsx:50`
  wraps `image_url` in `resolveMediaUrl` from `../../../lib/api/client`
  precisely for this reason.
  **Decision:** mobile task (Task 11) explicitly imports and applies
  `resolveMediaUrl`. Web `<img>` stays same-origin, no wrapper needed.

- **Concern C3 — owner-side card left on generic icon.** `MyListingsCard`
  (web, `/account/listings`) uses a generic `Store` Lucide icon in a
  `size-12` primary-tinted tile — not tied to `image_url` today. User's
  intent is "display logo properly on the app" which includes this
  surface.
  **Decision:** include the swap as Task 10. Mobile MyListings uses
  `BusinessCard` under the hood so it inherits Task 11's wiring for free.

- **Concern C4 — POST route existence check.** Plan describes cloning the
  feature-image route shape but didn't explicitly call out that the
  existing route fetches `getBusinessByIdIncludingArchived` before the
  upload runs (route.ts:38) to return a 404 for missing IDs AND to
  capture the pre-existing URL for post-upload cleanup.
  **Decision:** Task 5 mirrors this pattern exactly. Not a new
  requirement — just making the mirror explicit in the acceptance
  criteria.

- **Concern C5 — storage-delete race pattern.** The current feature-image
  route uses a fire-and-forget dynamic `import("@/lib/storage")` then
  `.catch()`-logged (`route.ts:67-75`) to avoid slowing the response on
  storage cleanup. Plan says "mirror" — worth explicitly reproducing the
  dynamic-import pattern rather than switching to a top-level import
  (which would break the "cleanup shouldn't block the happy path"
  invariant).
  **Decision:** Task 5 mirrors the exact fire-and-forget shape,
  including the dynamic import.

- **Concern C6 — new client dep `react-easy-crop`.** Not in the workspace
  today. ~11 KB gzipped, MIT, one peer dep (React ≥ 16.4). Admin-only
  surface (crop modal loads only when admin picks a file), so no
  bundle-size impact on public routes with Next.js code splitting.
  **Decision:** approved. Version pinned in Task 6.

### Suggestions (taken)

- **S1 — resolve plan open-questions with recommendations.** Every "Open
  question" listed in the plan is small enough to lock now rather than
  ping the reviewer twice:
  - LogoControl style: **dropzone → crop modal on file receipt**
    (mirrors `FeatureImageControl`'s dropzone pattern).
  - Preview size: **128×128** — big enough to see the mark, small
    enough not to dominate the sidebar.
  - Copy hint: **yes**, one line above the dropzone —
    "Square, transparent PNG ≥ 512×512 works best."
  - Avatar bump 36→40: **no** — hold at 36×36. Same-size swap keeps
    the diff minimal and card layouts unchanged. Follow-up if reads
    poorly in real use.
  - `expo-image` migration: **no** — keep scope tight; matches
    `BusinessHero`'s `react-native` `Image` pattern. Migration is its
    own follow-up covering both `BusinessHero` and `BusinessCard`.

- **S2 — reuse the route's `storageKeyFromUrl` helper directly.** Plan
  proposed a `businessLogoKeyFromUrl` sibling in the pipeline file, but
  the feature-image route already inlines a generic `storageKeyFromUrl`
  (`route.ts:23`). Task 5 uses the same generic pattern — no
  logo-specific helper needed. Cleaner, one less symbol to export.

### Deferred

- **Skip backfill.** Confirmed decision from planning: `logo_url` stays
  `NULL` for existing rows; cards fall through to the category icon
  until admins upload. No migration data step.

## Decisions locked

Net-new during review (in addition to the six planning-time decisions):

1. `BusinessSchema.logo_url` uses `z.string().nullable()` — not
   `.min(1).nullable()` — to match `image_url`'s output-shape convention.
2. Mobile Task explicitly wraps the URL in `resolveMediaUrl` (matches
   `BusinessHero`'s pattern).
3. `MyListingsCard` (web) also swaps to `logo_url` with the same
   fallback rule (falls through to the `Store` Lucide icon).
4. All five plan-level open questions resolved with the recommendations
   in S1 above; no reviewer follow-up needed on those.
5. Route uses a single generic `storageKeyFromUrl` helper (mirror of the
   existing feature-image route), not a logo-specific sibling.

## Implementation plan

Ordered tasks for `/mlabs-code`. Each task is atomic — one commit's worth
of change. Codebase left in a working state after each.

### Task 1: Add `logo_url` column + migration

- **Files:** `packages/db/src/schema/businesses.ts` (edit) ·
  `packages/db/migrations/00XX_business_logo_url.sql` (new, generated)
- **What:** Add `logo_url: text("logo_url")` to the `businesses` table
  schema, right below `image_url`. Run `pnpm db:generate` — should emit
  a single `ALTER TABLE businesses ADD COLUMN logo_url text;` migration.
  Then run `pnpm --filter @aira/db migrate` against the dev DB (per
  CLAUDE.md's `replit-db-migration-trap.md` memory — otherwise Replit
  Publish diff proposes DROP COLUMN).
- **Acceptance:** Migration file present under `packages/db/migrations/`.
  `pnpm --filter @aira/db typecheck` passes. `psql` or Drizzle Studio
  confirms the column exists on dev DB as `text NULL`.
- **Pause if:** `pnpm db:generate` proposes any change beyond a single
  `ADD COLUMN logo_url` — extra ops (drops, type changes, index rewrites)
  mean the local schema state has drifted and needs an escalation before
  applying.

### Task 2: Extend `BusinessSchema` + service projection

- **Files:** `packages/validators/src/businesses.ts` (edit) ·
  `packages/services/src/businesses/queries.ts` (edit)
- **What:** In the validator, add `logo_url: z.string().nullable()` to
  `BusinessSchema` immediately below `image_url` (line 57). Follow the
  looser house style — no `.min(1)`. In `queries.ts`, add
  `logo_url: row.logo_url,` to the `toBusiness` projection immediately
  below `image_url: row.image_url,` (line 685). `BusinessAdminSchema`
  inherits via `.extend()` so no separate add.
- **Acceptance:** `pnpm typecheck` passes across the whole workspace. A
  local `curl http://localhost:3000/api/v1/businesses/:id` returns
  `logo_url: null` on every row (verify with an existing business).

### Task 3: Service functions `setBusinessLogo` / `clearBusinessLogo`

- **Files:** `packages/services/src/businesses/service.ts` (edit) ·
  `packages/services/src/businesses/index.ts` (edit)
- **What:** Add `setBusinessLogo(db, id, url)` and
  `clearBusinessLogo(db, id)` immediately below the existing
  `setBusinessFeatureImage` + `clearBusinessFeatureImage` pair.
  Structure mirror-copies the sibling: update the row, then re-fetch
  via `getBusinessByIdIncludingArchived`. `clearBusinessLogo` returns
  `{ oldUrl }` so the route handler can delete the storage object.
  Export both from `index.ts` next to the feature-image exports.
- **Acceptance:** `pnpm typecheck` passes. Both functions are callable
  from `@aira/services` imports.

### Task 4: Upload pipeline `processAndStoreBusinessLogo`

- **Files:** `apps/web/src/features/admin/server/business-image-pipeline.ts`
  (edit)
- **What:** Export a new `LOGO_SIZE = 512` constant next to
  `FEATURE_WIDTH`. Add `processAndStoreBusinessLogo({ businessId, bytes,
  contentType }): Promise<{ url: string }>`. Validate MIME against the
  shared `ALLOWED_MIME` and size against `MAX_BYTES`. Pipeline:
  `sharp(bytes).rotate().resize(512, 512, { fit: "cover", position:
  "centre" }).png()`. Upload to
  `businesses/<businessId>/logo-<uuid>.png`. Call `setBusinessLogo`.
  Throw the same `ImagePipelineError` codes as the siblings on
  invalid_mime / too_large / decode_failed.
- **Acceptance:** `pnpm typecheck` passes. Function accepts JPEG, PNG,
  WebP inputs and returns a `/api/storage/businesses/.../logo-*.png` URL.
  Transparent-input PNG output preserves alpha (verify via `sharp(...
  ).metadata()` in a scratch script or manually).

### Task 5: Route handlers `POST` / `DELETE .../logo`

- **Files:** `apps/web/src/app/api/v1/admin/businesses/[id]/logo/route.ts`
  (new)
- **What:** Clone `feature-image/route.ts` structure exactly. POST:
  `requireAdminJSON` → resolve business via
  `getBusinessByIdIncludingArchived` (404 if missing) → capture
  `existing.logo_url` as `oldUrl` → parse multipart `file` field → size
  check → call `processAndStoreBusinessLogo` → fire-and-forget
  `import("@/lib/storage").then(({storage}) => storage.delete(oldKey))`
  with `.catch(logger.warn)`. DELETE: `clearBusinessLogo` → same
  fire-and-forget delete of the returned `oldUrl`. Both use the same
  generic `storageKeyFromUrl` helper inline (matches sibling route).
- **Acceptance:** `curl -F file=@x.png -X POST .../logo` returns 200 with
  the URL. DB row's `logo_url` populated. Second upload triggers old-object
  delete (verified via log line `logo old object delete failed` NOT firing,
  or storage inspection). `curl -X DELETE .../logo` clears DB, logs
  the delete attempt. 404 for a missing business ID. 413 for
  oversize inputs.

### Task 6: Add `react-easy-crop` dep

- **Files:** `apps/web/package.json` (edit) · `pnpm-lock.yaml` (edit)
- **What:** `pnpm --filter @aira/web add react-easy-crop`. Pin to the
  current major (v5). Verify license MIT and no peer-dep warnings against
  the workspace-pinned React version.
- **Acceptance:** Dep appears in `apps/web/package.json`. Lockfile
  updated. `pnpm typecheck` still passes. No peer-dep warnings in the
  install output.
- **Pause if:** `react-easy-crop` peer-deps demand a React major the
  workspace doesn't ship, or the install prints an unresolved-peer warning.

### Task 7: `LogoControl` + `LogoCropModal`

- **Files:** `apps/web/src/features/admin/components/logo-control.tsx`
  (new) · `apps/web/src/features/admin/components/logo-crop-modal.tsx`
  (new)
- **What:** `LogoControl` is a `"use client"` component modelled on
  `FeatureImageControl`. Renders a 128×128 square tile. Empty state:
  react-dropzone dropzone → on file receipt, opens `LogoCropModal`
  (does NOT POST directly). Filled state: shows current logo with
  hover-reveal Replace + Remove buttons (Replace re-opens the modal
  with a fresh file picker). One line of hint copy below:
  "Square, transparent PNG ≥ 512×512 works best." `LogoCropModal` uses
  `@base-ui/react/dialog` (existing modal primitive in the workspace)
  hosting `react-easy-crop` with `aspect={1}`, `zoom` slider 1–3.
  On Save: use react-easy-crop's `croppedAreaPixels` callback → draw
  onto a `<canvas>` → `canvas.toBlob('image/png')` → POST as multipart
  `file` field to `/api/v1/admin/businesses/[id]/logo`. Both
  components own their own state; parent just passes `businessId` and
  `logoUrl`. Router.refresh on success.
- **Acceptance:** Admin opens `/admin/businesses/[id]`. Empty logo tile
  → click / drop → crop modal opens with 1:1 crop window + zoom slider
  → drag to pan → zoom → Save → POST fires → tile shows the new logo
  after refresh. Hover on filled tile → Replace + Remove visible;
  Remove clears the tile; Replace opens the modal again with a fresh
  picker. Cancel mid-crop leaves the existing state unchanged.

### Task 8: Wire `LogoControl` into admin detail

- **Files:** `apps/web/src/features/admin/components/business-detail.tsx`
  (edit)
- **What:** In `CoreFieldsPreview` (line ~813), the left sidebar column
  is currently `<div className="w-full sm:w-56 sm:flex-shrink-0">`
  wrapping just `<FeatureImageControl>`. Add `<LogoControl>` above it
  in a `flex flex-col gap-4` stack so the Logo tile sits over the
  landscape Feature Image. Import from
  `./logo-control`. Pass
  `businessId={business.id}` and `logoUrl={business.logo_url}`.
- **Acceptance:** `/admin/businesses/[id]` shows Logo (128×128) stacked
  over Feature Image (1200×630 aspect card) in the left sidebar.
  Both controls work independently; either can be filled/empty in any
  combination. No layout regression on smaller viewports.

### Task 9: Web `BusinessCard` avatar swap

- **Files:** `apps/web/src/features/listings/components/business-card.tsx`
  (edit)
- **What:** Change the avatar tile branch (line 56) from `business.image_url`
  to `business.logo_url`. Keep the 36×36 tile, `object-cover`, `bg-muted`
  fallback, and the category-icon fallback branch identical. Alt stays
  `""` (decorative — name is right next to it).
- **Acceptance:** Cards render the business logo when set; the Lucide
  category icon when null. Feature image is no longer read by the card.
  Existing rows (all NULL logos post-migration) look identical to
  today's category-icon fallback state.

### Task 10: Web `MyListingsCard` avatar swap

- **Files:** `apps/web/src/features/account/components/my-listings-card.tsx`
  (edit)
- **What:** Replace the always-rendered `Store` Lucide icon (line 30) with
  a conditional: `business.logo_url ? <img src={business.logo_url}
  alt="" className="size-full object-cover"/> : <Store className="size-5"/>`.
  The parent `<span>` at line 26 keeps its `size-12 rounded-lg
  bg-primary/10 text-primary flex items-center justify-center overflow-hidden`
  chrome — the `overflow-hidden` is needed so `object-cover` clips
  cleanly. Add `overflow-hidden` if not already present.
- **Acceptance:** `/account/listings` shows real logos for the owner's
  businesses that have them uploaded; falls through to the `Store` icon
  otherwise. Archived-opacity treatment untouched. No new imports beyond
  the existing `Store` from lucide-react.

### Task 11: Mobile `BusinessCard` image branch

- **Files:** `apps/mobile/features/listings/components/BusinessCard.tsx`
  (edit)
- **What:** Add `Image` to the `react-native` import at line 2 (already
  imports `Pressable`, `Text`, `View`). Add
  `import { resolveMediaUrl } from "../../../lib/api/client";` (matches
  `BusinessHero`'s import path). In the 36×36 avatar tile (line 81–91),
  wrap the `MaterialCommunityIcons` in a conditional: if
  `business.logo_url` is set, render
  `<Image source={{ uri: resolveMediaUrl(business.logo_url) }} style={{
  width: 36, height: 36 }} />`; else render the existing
  `MaterialCommunityIcons` branch unchanged. Keep the wrapper `View`
  with `bg-muted` (so slow-load or failure shows a graceful tinted
  square).
- **Acceptance:** In Expo Go on a real device, cards render the logo
  when `logo_url` is set (verify against a business you upload a
  transparent PNG for via the admin surface); fall through to the
  category icon when null. Sponsored + verified + rating states
  render correctly alongside. Transparent logos read cleanly against
  the `bg-muted` tile.

### Task 12: Typecheck + lint + smoke

- **Files:** none
- **What:** `pnpm typecheck && pnpm lint && pnpm build`. Manual smoke
  on both web and mobile:
  1. Admin uploads a transparent PNG logo → tile updates.
  2. Web card renders the logo at 36×36.
  3. Owner-side MyListings card renders the logo at 48×48.
  4. Mobile card (Expo Go) renders the logo at 36×36.
  5. Delete logo → all three card surfaces revert to the category /
     Store icon fallback.
  6. Replace logo → old storage object gone from Replit Object
     Storage; new one present.
- **Acceptance:** All three commands pass. All six smoke items visually
  verified.

## Open questions

None. All plan-level open-questions were resolved during review with
recommendations locked in the tasks above.

Anything `/mlabs-code` should escalate:

- If `pnpm db:generate` proposes anything beyond a single ADD COLUMN in
  Task 1 (see Task 1's Pause-if).
- If `react-easy-crop` install prints unresolved peer-dep warnings in
  Task 6 (see Task 6's Pause-if).
- If the mobile smoke on Task 11 shows the logo rendered but tinted
  incorrectly on Android (potential PNG transparency handling drift) —
  don't paper over with `backgroundColor: 'transparent'` on the
  `Image`; escalate so we can diagnose the storage `Content-Type`
  headers.

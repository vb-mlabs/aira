# Plan: Business Feature Image

**Date:** 2026-06-15
**Slug:** 2026-06-15-feature-image
**Status:** implemented
**Author:** vb-mlabs (with Claude)

---

## Problem

Business listings currently have two image systems: `image_url` (a single cover/hero field on the `businesses` row, no admin upload UI) and `images[]` (gallery, up to 3, with drag-and-drop upload). When an admin uploads a photo today it lands in the gallery carousel below Card 1, while the top of Card 1 stays stuck on the faded category-icon placeholder. There is no way to set a distinctive hero photo for a business without manually editing the DB. The small circular category-icon avatar that sits next to the business name is a weak visual element once a real photo exists.

**Who benefits:** Admins — they can give each listing a proper cover shot. End users — the listing detail page feels polished and photo-rich rather than placeholder-heavy.

## Scope

**In:**
- Admin upload UI (`FeatureImageSection`) — single drag-and-drop that POSTs to a new dedicated endpoint and sets `businesses.image_url`
- Admin delete button — clears `image_url` and best-effort deletes the stored object
- If `image_url` is already set when a new one is uploaded, the old storage object is deleted before the new one is written
- Public detail page — remove the category-icon avatar circle from the identity row unconditionally (category label text still shows)
- No-image fallback: keep the existing centred category-icon placeholder in the hero area (current behaviour, zero change)
- The feature image renders full-width above the identity panel (existing `img` tag already does this — the layout is already correct once `image_url` is populated)

**Out (deferred):**
- Mobile app parity (Expo screen) — separate plan
- Cropping / focal-point controls in the admin
- Changing gallery images to use a different aspect ratio
- Any change to the Gallery section (remains up to 3, unchanged)
- Dark-mode texture adjustments over the hero

## Approach

**Reuse the existing image pipeline.** `apps/web/src/features/admin/server/business-image-pipeline.ts` already handles Sharp decode → resize → JPEG → object storage upload. We add a second export `processAndStoreFeatureImage` that resizes to **1200×630** (banner aspect ratio, better suited to the wide hero strip than the gallery's 1200×800) and writes back to `businesses.image_url` instead of inserting a `business_images` row.

**Dedicated upload route.** `POST /api/v1/admin/businesses/[id]/feature-image` (multipart `file` field). `DELETE /api/v1/admin/businesses/[id]/feature-image` clears the field. This keeps binary upload concerns out of the JSON PATCH route, matching the existing pattern used for gallery images.

**Service layer.** Two small functions in `packages/services/src/businesses/service.ts`: `setBusinessFeatureImage(db, id, url)` and `clearBusinessFeatureImage(db, id)`. Both return the updated business row. `clearBusinessFeatureImage` also returns the old URL so the route handler can delete the storage object.

**Admin UI.** A new `FeatureImageSection` component modelled on `GallerySection` — a dropzone that shows a preview of the current `image_url` (if set) with a "Remove" button, and a drop target when no image is set. Inserted into `BusinessAdminDetail` immediately above `GallerySection`.

**Public detail page.** Only one line to remove: the `<div aria-hidden className="flex size-16 ...">` avatar circle in `business-detail.tsx`. The hero `<img>` and its placeholder branch are already correct.

**Alternatives considered:**

- *Extend `BusinessUpdateInputSchema` to accept `image_url` as a plain URL string* — rejected because it requires the admin to paste a raw URL; binary upload via dropzone matches the gallery UX and stores in our own object storage.
- *Repurpose `images[0]` as the feature image* — rejected because it conflates two separate concepts (cover vs gallery) and would break the gallery sort_order invariant.

## Data model changes

None. `image_url text` already exists on the `businesses` table (added in the original schema). No migration required.

## Files to touch

**New:**
- `apps/web/src/app/api/v1/admin/businesses/[id]/feature-image/route.ts` — POST (upload) + DELETE (clear) handlers
- `apps/web/src/features/admin/components/feature-image-section.tsx` — admin drag-and-drop UI component

**Edit:**
- `packages/services/src/businesses/service.ts` — add `setBusinessFeatureImage` + `clearBusinessFeatureImage`
- `packages/services/src/businesses/index.ts` — export the two new service functions
- `apps/web/src/features/admin/server/business-image-pipeline.ts` — add `processAndStoreFeatureImage` (1200×630, writes to `image_url`)
- `apps/web/src/features/admin/components/business-detail.tsx` — import + render `<FeatureImageSection>` above `<GallerySection>`
- `apps/web/src/features/listings/components/business-detail.tsx` — remove the avatar circle `<div>` from the identity row

## Edge cases

- **Replace flow**: if `image_url` is already set when a new upload arrives, the route handler calls `clearBusinessFeatureImage` first (gets old URL), deletes old storage object, then runs the pipeline with the new file. Avoids orphaned storage objects.
- **Storage delete failure on remove**: mirror the gallery pattern — log a warning, don't surface to the user. The DB row is already cleared; stale storage objects are non-critical.
- **Pipeline decode failure**: return 400 with `images.decode_failed` — same error surface as gallery uploads.
- **Concurrent upload**: last write wins (no locking needed; `image_url` is a single column, not a join table).
- **Admin reloads**: after upload/delete, call `router.refresh()` to rehydrate the RSC — same as gallery section.

## Acceptance criteria

- [ ] Admin can drag-and-drop (or click to pick) an image in the "Feature image" section; it uploads, and the preview appears in the section immediately after `router.refresh()`
- [ ] Uploading a second feature image automatically deletes the first from object storage and replaces the preview
- [ ] Admin can click "Remove" to clear the feature image; the preview disappears and the hero on the public page reverts to the category-icon placeholder
- [ ] Public listing detail page: hero shows the full-width photo when `image_url` is set; falls back to category-icon placeholder when null (unchanged from current)
- [ ] Category-icon avatar circle is gone from the identity row on all listings (with or without feature image)
- [ ] Category label text (`Health & Wellness` etc.) still appears below the business name
- [ ] Gallery section (Card 2 carousel) is unaffected
- [ ] `pnpm typecheck` and `pnpm lint` pass with no new errors
- [ ] Feature image is stored at 1200×630 JPEG ≤ 8 MB input limit

## Open questions

- Should there be a maximum stored file size for the feature image output (post-resize)? The gallery pipeline doesn't enforce one on output. Likely fine at quality=85 + mozjpeg for 1200×630 (~150–300 KB typical).
- Confirm: is `processAndStoreFeatureImage` in the same pipeline file the right home, or should it be a separate `business-feature-image-pipeline.ts`? Single file is simpler if the logic is nearly identical; separate file is cleaner if they diverge later.

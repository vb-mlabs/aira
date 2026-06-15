# Review: Business Feature Image

**Date:** 2026-06-15
**Slug:** 2026-06-15-feature-image
**Plan reviewed:** [2026-06-15-feature-image.md](../plans/2026-06-15-feature-image.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** Claude (with vb-mlabs)

---

## Summary

Plan is ready to implement. No blockers. Two open questions resolved during review; one ordering concern in the replace flow corrected to be safer. The approach is a clean extension of the existing gallery pipeline pattern — same Sharp chain, same auth boilerplate, same `router.refresh()` pattern — with minimal surface area (6 files, 0 migrations, 0 new deps).

## Findings

### Blockers
None.

### Concerns (raised, decided, recorded)

- **Concern:** The plan's replace flow deletes the old storage object *before* uploading the new one. If the pipeline fails after the delete, the existing feature image is gone and `image_url` still points to a deleted object.
  **Decision:** Reverse the order: (1) upload new file → get new URL, (2) call `setBusinessFeatureImage` to update DB, (3) delete old storage object best-effort. If step 1 or 2 fails, existing image is untouched. If step 3 fails, an orphaned object is logged but the new image is live. Strictly better failure profile.

- **Concern:** After the avatar circle div is removed from `business-detail.tsx`, the outer `<div className="flex items-start gap-4">` wraps a single child, making the flex + gap styling a no-op.
  **Decision:** Remove the outer flex wrapper too, letting the identity content (`<div className="min-w-0 flex-1">`) sit directly in the padded card — `flex-1` and `min-w-0` become meaningless on a single child so strip those too. Net result: `<div>` with name, verified badge, rating, category label, and social icons.

- **Concern:** `clearBusinessFeatureImage` needs to return the old `image_url` for storage cleanup. Drizzle's `.update().returning()` returns new values. A SELECT-then-UPDATE pattern is needed.
  **Decision:** In the service function, first `SELECT image_url FROM businesses WHERE id = $id`, then `UPDATE businesses SET image_url = NULL WHERE id = $id`, return `{ oldUrl: string | null }`. Idempotent when `image_url` is already null (returns `{ oldUrl: null }`, no-op on storage).

- **Concern:** `setBusinessFeatureImage` also needs the old URL if the route handler is to clean up on replace. But since the route handler calls `getBusinessByIdIncludingArchived` as part of the auth/validation flow anyway (to confirm the business exists), the old URL can be read there — no need for the service to return it.
  **Decision:** Route handler reads current business (existing service call), captures `business.image_url` as `oldUrl`, then calls `processAndStoreFeatureImage` (upload + DB set), then deletes `oldUrl` from storage best-effort. `setBusinessFeatureImage` only needs to `UPDATE … SET image_url = $url`.

### Suggestions

- Add a descriptive subtitle to the `FeatureImageSection` header ("1 image · resized to 1200×630 cover JPEG") mirroring the Gallery section's subtitle — consistency in admin UX.

## Decisions locked

1. `processAndStoreFeatureImage` lives in the existing `business-image-pipeline.ts` — same file, new export, no split.
2. Replace flow order: upload → DB write → delete old (not delete old → upload).
3. Outer flex wrapper removed alongside avatar circle in `business-detail.tsx` (listings).
4. `clearBusinessFeatureImage` returns `{ oldUrl: string | null }` via SELECT-then-UPDATE.
5. `FeatureImageSection` reads a `imageUrl: string | null` prop (current value) — same as how `GallerySection` reads `images` from the RSC-fetched business.
6. 1200×630 output dimensions (banner aspect ratio, vs gallery's 1200×800).
7. No output file size cap — typical output is 150–300 KB at quality=85 + mozjpeg.

## Implementation plan

### Task 1: Service — setBusinessFeatureImage + clearBusinessFeatureImage

- **Files:** `packages/services/src/businesses/service.ts` (edit) · `packages/services/src/businesses/index.ts` (edit)
- **What:** Add two functions to `service.ts`. `setBusinessFeatureImage(db, id, url)` does `UPDATE businesses SET image_url = $url, updated_at = now() WHERE id = $id` and returns the updated business row (use `getBusinessByIdIncludingArchived`). `clearBusinessFeatureImage(db, id)` SELECTs the current `image_url`, then does `UPDATE businesses SET image_url = NULL, updated_at = now() WHERE id = $id`, returns `{ oldUrl: string | null }`. Both are idempotent. Export both from `index.ts`.
- **Acceptance:** `pnpm typecheck` passes. Functions are importable from `@aira/services` businesses surface.

### Task 2: Pipeline — processAndStoreFeatureImage

- **Files:** `apps/web/src/features/admin/server/business-image-pipeline.ts` (edit)
- **What:** Add `processAndStoreFeatureImage(args: { businessId, bytes, contentType })` below the existing `processAndStoreBusinessImage`. Reuses `ALLOWED_MIME`, `MAX_BYTES`, `ImagePipelineError`. Resizes with Sharp to `1200×630` (constant `FEATURE_WIDTH = 1200`, `FEATURE_HEIGHT = 630`). Uploads under the same key pattern `businesses/<businessId>/<uuid>.jpg`. Calls `businessesService.setBusinessFeatureImage(db, businessId, url)`. Returns `{ url: string }`.
- **Acceptance:** Function exported and typechecks. Key differences from gallery function are dimensions and the final DB write (set vs insert).

### Task 3: API route — POST + DELETE /feature-image

- **Files:** `apps/web/src/app/api/v1/admin/businesses/[id]/feature-image/route.ts` (new)
- **What:** Copy auth boilerplate from the gallery images route. `POST` handler: (1) parse `file` from formData, (2) validate size against `MAX_BYTES`, (3) call `getBusinessByIdIncludingArchived(db, id)` to confirm business exists and capture `oldUrl = business.image_url`, (4) call `processAndStoreFeatureImage`, (5) best-effort delete `oldUrl` from storage if it differs from the new URL, (6) return `NextResponse.json({ url: newUrl })`. `DELETE` handler: (1) auth check, (2) call `clearBusinessFeatureImage(db, id)` to get `oldUrl`, (3) best-effort delete `oldUrl` from storage, (4) return `NextResponse.json({ ok: true })`. Both handlers set `export const runtime = "nodejs"` and `export const maxDuration = 30`.
- **Acceptance:** `POST /api/v1/admin/businesses/<id>/feature-image` with a valid JPEG returns 200 + `{ url }`. `DELETE` returns `{ ok: true }`. Auth-less requests return 401.

### Task 4: Admin UI — FeatureImageSection component

- **Files:** `apps/web/src/features/admin/components/feature-image-section.tsx` (new)
- **What:** `"use client"` component. Props: `{ businessId: string; imageUrl: string | null }`. State: `uploading: boolean`, `error: string | null`. Uses `react-dropzone` (already a dep). When `imageUrl` is set: render a full-width preview `<img>` with a "Remove" button (calls `DELETE /api/v1/admin/businesses/${businessId}/feature-image`). When `imageUrl` is null: render the dropzone (calls `POST` to same route). After any successful operation: `router.refresh()`. Section header: "Feature image" + subtitle "1 image · resized to 1200×630 cover JPEG". Error display: `<p role="alert" className="text-sm text-destructive">`.
- **Acceptance:** Dropzone accepts JPEG/PNG/WebP, shows spinner during upload, shows preview after, Remove button clears preview, error surfaces for rejected file types or server errors.
- **Pause if:** `react-dropzone` import fails at typecheck (would mean it's not in `apps/web/package.json` — check before assuming it's there).

### Task 5: Wire FeatureImageSection into admin BusinessAdminDetail

- **Files:** `apps/web/src/features/admin/components/business-detail.tsx` (edit)
- **What:** Import `FeatureImageSection`. In `BusinessAdminDetail`, insert `<FeatureImageSection businessId={business.id} imageUrl={business.image_url} />` immediately above `<GallerySection>`.
- **Acceptance:** Admin business detail page renders the new section above Gallery. `pnpm typecheck` passes.

### Task 6: Public detail page — remove avatar circle + simplify wrapper

- **Files:** `apps/web/src/features/listings/components/business-detail.tsx` (edit)
- **What:** In the identity row, remove the `<div aria-hidden className="flex size-16 …"><Icon … /></div>` avatar circle entirely. Replace the surrounding `<div className="flex items-start gap-4">` with a plain `<div>` (no flex/gap), and strip `min-w-0 flex-1` from the inner content div since it no longer needs to flex-grow against a sibling. Also remove the now-unused `Icon` and `category` variable if they are only used for the avatar (confirm — `Icon` may still be used in the hero placeholder branch, so check before removing).
- **Acceptance:** Listing detail page shows no circular avatar next to the business name. Category label text still renders. Hero placeholder (faded category icon) still works when `image_url` is null. `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** `Icon` is used elsewhere in the same component — keep the variable, only remove the avatar div.

## Open questions

None remaining — all resolved during review.

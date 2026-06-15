# Implementation report: Business Feature Image

**Status:** complete
**Date:** 2026-06-15
**Branch:** feat/rest-api-migration

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| 1 | Service — setBusinessFeatureImage + clearBusinessFeatureImage | ✓ done | 94bbebc |
| 2 | Pipeline — processAndStoreFeatureImage (1200×630) | ✓ done | f9175d9 |
| 3 | API route — POST + DELETE /feature-image | ✓ done | dd92fa8 |
| 4 | Admin UI — FeatureImageSection component | ✓ done | cc4f799 |
| 5 | Wire FeatureImageSection into BusinessAdminDetail | ✓ done | f558162 |
| 6 | Public detail — remove avatar circle + simplify wrapper | ✓ done | 59022a8 |

## Commits

- `94bbebc` feat(services): add setBusinessFeatureImage + clearBusinessFeatureImage
- `f9175d9` feat(admin): add processAndStoreFeatureImage to image pipeline (1200×630)
- `dd92fa8` feat(api): POST + DELETE /admin/businesses/[id]/feature-image
- `cc4f799` feat(admin): FeatureImageSection component with upload/remove/replace
- `f558162` feat(admin): wire FeatureImageSection above GallerySection in BusinessAdminDetail
- `59022a8` feat(listings): remove category-icon avatar circle from listing detail card

## Notes

- `updated_at` uses Drizzle `$onUpdate` — no need to set it manually in the service functions
- Replace flow: upload-first (new URL stored), then delete old object best-effort via dynamic import
- `Icon` kept in business-detail.tsx — still used by the hero placeholder when image_url is null
- The FeatureImageSection shows both a preview with hover-Remove button AND a drop-to-replace zone when an image is set

## Recommended next step

Run `/mlabs-qa` focused on the admin feature image upload flow and the public listing detail page hero.

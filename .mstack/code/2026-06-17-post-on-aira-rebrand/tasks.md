# Implementation: Post on AIRA — broaden Community Board

**Started:** 2026-06-17
**Review:** [2026-06-17-post-on-aira-rebrand](../../reviews/2026-06-17-post-on-aira-rebrand.md)
**Branch:** feat/post-on-aira
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 0:** Repair 0026/0027 snapshot chain collision (added during run)
  - Files: `packages/db/drizzle/migrations/meta/0026_snapshot.json` · `packages/db/drizzle/migrations/meta/0027_snapshot.json`
  - Commit: `6c8c6c4`
  - Notes: Pre-existing chain damage (0025/0026 shared an id). Pure metadata repair.

- [x] **Task 1:** DB schema + migration for community_post phone/email
  - Files: `packages/db/src/schema/community-post.ts` · `packages/db/drizzle/migrations/0028_gray_sasquatch.sql` · `meta/0028_snapshot.json` · `_journal.json`
  - Commit: `7aaa6bb`

- [x] **Task 2:** Validators — add phone/email to community schemas
  - Files: `packages/validators/src/community.ts`
  - Commit: `47feeee`

- [x] **Task 3:** Service — thread phone/email through createPost; rename request → post
  - Files: `packages/services/src/community/service.ts`
  - Commit: `1492ebe`

- [x] **Task 4:** Audit meta + editPost phone/email editing + audit coverage
  - Files: `packages/validators/src/audit-meta.ts` · `packages/services/src/community/service.ts` · `apps/web/src/server/operations/community.ts`
  - Commit: `f91e761`

- [x] **Task 5:** Public post-form rebrand + contact fields
  - Files: `apps/web/src/features/community/components/post-form.tsx`
  - Commit: `5370192`

- [x] **Task 6:** Public post-card + post-detail-modal contact affordances
  - Files: `post-card.tsx` · `post-detail-modal.tsx`
  - Commit: `9999c82`

- [x] **Task 7:** Public board page + standalone detail page copy
  - Files: `community/page.tsx` · `community/[id]/page.tsx` · `post-list.tsx`
  - Commit: `a9abb3a`

- [x] **Task 8:** InterestButton + notification-item interested rename
  - Files: `interest-button.tsx` · `notification-item.tsx`
  - Commit: `33b6fad`

- [x] **Task 9:** Admin community surfaces edit + detail + table
  - Files: `admin/community/edit-post-modal.tsx` · `admin/community/post-detail-modal.tsx` · `admin/community/community-table.tsx`
  - Commit: `4d931aa`

- [x] **Task 10:** Verification pass + brand-string-literal fix + comment sweep
  - Files: `post-form.tsx` · `post-list.tsx` · `post-card.tsx` · `post-detail-modal.tsx` (community) · `api/v1/community/posts/[id]/interests/route.ts`
  - Commit: `e0e1be0`

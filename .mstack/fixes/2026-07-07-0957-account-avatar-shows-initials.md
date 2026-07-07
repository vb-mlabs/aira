# Fix — Account page (and other surfaces) shows initials instead of profile image

**Started:** 2026-07-07 09:57
**Source:** user-report
**Status:** escalated
**Commit:** — (no code edits)

## Symptom / repro
User reports: on `/account`, the profile image appears in the AvatarUploader
in `/profile` (Edit profile), yet the header on `/account` (and other
places) keeps showing a name initial in a coloured circle instead of the
uploaded image. Reproducible by uploading an avatar on `/profile`, then
visiting `/account`.

## Survey of every avatar surface in the web app

Two shapes exist in the codebase — one is correct, one is the bug:

### Correct pattern (image → fallback to initials)
1. `apps/web/src/features/avatar/components/avatar-uploader.tsx:99-123` —
   `<Preview>` local component: `if (url) <img/> else initials(name)`. This
   is the reference implementation.
2. `apps/web/src/features/messages/components/conversation-row.tsx:56-77` —
   duplicates the same `Avatar` + `initials` helpers inline; consumes
   `item.other_user.image`.

### Bug pattern (initials-only, never renders image)
3. **`apps/web/src/app/(app)/account/page.tsx:60,65-70`** — user's own
   Account header. Only computes `user.name.charAt(0)`; `user.image` is not
   even read. **This is the primary user-reported bug.**
4. `apps/web/src/app/(app)/_components/top-utility-bar.tsx:11-32` —
   desktop utility bar avatar link. Props type is `{ name, email }` — no
   `image` in the contract.
5. `apps/web/src/app/admin/_components/admin-top-bar.tsx:7-30` — admin top
   bar; same as (4).
6. `apps/web/src/features/community/components/post-card.tsx:61-66,152-158` —
   post-card avatar circle. Consumes `post.author_name`. `PostRow` doesn't
   carry `author_image`; the `packages/services/src/community/service.ts`
   SELECT never joins to `user.image`. Requires a service/validator change,
   not just a component change.
7. `apps/web/src/features/community/components/post-detail-modal.tsx:45-50` —
   same shape as (6).
8. `apps/web/src/features/admin/components/business-owner-section.tsx:71-76` —
   admin business-owner picker.
9. `apps/web/src/features/admin/community/community-table.tsx` &
   `apps/web/src/features/admin/community/post-detail-modal.tsx` — admin
   community list, initials-only from `author_name`.

### Also worth noting
- Three near-identical `initials()` / `initialsOf()` local helpers
  (`avatar-uploader.tsx`, `conversation-row.tsx`, `post-card.tsx`,
  `post-detail-modal.tsx`) — no shared `<Avatar>` primitive in `packages/ui-web/`.

## Root cause
Two different bugs:
- **Narrow (account page):** the `/account` header renderer was never
  wired to `user.image`. Purely a component-level omission. `user.image`
  is on the DB user row, exposed by `requireUser()`, and consumed
  correctly by `AccountSection` → `AvatarUploader` on `/profile` — but
  the `/account` header just skipped it.
- **Wider (top bars, community posts, admin):** the whole app treats
  avatars as name-initials by convention. Fixing this consistently
  requires (a) plumbing `image` into `TopUtilityBar` / `AdminTopBar` prop
  contracts, (b) widening the community-service SELECT to expose
  `author_image` on `PostRow`, (c) ideally extracting a single
  `<Avatar>` primitive into `packages/ui-web/` so the four inline
  copies converge.

## Scope-gate check

| Trigger | Narrow fix | Wider consolidation |
|---|---|---|
| >3 source files | 1 file — pass | 8+ files — **triggers** |
| Schema/migration | none | none (service SELECT widen, not a migration) |
| New dep | none | none |
| Brand/token layer | none | none |
| Cause evident | yes | yes |

The narrow fix fits the quick lane cleanly. The wider consolidation is a
change, not a fix — routes to `/mstack-plan`.

## Escalation
**Trigger:** Fix needs >3 source files (user chose full consolidation over
the narrow account-page fix).
**Route:** `/mstack-plan`
**Handed over:**
- Nine avatar surfaces (mapped above) — two correct, seven initials-only.
- The `/account` page (`apps/web/src/app/(app)/account/page.tsx:60,65-70`)
  is the user-visible regression that triggered this — should be the plan's
  acceptance criterion for "avatar rendering fixed."
- No shared `<Avatar>` primitive exists; four inline `initials()`
  helpers are duplicated (`avatar-uploader.tsx`, `conversation-row.tsx`,
  `post-card.tsx`, `post-detail-modal.tsx`). Suggested target:
  `packages/ui-web/src/avatar.tsx`.
- Community post authors carry `author_name` only. Widening to include
  `author_image` requires:
  - `packages/services/src/community/service.ts:96` — extend the
    `sql<string>` COALESCE block / add `author_image: user.image` to the
    SELECT.
  - `packages/validators/src/community.ts:35,56` — add
    `author_image: z.string().nullable()`.
  - Ripples into the admin community table + modal, both of which
    consume the same `PostRow` shape.
- `TopUtilityBar` and `AdminTopBar` prop contracts currently take only
  `{ name, email }` — will need `image` threaded from
  `apps/web/src/app/(app)/layout.tsx` and `apps/web/src/app/admin/layout.tsx`.
- Brand rule: no brand string literal changes required; this is purely
  presentational + data-shape.

## Evidence
- No code changes were made in this run — nothing to verify.

## Follow-ups
- User requested the full consolidation via `/mstack-plan` (2026-07-07).

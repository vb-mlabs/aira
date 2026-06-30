# Implementation: G1 Business Owner Reachability

**Started:** 2026-06-17
**Review:** [2026-06-17-business-owner-reachability](../../reviews/2026-06-17-business-owner-reachability.md)
**Branch:** feat/business-owner-reachability
**Status:** complete

---

## Legend
- `[ ]` pending  ·  `[~]` in_progress  ·  `[x]` done
- `[!]` paused (awaiting decision)  ·  `[-]` skipped

## Tasks

- [x] **Task 1:** Schema migration — add `owner_user_id` to `businesses`
  - Commit: `c047c0e`
  - Notes: Generated `0030_salty_ronan.sql` — exactly ADD COLUMN + FK + partial index, no surprises.

- [x] **Task 2:** Add three new audit kinds + render branches
  - Commit: `c0f8784`
  - Notes: Reassign audit includes `prev_owner_user_id` so renders show "Reassigned … (replaced previous owner)".

- [x] **Task 3:** Add `business_broadcast` notification kind + all renderers
  - Commit: `3b8b76a`
  - Notes: Mobile branch updated to keep `@aira/mobile` typecheck green. Brand interpolation done via `brand.name` from `@aira/config` in both renderers.

- [x] **Task 4:** Validator schemas for owner + broadcast inputs
  - Commit: `fdfab6c`
  - Notes: `owner_user_id` added to BusinessSchema; deliberately NOT in `BusinessUpdateInputSchema`. Folded the toBusiness mapper update + marketing preview mock fix into this commit so typecheck stayed green.

- [x] **Task 5:** Owner-related read queries
  - Commit: `9ce2d1c`
  - Notes: getBusinessOwner / getBusinessesOwnedBy / getBusinessOwnerLookup — all INNER JOINs so deleted users yield null/empty naturally.

- [x] **Task 6:** Services — `assignBusinessOwner` + `unassignBusinessOwner`
  - Commit: `10d9317`
  - Notes: Service receives pre-composed notification copy from op layer so `@aira/services` stays config-free. Unassign is idempotent on null FK.

- [x] **Task 7:** Service — `sendBusinessOwnerBroadcast`
  - Commit: `e70ad6d`
  - Notes: Audit row written even on empty fan-out (recipient_count: 0). DISTINCT on user.id so multi-business owners get one row.

- [x] **Task 8:** Admin operations — owner assign/unassign + updated detail/list
  - Commit: `e4ed766`
  - Notes: getBusinessByIdAdminOp output now `{ business, owner }`; listAllBusinessesAdminOp items extend with `owner`. Email-on-link wired here, best-effort post-commit.

- [x] **Task 9:** Admin operation — broadcast
  - Commit: `547b060`
  - Notes: `permission: "admin"` — recipient-count confirm step is the guardrail.

- [x] **Task 10:** Account operation — `listMyBusinessesOp`
  - Commit: `e74b27e`
  - Notes: Lives in `operations/businesses.ts` next to existing public ops.

- [x] **Task 11:** Route handlers (3 new endpoints)
  - Commit: `d68d187`
  - Notes: Switched assign from PUT to POST to match the rest of `/api/v1/admin/*` and the apiClient surface (no `put` method on the client).

- [x] **Task 12:** Admin UI — owner section + picker
  - Commit: `f5f5dd9`
  - Notes: BusinessOwnerSection mounts above CoreFieldsSection. Picker reuses `listUsersOp` with 300ms debounce + 2-char minimum. Banned users surfaced with a label.

- [x] **Task 13:** Admin UI — list page Owner column + filter + Broadcast modal
  - Commit: `f9a0ee1`
  - Notes: Owner column + `?owner=has|none` filter (in-memory post-query) + BusinessBroadcastButton + compose-then-confirm modal showing recipient count after send.

- [x] **Task 14:** Account UI — `/account/listings` + menu link
  - Commit: `43eb6c9`
  - Notes: New RSC; archived rows shown with badge but no link (public detail 404s on archived). Admin README updated.

- [x] **Post-T14:** Picker lint fix
  - Commit: `b133768`
  - Notes: react-hooks/set-state-in-effect was flagging the resets on the "query too short" path. Moved into the input handler.

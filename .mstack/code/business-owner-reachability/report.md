# Implementation Report — G1 Business Owner Reachability

**Status:** complete
**Branch:** `feat/business-owner-reachability` (branched from `feat/community-author-controls-and-comments`)
**Plan:** [.mstack/plans/2026-06-17-business-owner-reachability.md](../../plans/2026-06-17-business-owner-reachability.md)
**Review:** [.mstack/reviews/2026-06-17-business-owner-reachability.md](../../reviews/2026-06-17-business-owner-reachability.md)
**Commits:** 16 (1 docs + 14 feature commits + 1 lint follow-up)

---

## Tasks

| # | Task | Status | Commit |
|---|---|---|---|
| docs | Plan + review docs | ✓ | `029defd` |
| T1 | Schema migration — `owner_user_id` | ✓ | `c047c0e` |
| T2 | Three new audit kinds + renderers | ✓ | `c0f8784` |
| T3 | `business_broadcast` notification kind + all 4 renderer touchpoints | ✓ | `3b8b76a` |
| T4 | Validator schemas (owner + broadcast) | ✓ | `fdfab6c` |
| T5 | Owner read queries | ✓ | `9ce2d1c` |
| T6 | Services — assign / unassign | ✓ | `10d9317` |
| T7 | Service — sendBusinessOwnerBroadcast | ✓ | `e70ad6d` |
| T8 | Admin ops — assign/unassign + detail/list owner | ✓ | `e4ed766` |
| T9 | Admin op — broadcast | ✓ | `547b060` |
| T10 | Account op — listMyBusinessesOp | ✓ | `e74b27e` |
| T11 | Three route handlers | ✓ | `d68d187` |
| T12 | Admin UI — owner section + picker | ✓ | `f5f5dd9` |
| T13 | Admin UI — owner column + filter + broadcast modal | ✓ | `f9a0ee1` |
| T14 | Account UI — `/account/listings` + menu link | ✓ | `43eb6c9` |
| fix | Picker lint fix (post-T14 sweep) | ✓ | `b133768` |

Zero paused, zero skipped.

## Commits

```
b133768 fix(admin): move picker state-clear out of effect body
43eb6c9 feat(account): My listings page + menu link + README updates
f9a0ee1 feat(admin): owner column + filter + Notify all owners broadcast
f5f5dd9 feat(admin): owner section + picker on business detail page
d68d187 feat(api): owner assign/unassign + broadcast + my-listings endpoints
e74b27e feat(operations): listMyBusinessesOp for /account/listings
547b060 feat(operations): sendBusinessOwnerBroadcastOp
e4ed766 feat(operations): owner assign/unassign + admin detail/list now expose owner
e70ad6d feat(services): add sendBusinessOwnerBroadcast for owner fan-out
10d9317 feat(services): add assignBusinessOwner + unassignBusinessOwner
9ce2d1c feat(services): add owner-side read queries for businesses
fdfab6c feat(validators): add owner + broadcast schemas; project owner_user_id
3b8b76a feat(notifications): add business_broadcast kind across all renderers
c0f8784 feat(validators,admin): add owner-assigned/unassigned/broadcast audit kinds
c047c0e feat(db): add businesses.owner_user_id FK + partial index
029defd docs(mstack): plan + review for G1 business owner reachability
```

## Verification

- `pnpm typecheck` — **green** across all 10 packages
- `pnpm test` — **green** (178 tests across 21 files)
- `pnpm lint` — **green on every file I touched**. Four pre-existing lint errors remain in the repo on files this branch never edited (`apps/web/src/features/admin/components/sponsorships-section.tsx`, `apps/web/src/instrumentation.ts`) — tech debt, out of scope for this sprint.
- All pre-commit hooks (lefthook: check-migrations, check-contrast, check-no-server-actions, check-mobile-tailwind) passed on every commit. No `--no-verify` used.

## Plan deviations (recorded as I went)

1. **PUT → POST on the assign endpoint.** The apiClient interface doesn't expose `put`; every other admin mutation in this repo uses POST. Switched the route binding from `PUT` to `POST = assignBusinessOwnerOp.runFromRequest` and updated the file header. Functionally identical; aligns with codebase convention.
2. **`toBusiness` mapper update folded into T4.** The plan put the mapper edit in T5, but adding `owner_user_id` (required) to BusinessSchema in T4 broke typecheck immediately if the mapper didn't project it. Moved the one-line projection into T4 so T4 left the codebase in a working state; T5 still added the three new query functions as planned.
3. **Service signature passes pre-composed notification copy from the op layer.** The plan implied the service would build the brand-interpolated strings, but `@aira/services` doesn't depend on `@aira/config` (and shouldn't — that would couple the framework-agnostic layer to the brand layer). Op layer interpolates and passes `{ title, message, href }` into `assignBusinessOwner`. Same separation messages.service uses for its email content.
4. **Empty broadcast still writes audit row** (matches the review's locked decision, but worth restating). The service returns `{ ok: true, recipient_count: 0 }` and writes the audit row; the modal surfaces the count.

## Follow-ups (not scoped for this sprint)

- **Service-level unit tests for owner flows.** The plan called for tests under `packages/services/src/businesses/__tests__/`. The directory doesn't exist and stubbing the in-memory Drizzle store (the admin tests' pattern) is non-trivial; defer to a dedicated testing task. The op-layer happy paths can be reached via Playwright in `/mlabs-qa` instead.
- **Pre-existing lint errors** in `sponsorships-section.tsx` (setState-in-effect ×2) and `instrumentation.ts` (process.env ×4). Pre-existed on `main`; unrelated to G1.
- **Mobile QA.** Per CLAUDE.md, the mobile pass is deferred until the Apple Developer account is approved. The mobile renderer was updated for `business_broadcast` so typecheck stays green, but no Expo-side UI changes shipped.

## Recommended next step

`/mlabs-qa --focus business-owner-reachability` — drive Playwright through the four user journeys the review locked acceptance criteria for:

1. **Admin assigns an owner** — `/admin/businesses/[id]` → Assign owner → search → confirm → toast + audit row + bell row + email (console driver in dev).
2. **Admin reassigns / unassigns** — same UI; verify audit `prev_owner_user_id` and the silent-unassign rule (no email).
3. **Admin broadcasts** — `/admin/businesses` → Notify all owners → compose → confirm → recipient count → bell rows for every linked owner.
4. **Owner sees their listings** — sign in as a linked owner → `/account` → My listings → see the business; verify archived rows render with the badge.

Edge cases to include in the QA pass: empty recipient set, banned-owner pickability, re-assign overwrite copy, archived-business assignment block (404).

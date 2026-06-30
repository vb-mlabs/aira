# Review: Favorite a listing

**Date:** 2026-06-22
**Slug:** 2026-06-22-listing-favorites
**Plan reviewed:** [2026-06-22-listing-favorites.md](../plans/2026-06-22-listing-favorites.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk

---

## Summary

Plan is approved with all six open questions resolved. The approach
holds up against the codebase — the existing
`community/posts/[id]/interests` route already uses clean HTTP verbs
(`GET/POST/DELETE`) and confirms the plan's
`DELETE /api/v1/favorites/<businessId>` shape is on-pattern. One
deliberate **divergence** from the post_interest precedent locked
during review: favorites are **fully idempotent** (silent on
duplicate add and remove) whereas community post_interest throws
on duplicate add — different semantic, justified below. Eleven
atomic tasks. UI-Significant **yes** (new `page.tsx` route + ≥3
UI files), so `/mlabs-mockup` is an optional gate before
`/mlabs-code` if you want to explore the heart placement visually
first.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Idempotency direction. `post_interest` (the precedent
  cited in the plan) throws `community.already_interested` on
  duplicate add. The plan recommended fully-idempotent
  add/remove for favorites instead.

  **Decision:** **Both idempotent.** Re-favoriting an already-favorited
  listing is a successful no-op (200, no row written, body
  `{ ok: true }`). Unfavoriting a non-favorited listing same. The
  `(business_id, user_id)` unique index makes this a one-line
  `ON CONFLICT DO NOTHING` on insert and a normal `WHERE ... AND ...`
  on delete. Rationale: favorites are personal preferences with no
  second party — a rapid-fire double click should never surface an
  error. post_interest is a different domain (social signal where
  duplicates matter) and the divergence is by design.

- **Concern:** Error surface when the mutation fails (network drop,
  401, 5xx).

  **Decision:** **Silent revert + small inline error indicator.**
  Heart flips back to the previous state and a small visual cue
  (red dot or tooltip) signals failure without summoning a toast
  system that isn't otherwise wired into the public app. No global
  toast, no notification-bell entry. The heart's local `error`
  state clears on the next successful click.

- **Concern:** Audit logging. `post_interest` writes to `audit_log`
  (kind `post_interest`); should favorites mirror that?

  **Decision:** **No audit log for v1.** Rationale: favorites have no
  second party who needs the audit trail (unlike post_interest,
  where the post author can dispute what showed up in their inbox).
  Keeps `audit_log` small. Avoids registering two new `AuditMeta`
  kinds for write actions that have zero compliance / safety value.
  Future-proof: if we ever need it, adding the kinds and a hook in
  the service is a small follow-up plan.

- **Concern:** Self-favorite. A business owner browsing their own
  listing — should they see the heart? `post_interest` blocks
  self-interest (`community.self_interest`).

  **Decision:** **Show heart, allow self-favorite.** Differs from
  post_interest but the mental model is different — the owner
  showing self-interest on their own community post is socially
  weird, but the owner saving their own listing is a "useful
  pointer to a thing I manage." No server-side filter, no per-card
  check, no surprising error. Simplest. If a product complaint
  ever surfaces, swap behaviour in one place (the service).

- **Concern:** The plan's two-op split (`listMyFavoritesOp` for the
  My favorites page + `listMyFavoriteIdsOp` for card decoration on
  listings) is more surface than strictly needed. A single op
  returning a slim `{ ids, items }` shape would cover both.

  **Decision:** **Keep the split.** Reasons: (a) `/account/favorites`
  needs full `BusinessSchema[]` (image, rating, tier, social
  links) which is wasteful for cards that already have those
  values inline. (b) The listings pages call the ids op cheaply
  per render; the My favorites page calls the full op once. (c)
  Two ops with single responsibility are easier to cache + test
  than one polymorphic op. Suggestion logged but not taken.

- **Concern:** REST verb on DELETE. Plan flagged this as Q2.

  **Decision:** **`DELETE /api/v1/favorites/<businessId>`** is the
  verified-clean shape. The codebase already uses `DELETE` for
  `community/posts/[id]/interests`, `avatar`, `profile`, admin
  subscription/sponsorship cancel, image deletions, etc. Verb
  alignment is consistent in this codebase, not the
  POST-everything pattern.

### Suggestions (taken or deferred)

- **Suggestion (taken):** Use `ON CONFLICT DO NOTHING` on the
  `INSERT` in `addFavorite` rather than a `SELECT ... THEN INSERT`
  pattern. Drizzle supports this; matches the idempotency decision
  above; avoids the race between the existence check and the
  insert.
- **Suggestion (taken):** Render the empty state on
  `/account/favorites` with the same `EmptyState` component used on
  `/account/listings` and `/account/posts` for visual consistency.
  Plan already mentions this; explicit reminder.
- **Suggestion (deferred):** Add `is_favorited` directly to
  `BusinessSchema` as an optional caller-specific field. Rejected
  in the plan; reviewer agrees the public listings ops should stay
  caller-agnostic so the RSC + CDN cache path stays clean.
- **Suggestion (deferred):** A favorite-count badge on listings
  (social-proof signal). Plan-level out of scope; reviewer
  confirms.
- **Suggestion (deferred):** Notifications to business owners when
  favorited. Out of scope; would require a debouncing strategy and
  owner-side opt-out anyway.

## Decisions locked

1. **Idempotency:** both mutations are silent no-ops on duplicates.
2. **Error UX:** silent revert + small inline indicator on the
   heart; no toast, no bell.
3. **Audit:** no `audit_log` entries for favorite/unfavorite in v1.
4. **Self-favorite:** allowed; no server-side filter.
5. **Op shape:** two ops (`listMyFavoritesOp` full, `listMyFavoriteIdsOp` slim).
6. **DELETE verb:** `DELETE /api/v1/favorites/<businessId>`.
7. **Sort order on /account/favorites:** most-recent-first.
8. **Archived favorites:** stay in the list with an "Archived"
   badge until the F14 hard-purge cron sweeps them.
9. **Page-level wiring:** all RSC pages that render `BusinessCard`
   must fetch `listMyFavoriteIdsOp` in parallel with their listings
   fetch when the caller is signed-in; skip when anonymous.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Eleven
atomic commits. Order leaves the codebase in a working state
between tasks where possible — the components added in Tasks 6–8
default to `isSignedIn={false}` so the heart simply doesn't render
until Task 11 wires the per-page fetch.

### Task 1: DB schema + migration

- **Files:**
  - `packages/db/src/schema/business-favorite.ts` (new)
  - `packages/db/src/schema/index.ts` (edit — re-export)
  - `packages/db/drizzle/migrations/00XX_<auto>.sql` (new — generated)
- **What:** Add the `business_favorite` table per the plan
  (`id`, `business_id`, `user_id`, `created_at`, unique index on
  `(business_id, user_id)`, secondary index on
  `(user_id, created_at)`, cascade on both FKs). Generate the
  migration with `pnpm --filter @aira/db generate`. Apply with
  `pnpm --filter @aira/db migrate`.
- **Acceptance:**
  - Generated migration is purely additive (single
    `CREATE TABLE ... business_favorite` + two `CREATE ... INDEX`
    statements).
  - `pnpm --filter @aira/db migrate` applies cleanly on the live
    DB.
  - `pnpm typecheck` passes (no consumer uses the table yet so
    this is type-only verification).
- **Pause if:** the generated migration contains anything beyond
  the additive `CREATE TABLE` + indexes (e.g. column-rename
  detection, drift on another table).

### Task 2: Validators

- **Files:**
  - `packages/validators/src/favorites.ts` (new)
  - `packages/validators/src/index.ts` (edit — re-export)
- **What:** Define
  - `BusinessFavoriteSchema` (the join row shape).
  - `AddFavoriteInputSchema` (`{ business_id: string }`, strict).
  - `RemoveFavoriteInputSchema` (`{ business_id: string }`,
    strict — `businessId` from the path param gets merged in).
  - `FavoriteMutationOutputSchema` (`{ ok: true }`).
  - `ListMyFavoritesOutputSchema` (`{ items: BusinessSchema[] }`
    — full hydrated Business rows).
  - `ListMyFavoriteIdsOutputSchema` (`{ ids: string[] }`).
  - Inferred TS types.
- **Acceptance:**
  - `pnpm --filter @aira/validators typecheck` passes.
  - Importing from `@aira/validators` resolves both schemas and
    types in a downstream consumer (verify by import probe in
    `packages/services` or `apps/web`).

### Task 3: Services

- **Files:**
  - `packages/services/src/favorites/queries.ts` (new)
  - `packages/services/src/favorites/index.ts` (new)
  - `packages/services/src/index.ts` (edit — re-export)
- **What:** Pure DB functions, no auth:
  - `addFavorite(db, userId, businessId): Promise<void>` — insert
    with `ON CONFLICT DO NOTHING`.
  - `removeFavorite(db, userId, businessId): Promise<void>` —
    `WHERE user_id = ? AND business_id = ?`. No-op on missing
    row.
  - `listMyFavorites(db, userId): Promise<Business[]>` — join
    `business_favorite` → `businesses` filtered to
    `userId`, ordered `business_favorite.created_at DESC`.
    Reuses the existing `toBusiness` / `attachRelations` from
    `packages/services/src/businesses/queries.ts` (export them
    if not already public; otherwise re-implement the slim
    mapper). Public business shape (NOT BusinessAdmin) — even
    though admins might see this surface someday, the favorite
    list is "user's own" not "admin's view". No `contact_person`
    leak.
  - `listMyFavoriteIds(db, userId): Promise<string[]>` — select
    only `business_id`, no join.
- **Acceptance:**
  - `pnpm --filter @aira/services typecheck` passes.
  - `addFavorite` called twice in succession with the same args
    leaves exactly one row in the table.
  - `removeFavorite` called on a non-existent (user, business)
    pair returns successfully without error.
  - `listMyFavorites` returns rows ordered by `created_at DESC`.
- **Pause if:** the existing `toBusiness` mapper isn't exported
  from `packages/services/src/businesses/queries.ts`. The fix is
  to add an export; pause first to confirm we want the public
  mapper exported rather than duplicated.

### Task 4: API ops

- **Files:**
  - `apps/web/src/server/operations/favorites.ts` (new)
- **What:** Four ops via `defineOperation`:
  - `addFavoriteOp` — `permission: "user"`, input
    `AddFavoriteInputSchema`, output
    `FavoriteMutationOutputSchema`, handler calls
    `favoritesService.addFavorite(db, ctx.userId,
    input.business_id)`.
  - `removeFavoriteOp` — `permission: "user"`, input
    `RemoveFavoriteInputSchema`, output
    `FavoriteMutationOutputSchema`. The `businessId` path
    param flows in via `defineOperation`'s path-merge.
  - `listMyFavoritesOp` — `permission: "user"`, input
    `z.object({})`, output `ListMyFavoritesOutputSchema`.
  - `listMyFavoriteIdsOp` — `permission: "user"`, input
    `z.object({})`, output `ListMyFavoriteIdsOutputSchema`.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - The four ops can be imported elsewhere without compile errors.

### Task 5: API route handlers

- **Files:**
  - `apps/web/src/app/api/v1/favorites/route.ts` (new) — `POST` →
    `addFavoriteOp.runFromRequest`.
  - `apps/web/src/app/api/v1/favorites/[businessId]/route.ts`
    (new) — `DELETE` → `removeFavoriteOp.runFromRequest`.
  - `apps/web/src/app/api/v1/favorites/mine/route.ts` (new) —
    `GET` → `listMyFavoritesOp.runFromRequest`.
  - `apps/web/src/app/api/v1/favorites/mine/ids/route.ts` (new) —
    `GET` → `listMyFavoriteIdsOp.runFromRequest`.
- **What:** Match the slim pattern of
  `apps/web/src/app/api/v1/community/posts/[id]/interests/route.ts`
  — each file `export const runtime = "nodejs"` + the verb
  bindings. No business logic in the route layer.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` passes.
  - From a curl in dev:
    - `POST /api/v1/favorites { business_id: "<id>" }` with a
      valid session returns `{ ok: true }` and inserts one row.
    - `DELETE /api/v1/favorites/<id>` removes it.
    - `GET /api/v1/favorites/mine` returns the user's
      hydrated favorites.
    - `GET /api/v1/favorites/mine/ids` returns the ids.
    - Anonymous calls to all four return 401.

### Task 6: FavoriteButton component

- **Files:**
  - `apps/web/src/features/listings/components/favorite-button.tsx`
    (new)
- **What:** Client component (`"use client"`):
  - Props:
    `{ businessId: string; isFavorited: boolean; isSignedIn: boolean }`.
  - Early-return `null` when `!isSignedIn`.
  - Local state: `const [favorited, setFavorited] = useState(isFavorited)`,
    plus `const [error, setError] = useState(false)`.
  - On click: setFavorited(prev → !prev); fire either
    `apiClient.post("/api/v1/favorites", { body: { business_id: businessId } })`
    or `apiClient.delete(`/api/v1/favorites/${businessId}`)`;
    on error, revert state + set `error = true`. (`error`
    clears on next click.)
  - Render: a `<button>` containing the lucide `Heart` icon —
    `fill="currentColor"` when favorited, `fill="none"`
    otherwise. Class: `relative z-10 ...` so the card's
    `::after` overlay never wins the click. Color/size:
    foreground muted when empty, a brand-aligned filled tone
    when filled (use a tasteful red/coral, not `text-destructive`
    which we reserve for errors). `aria-pressed={favorited}`,
    `aria-label="Favorite this listing"` / "Remove from
    favorites" dynamically.
  - When `error` is true, render a small red dot adjacent to the
    icon (e.g. `absolute -top-1 -right-1 size-2 rounded-full
    bg-destructive`) and a tooltip `title="Couldn't update
    favorite. Try again."`.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` and `lint` pass.
  - The component, rendered in isolation with `isSignedIn={false}`,
    returns `null` (verify via snapshot or in dev).
  - Click toggles local state instantly (visible in dev with
    `console.log` removed before merge).

### Task 7: Wire FavoriteButton into BusinessCard

- **Files:**
  - `apps/web/src/features/listings/components/business-card.tsx`
    (edit)
- **What:**
  - Add two new optional props to `BusinessCardProps`:
    `isSignedIn?: boolean` (default `false`) and
    `isFavorited?: boolean` (default `false`).
  - Render `<FavoriteButton businessId={business.id}
    isSignedIn={isSignedIn} isFavorited={isFavorited} />` in
    the existing top-right flex column, **above** the
    `<TierPill>`. New stack: heart → tier pill (if any) → More
    Info.
  - No other changes to card layout or content.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` and `lint` pass.
  - All existing call sites that pass no new props continue to
    render (heart simply hidden, defaults kick in).
  - In dev with hand-injected `isSignedIn={true}
    isFavorited={false}` props, the empty heart shows above the
    tier pill on tier-1/2 cards.

### Task 8: Wire FavoriteButton into BusinessDetail

- **Files:**
  - `apps/web/src/features/listings/components/business-detail.tsx`
    (edit)
- **What:**
  - Add the same two optional props (`isSignedIn?`,
    `isFavorited?`) to `BusinessDetailProps`.
  - Render `<FavoriteButton ... />` in the detail header next to
    the `BadgeCheck` verified icon. Use the same sizing
    treatment as the rating row (`size-6 md:size-7`) to read at
    the detail-page scale.
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` and `lint` pass.
  - Existing call sites without the new props render as before.

### Task 9: My favorites page

- **Files:**
  - `apps/web/src/app/(app)/account/favorites/page.tsx` (new)
- **What:** RSC modeled after
  `apps/web/src/app/(app)/account/listings/page.tsx`:
  - `requireUser()` at top.
  - `apiServerFetch(listMyFavoritesOp, { input: {} })`.
  - `apiServerFetch(listMyFavoriteIdsOp, { input: {} })` so the
    heart on each card reflects the favorited state (it will,
    by definition, be all favorited — but the prop pipeline
    stays consistent).
  - Back-link to `/account` (matches sibling pages).
  - Page header: "My favorites" + a one-line description
    ("Businesses you've saved on AIRA.").
  - Empty state via `EmptyState` with icon `Heart`,
    title "No favorites yet", description "Save a business with
    the heart icon and it'll show up here.", action
    `{ label: "Browse the directory", href: "/directory" }`.
  - Items render via `BusinessCard` so the heart is consumable
    in-page (clicking it removes the fav; the row stays until
    refresh per the plan's decision).
  - `export const metadata = { title: "My favorites" }`.
  - `export const dynamic = "force-dynamic"` (per the sibling
    pages).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` and `lint` pass.
  - Signed-in user with 0 favorites sees the EmptyState + CTA.
  - Signed-in user with N favorites sees N `BusinessCard` rows,
    most-recent-first, each with a filled heart.
  - Anonymous user visiting `/account/favorites` is redirected
    via `requireUser()` (matches the other account sub-pages).

### Task 10: Account hub menu row

- **Files:**
  - `apps/web/src/app/(app)/account/page.tsx` (edit)
- **What:**
  - Import `Heart` from `lucide-react`.
  - Add a new entry to `ACCOUNT_ITEMS`:
    `{ href: "/account/favorites", label: "My favorites",
    icon: Heart }`. Place it between "My listings" and
    "Notifications" (purely a curatorial choice — keeps "My
    ___" rows together).
- **Acceptance:**
  - The menu row appears on `/account` with the Heart icon.
  - Clicking the row navigates to `/account/favorites`.

### Task 11: Wire favorite ids through public listing surfaces

- **Files (edit; final list TBD when implementing):**
  - `apps/web/src/app/(app)/home/page.tsx`
  - `apps/web/src/app/(app)/directory/page.tsx`
  - `apps/web/src/app/(app)/listings/[category]/page.tsx`
  - The single-business detail page (e.g.
    `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx`
    — confirm path at implementation).
- **What:**
  - Each page reads the session (`getSession()` from
    `apps/web/src/lib/auth/server.ts`) at the top.
  - When `session` is not null, call `apiServerFetch(listMyFavoriteIdsOp,
    { input: {} })` **in parallel** (via `Promise.all`) with the
    existing listings fetch.
  - Build a `Set<string>` from the returned ids.
  - Pass `isSignedIn={!!session} isFavorited={favIds.has(b.id)}`
    to each `BusinessCard` / `BusinessDetail` invocation.
  - When `session` is null, skip the fetch and pass the
    defaults (heart hidden).
- **Acceptance:**
  - `pnpm --filter @aira/web typecheck` and `lint` pass.
  - Visiting `/home`, `/directory`, `/listings/<cat>`, and a
    business detail page while signed-in shows correctly
    filled/empty hearts based on the database state.
  - Visiting the same surfaces signed-out shows NO hearts.
- **Pause if:** any of the listed pages is wrapped in a
  Suspense boundary in a way that complicates the parallel
  fetch (the page-level data should `Promise.all` for cleanly
  parallelised fetches, not serialise into the Suspense
  tree).

## Open questions

For `/mlabs-code` to escalate if it surfaces during implementation,
not to guess:

- None. All six plan open questions resolved in "Decisions locked"
  above. Task 3 and Task 11 each carry a single "Pause if" trigger
  for situations the plan didn't fully scope.

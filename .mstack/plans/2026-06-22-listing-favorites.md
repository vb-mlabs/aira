# Plan: Favorite a listing

**Date:** 2026-06-22
**Slug:** 2026-06-22-listing-favorites
**Status:** implemented
**Author:** framer@millionlabs.co.uk

---

## Problem

Signed-in users browse the directory, find businesses they want to come
back to later (a restaurant they liked, a service provider they're
considering, a vendor they keep losing track of), and have no way to
save them. Coming back means re-searching, re-scrolling, or relying on
browser tabs/notes. The friction either kills the come-back loop or
shoves it off-platform.

A "favorite a listing" feature gives users a one-click way to bookmark
a business and a dedicated page in their account hub to revisit the
saved set. It's the kind of small repeat-use loop that quietly raises
session frequency and gives the AIRA team a soft signal about which
businesses resonate (without selling that signal back to operators —
not in v1).

Benefits:
- Signed-in users get a personal shortlist that survives sessions and
  devices (it's server-side, not localStorage).
- The detail page heart doubles as a soft brand signal: when a user
  navigates back from email/SMS/link, the heart state restores so
  they're not confused about whether they already saved it.
- Future signal for editorial / sponsorship pitches without exposing
  per-listing counts publicly (deliberately out of scope for v1).

Success: a signed-in user opens any listing card, clicks the empty
heart, sees it fill instantly (optimistic UI), navigates to
`/account/favorites`, finds the listing at the top of the list with
the rest of their saved set ordered most-recent-first. Clicking the
filled heart again removes the listing; the My favorites list updates
on the next visit.

## Scope

**In:**
- New `business_favorite` join table: `(business_id, user_id)` pair,
  unique together, with `created_at` for sort ordering. Cascade
  delete on both FKs so removing a business or anonymising a user
  cleans up rows.
- New op set under `apps/web/src/server/operations/favorites.ts`:
  - `addFavoriteOp` — POST `/api/v1/favorites` with `business_id`.
    Idempotent (re-favoriting an already-favorited business is a
    successful no-op).
  - `removeFavoriteOp` — DELETE `/api/v1/favorites/<businessId>`.
    Idempotent (removing a non-existent favorite returns success).
  - `listMyFavoritesOp` — GET `/api/v1/favorites/mine`. Returns the
    user's favorited businesses with full `Business` shape, ordered
    by `created_at DESC` on the join.
  - `listMyFavoriteIdsOp` — GET `/api/v1/favorites/mine/ids`. Tiny
    payload: just `{ ids: string[] }`. Used by listing pages to
    decorate current cards with their fav state without bloating
    the public listings op.
- New service module under `packages/services/src/favorites/`
  mirroring the existing `packages/services/src/businesses/` shape
  (`queries.ts` + `index.ts`). Pure functions; `import "server-only"`
  not needed at the package boundary (the api layer enforces).
- New Zod validators in `packages/validators/src/favorites.ts`:
  `BusinessFavoriteSchema`, `AddFavoriteInputSchema`,
  `RemoveFavoriteInputSchema`, output shapes. Re-export from
  `packages/validators/src/index.ts`.
- New client component `apps/web/src/features/listings/components/favorite-button.tsx`:
  - Renders an outline heart when unfavorited, a filled heart when
    favorited (lucide-react `Heart` icon, `fill="currentColor"` on
    the filled state, `fill="none"` on empty).
  - Single-click toggle (decision locked). Calls `apiClient.post`
    or `apiClient.delete` against `/api/v1/favorites`.
  - Optimistic UI: flips local state immediately, sends request,
    reverts on error and surfaces a toast/inline error.
  - `relative z-10` so the card-wide `::after` overlay doesn't
    swallow its click (matches existing inner-anchor pattern from
    `SocialLinks`).
  - Hidden entirely when the user is not signed in (decision
    locked). The hosting card/detail page passes an `isSignedIn`
    flag; the component returns null when false.
- Wire into `apps/web/src/features/listings/components/business-card.tsx`
  — heart sits in the existing top-right flex column, **above** the
  Tier pill. Order top→bottom: heart, tier pill (if any),
  "More Info" pill.
- Wire into `apps/web/src/features/listings/components/business-detail.tsx`
  — heart sits in the header next to the BadgeCheck verified mark,
  sized larger to match the rating row treatment.
- New page `apps/web/src/app/(app)/account/favorites/page.tsx`:
  - RSC, `requireUser()`, `apiServerFetch(listMyFavoritesOp)`.
  - Mirrors `apps/web/src/app/(app)/account/listings/page.tsx` layout
    (back link, page header, EmptyState fallback, item list).
  - Reuses `BusinessCard` for each row so the heart is consumable
    there too (clicking it on this page removes the fav and the
    next refresh drops the row).
- Account hub menu — add a new entry to `ACCOUNT_ITEMS` in
  `apps/web/src/app/(app)/account/page.tsx`:
  `{ href: "/account/favorites", label: "My favorites", icon: Heart }`.
- Page hydration of current fav state — RSCs that render
  `BusinessCard` (the public listings/category/directory pages) call
  `listMyFavoriteIdsOp` in parallel with the existing listings fetch
  and pass the resulting `Set<string>` down to each card so it
  initialises its `FavoriteButton` correctly. Skipped entirely when
  the caller is anonymous (no auth → don't fetch).

**Out (deferred):**
- Mobile app UI. The Expo client gets the same `/api/v1/favorites/*`
  endpoints for free via REST; native screens are a follow-up plan.
- Public favorite counts on listings ("12 people favorited this").
  Out — social-proof pressure on small businesses + no business
  sign-off, per the brief.
- Owner notifications when their listing is favorited. Out.
- Favorite-based recommendations / "people also favorited" /
  trending. Out.
- Folders / lists / tags on favorites (e.g. "Date night" or "Diwali
  shopping"). Out — keep the data model flat for v1.
- Bulk import / share / export of favorites.
- Email digest of favorited businesses' updates.
- Admin surface for inspecting which users favorited which business.

## Approach

**Net new domain, narrow surface.** We add a 4-column join table
(`id`, `business_id`, `user_id`, `created_at`) plus the standard
op→service→query→UI stack. Three writes (`add`, `remove`, idempotent
both) and two reads (`list mine`, `list mine ids`). Everything else
is wiring.

**Two read paths by design.** The full `listMyFavoritesOp` returns
hydrated `Business[]` and is the source of truth for `/account/favorites`.
The tiny `listMyFavoriteIdsOp` returns a bag of ids and is what the
public listing surfaces call to decorate cards with the right
initial state — keeps the public listings op (which is heavily
cached / RSC-hot) free of per-user state and lets the per-user
state ride on a separate, cheaper request. RSC pages call both in
parallel via `Promise.all` to avoid waterfall.

**Optimistic UI without a state library.** `FavoriteButton` holds
its own local state seeded from a prop. Click → setState
immediately, fire-and-await the API request, revert on error.
Doesn't need to inform any parent state machine because each
listing's button is independent. After mutation, an explicit
`router.refresh()` syncs RSC state for users who navigate to
`/account/favorites` next — but the visible heart on the listing
page doesn't wait for that.

**Anonymous fast path.** The RSC layer reads `getSession()` once
(already in the route's data layer), skips the `listMyFavoriteIdsOp`
fetch when null, and passes `isSignedIn: false` down to the cards.
`FavoriteButton` early-returns `null` when not signed in — zero
chrome on the card, no nudge, no flash of empty heart. Matches the
"hide the heart for anonymous users" decision.

**Alternatives considered:**

- **Extend `listBusinessesOp` to include `is_favorited` per item.**
  Tempting because it kills a round trip and the cards know their
  state without a separate fetch. Rejected because (a) it leaks
  per-user state into a public-ish op that's currently
  user-agnostic and hot-cached, (b) it complicates the cache layer
  (Vary-by-user) when it's not warranted for v1, and (c) it bloats
  the `BusinessSchema` with a per-caller flag that the mobile
  client also has to learn. Better to keep listings public and
  layer the user-specific decoration on top.

- **Use `localStorage` for favorites and skip the DB.** Rejected —
  the entire pitch of "save it and come back later" breaks across
  devices. We have auth; we should use it.

- **Polymorphic `favorite` table that can favorite anything (a
  post, a category, a city) via `target_type + target_id`.**
  Rejected for v1 — premature design, the only thing anyone has
  asked to favorite is a business, and the polymorphic shape
  forces all downstream queries to JOIN-by-type which Drizzle
  doesn't love. If a second favoritable entity shows up later, we
  can either add a second table (`category_favorite`) or refactor
  to polymorphic in one move with the right context.

- **Double-click to remove.** User originally requested this;
  reviewer locked to single-click toggle for discoverability,
  mobile, and a11y reasons. Documented but not chosen.

- **Toast on every favorite/unfavorite.** Rejected — feels chatty
  on a multi-click browsing session. The instant heart-state flip
  IS the confirmation. Errors surface as toasts, success doesn't.

## Data model changes

**New table** in `packages/db/src/schema/business-favorite.ts`:

```ts
import { pgTable, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { businesses } from "./businesses"

export const businessFavorite = pgTable(
  "business_favorite",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    business_id: text("business_id")
      .notNull()
      .references(() => businesses.id, { onDelete: "cascade" }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("business_favorite_uq").on(table.business_id, table.user_id),
    index("business_favorite_user_idx").on(table.user_id, table.created_at),
  ],
)
```

Notes:
- Mirrors `post_interest` shape. No `message` column (not in scope).
- Unique index on `(business_id, user_id)` makes "favorite the same
  thing twice" a no-op via `ON CONFLICT DO NOTHING` in the service.
- Secondary index on `(user_id, created_at)` powers the My
  favorites list query (`WHERE user_id = ? ORDER BY created_at DESC`).
- Cascade on both FKs so anonymising a user or hard-deleting a
  business cleans up rows automatically.

Migration generated via `pnpm --filter @aira/db generate`. Purely
additive — new table, no schema changes to existing tables.

Add to `packages/db/src/schema/index.ts` re-exports.

## Files to touch

**New:**
- `packages/db/src/schema/business-favorite.ts` — table definition.
- `packages/db/drizzle/migrations/00XX_<auto>.sql` — generated.
- `packages/validators/src/favorites.ts` — schemas + types.
- `packages/services/src/favorites/index.ts` — barrel.
- `packages/services/src/favorites/queries.ts` — DB read/write.
- `apps/web/src/server/operations/favorites.ts` — 4 ops.
- `apps/web/src/app/api/v1/favorites/route.ts` — POST handler.
- `apps/web/src/app/api/v1/favorites/[businessId]/route.ts` — DELETE
  handler.
- `apps/web/src/app/api/v1/favorites/mine/route.ts` — GET handler.
- `apps/web/src/app/api/v1/favorites/mine/ids/route.ts` — GET
  handler.
- `apps/web/src/features/listings/components/favorite-button.tsx` —
  client component.
- `apps/web/src/app/(app)/account/favorites/page.tsx` — RSC page.

**Edit:**
- `packages/db/src/schema/index.ts` — re-export the new table.
- `packages/validators/src/index.ts` — re-export the new module.
- `packages/services/src/index.ts` — re-export the new module.
- `apps/web/src/features/listings/components/business-card.tsx` —
  add `isSignedIn?` + `isFavorited?` props; render the
  `FavoriteButton` above the Tier pill in the right-column flex.
- `apps/web/src/features/listings/components/business-detail.tsx` —
  same prop additions; render the heart next to BadgeCheck.
- `apps/web/src/app/(app)/account/page.tsx` — add the My favorites
  menu row to `ACCOUNT_ITEMS`.
- Each RSC page that renders `BusinessCard` and is reachable to
  signed-in users (audit list at acceptance time, definitely
  includes `apps/web/src/app/(app)/listings/[category]/page.tsx`,
  `apps/web/src/app/(app)/directory/page.tsx`,
  `apps/web/src/app/(app)/home/page.tsx`, possibly
  `apps/web/src/app/(app)/categories/page.tsx`) — fetch
  `listMyFavoriteIdsOp` in parallel when signed in, pass the id Set
  through to each card. Skip the fetch when anonymous.
- `apps/web/src/app/(app)/listings/[category]/[id]/page.tsx` (the
  public business detail RSC, wherever it actually lives) —
  same fetch + pass to detail component.

## Edge cases

- **Race on rapid double-click.** Two `add` requests in flight: the
  DB unique index makes the second a no-op via
  `INSERT ... ON CONFLICT DO NOTHING`. Both API responses return
  success. Optimistic state stays flipped.
- **Click on heart while signed-out.** UI hides the button entirely
  so this can't happen. If somehow it does (stale page after
  sign-out), the route handler returns 401 and the optimistic
  state reverts.
- **Favorited business gets archived.** Mirror My listings: the row
  stays in the My favorites list with an "Archived" badge, but the
  card stops linking to the (now 404) public detail page. Show a
  muted "This listing is archived" line and a Remove action so the
  user can clear stale entries.
- **Favorited business gets hard-deleted.** FK cascade removes the
  fav row automatically. User just sees their favorites count drop
  by one with no error.
- **User anonymises their account.** FK cascade on the user side
  removes all their favorites. The business owner sees no
  difference — there's no per-business count to drift.
- **Empty favorites list.** EmptyState with a "Browse the
  directory" CTA pointing at `/directory`.
- **Listing pages currently use Suspense.** The new
  `listMyFavoriteIdsOp` Promise must run in `Promise.all` with the
  existing listings fetch so we don't serialise. Don't drop it into
  the existing Suspense boundary without checking the wrapper.
- **`/account/favorites` ordering.** Most-recent-first via the
  secondary index. If a user re-favorites a previously-removed
  listing, it gets a fresh `created_at` and rises to the top —
  acceptable for v1.
- **Bot traffic / abuse.** Anonymous users can't favorite. Signed-in
  users adding 10,000 favorites is technically possible but
  uninteresting (the table is small, indexed, and each fav is one
  row). No rate-limit needed for v1; add later if it ever matters.
- **Mobile double-tap zoom.** The toggle pattern locks single-click,
  but on touch devices a fast double-tap could fire two clicks. The
  unique index handles the duplicate add; a tap-then-tap on a
  filled heart would unfavorite then re-favorite. Acceptable: the
  visible end state is still "favorited."
- **Network failure on optimistic toggle.** Revert local state and
  surface an inline error message (or a toast — see open
  question Q3).
- **Stale `is_favorited` from cache.** The RSC re-fetches per
  request (force-dynamic on these pages already). The card's
  initial state is the server value; subsequent clicks update
  local state. If a user opens two tabs and favorites in one, the
  other tab's heart stays empty until reload — acceptable.
- **`More Info` button width creep.** Adding a heart above the Tier
  pill in the same flex-col widens nothing — it stacks. But the
  card uses `flex-shrink-0` on the right column; verify the heart
  doesn't push the social row to wrap on narrow viewports.

## Acceptance criteria

- [ ] `pnpm --filter @aira/db generate` produces a non-destructive
      migration adding only the `business_favorite` table + its
      indexes.
- [ ] `pnpm --filter @aira/db migrate` applies cleanly.
- [ ] A signed-in user clicks an empty heart on any listing card →
      the heart fills immediately (optimistic) and a POST to
      `/api/v1/favorites` succeeds with 200/201.
- [ ] Clicking the filled heart sends DELETE
      `/api/v1/favorites/<businessId>` and the heart empties.
- [ ] Re-clicking rapidly does not error (unique-index idempotency).
- [ ] An anonymous user sees no heart on cards or the detail page.
- [ ] `/account/favorites` lists the user's favorited businesses
      ordered most-recent-first; clicking the heart on a row removes
      it (the row stays visible until refresh; the next visit
      doesn't include it).
- [ ] Empty state: a user with no favorites sees a copy + CTA to
      `/directory`.
- [ ] An archived favorited business renders with an Archived badge
      and no broken link.
- [ ] Hard-deleting a business removes its fav rows (cascade
      verified by a quick `SELECT count(*) FROM business_favorite`
      before/after).
- [ ] `pnpm typecheck` and `pnpm lint` pass.
- [ ] Account hub menu shows "My favorites" with a Heart icon
      linking to `/account/favorites`.
- [ ] Visiting `/account/favorites` while signed out redirects to
      sign-in (via `requireUser()`).
- [ ] Public business listings ops are unchanged in shape — no
      `is_favorited` field added to `BusinessSchema`.

## Open questions

For `/mlabs-review` to resolve before implementation:

- **Q1 — Two ops or one?** The plan adds both
  `listMyFavoritesOp` (full Business[]) and
  `listMyFavoriteIdsOp` (id list). The full op feeds the My
  favorites page; the id op feeds the heart-state decoration on
  listings. Alternative: one op returning both shapes, called
  twice with different inputs, or a thin id endpoint only and the
  My favorites page does an N+1 fetch (no — bad). Plan recommends
  two ops. Reviewer can collapse.

- **Q2 — REST shape for the DELETE endpoint.** Plan suggests
  `DELETE /api/v1/favorites/<businessId>` (resource-style). The
  defineOperation pattern across the rest of the codebase tends
  to use POST for mutations regardless of verb. Check existing
  conventions and align — keeping DELETE only if the rest of the
  API uses HTTP verbs cleanly.

- **Q3 — Error surface on failed mutation.** Optimistic UI
  reverts cleanly, but does the user see anything? Plan suggests
  silent revert + small inline error message under the heart on
  failure. Alternative: a toast (need to confirm if there's a
  toast system already wired in to the public app; messaging /
  notifications use the bell, not toasts).

- **Q4 — Sort order on `/account/favorites` (most-recent-first
  default).** Confirm. Alternative is alphabetical by business
  name; users with hundreds of favorites might prefer the latter,
  but most-recent-first matches "you just saved this, see it at
  the top."

- **Q5 — Render the heart on listings the user owns?** A business
  owner browsing their own listing — should they see the heart?
  Probably yes for consistency, but it's a slightly weird mental
  model ("favorite your own business"). Reviewer to confirm
  whether to filter their own listings out or show the heart
  anyway.

- **Q6 — Should `getCategoryTree`-style `includeInactive` apply to
  favorites?** Specifically: if a user favorited a business and
  the business is later archived (soft-delete), the My favorites
  list still shows it with an Archived badge. If the archived row
  is later hard-purged (F14 cron), the FK cascade removes the
  fav. Documented in edge cases; no decision needed unless
  reviewer wants to filter archived from the My favorites list
  proactively (Plan recommendation: show them with badge until
  the cron sweeps them).

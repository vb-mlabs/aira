# Review: Mobile parity (P2c) — Account hub redesign + remaining sub-pages

**Date:** 2026-06-29
**Slug:** 2026-06-29-mobile-parity-p2c-account-hub
**Plan reviewed:** [2026-06-29-mobile-parity-p2c-account-hub.md](../plans/2026-06-29-mobile-parity-p2c-account-hub.md)
**Status:** approved
**UI-Significant:** no
**Reviewer:** Claude (Opus 4.7) via `/mlabs-review`

---

## Summary

P2c is ready to implement. 6 atomic tasks closing the P2 mobile-parity
series. Codebase audit surfaced five factual corrections (op output
shape, REST URLs, missing apiPatch wrapper, expo-application vs
expo-constants for version display, EditMyPostInputSchema body
handling) — all approved + folded into the task list. All five plan
open questions locked at recommended. UI-Significant: `no` — task
list touches only `apps/mobile/**`.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** `listMyCommunityPostsOp` output uses `AdminPostRowSchema`
  not `PostRowSchema`. The author's-own-posts rows include `user_id` +
  `rejected_reason` + other admin fields that the public PostRow
  excludes.
  **Decision:** Confirmed. T4 creates a new `MyPostRow` component
  (under `features/community/components/`) keyed to the
  `AdminPostRow` shape. Renders per-row status pill (matching the
  `PostStatusBanner` per-status copy) + rejected_reason on rejected
  rows + tap-to-edit affordance. PostCard stays as-is for the
  public board.

- **Concern:** REST URLs in the plan implied paths not confirmed
  against the route handlers.
  **Decision:** Verified:
  - GET `/api/v1/account/listings` → listMyBusinessesOp, returns
    `{ items: Business[] }`
  - GET `/api/v1/community/my-posts` → listMyCommunityPostsOp,
    returns `{ items: AdminPostRow[] }`
  - PATCH `/api/v1/community/posts/{id}` → editMyCommunityPostOp,
    returns `{ post: AdminPostRow }`
  - DELETE `/api/v1/community/posts/{id}` → deleteMyCommunityPostOp
  Mobile api wrappers follow these paths.

- **Concern:** `apiPatch` helper doesn't exist in
  `apps/mobile/lib/api/client.ts` (currently has apiGet, apiPost,
  apiDelete only). The editor needs PATCH for
  editMyCommunityPostOp.
  **Decision:** T5 adds a one-line `apiPatch` wrapper to
  `lib/api/client.ts` — same shape as `apiPost` but with
  `method: "PATCH"`. Captured in the T5 Files list.

- **Concern:** Plan recommended `expo-application` for version
  display on About page. It's NOT pre-bundled with Expo core; it's
  a separate npm package and adding it triggers the "no new deps
  without flagging" rule.
  **Decision:** Use `expo-constants` instead (already installed at
  `~18.0.13` in mobile package.json). Read via
  `Constants.expoConfig?.version` for the marketing version string.
  No new dep.

- **Concern:** `EditMyPostInputSchema.body` is
  `z.string().trim().max(...).nullable().optional()` — semantics:
  null = clear the body, undefined = leave unchanged. Editor
  shouldn't accidentally null a non-empty body.
  **Decision:** Editor always sends the current value (string or
  undefined when empty). Never sends null. If the user empties the
  body field, send `body: undefined` (not `body: null`) — server
  treats undefined as "unchanged". Mirrors the composer pattern
  from `post/new.tsx`.

- **Concern:** Plan listed 5 open questions.
  **Decision:** All five locked at recommended:
  1. **Icons:** `heart-outline`, `store-outline`,
     `message-text-outline`, `bell-outline`, `lock-outline`,
     `file-document-outline`, `information-outline`
     (MaterialCommunityIcons names — verified exist in the icon
     font).
  2. **Sign out + Delete account placement:** keep as destructive
     rows at the bottom of the hub. Don't redistribute to
     sub-pages per web — that'd require touching T1 + T6 for
     marginal parity gain.
  3. **Editor's Delete button:** bottom of the form,
     destructive-tinted, opens a `Dialog` confirm. Matches the
     mobile pattern from `account/index.tsx`'s "Delete account"
     row + Dialog.
  4. **MyPostRow as a new component** under
     `features/community/components/` (PostCard doesn't have
     status pill + edit affordance; porting would contort it).
  5. **About page version info:** use
     `Constants.expoConfig?.version` from `expo-constants`
     (already installed). Display the marketing version string
     only — no build number (those drift across EAS builds and
     don't add user value).

### Suggestions (taken or deferred)

- **Suggestion:** Add a tappable mailto: row on
  `/account/listings`'s EmptyState that opens the support email
  pre-filled with "Claim my business".
  **Taken** — `Linking.openURL(mailto:${brand.supportEmail}?subject=Claim%20my%20business)`
  on tap. Captured in T3's Acceptance.

- **Suggestion:** Pull-to-refresh on all data-fetching sub-pages
  (notifications, listings, posts).
  **Taken** — added to each task's Acceptance.

- **Suggestion:** Hub row order should match the priority of
  user-relevant info: Favorites first (most-touched), then My
  Listings + My Posts (author surfaces), then Notifications, then
  Privacy/Terms/About (rarely opened).
  **Taken** — locked the order in T1's Acceptance.

- **Suggestion:** "Edits sent for moderation" success banner on
  the editor should disappear before the screen unmounts (router
  back fires immediately) — a toast might be lost on the
  navigation. Use `Alert.alert` to ensure the user sees it before
  returning to the list.
  **Deferred** — toast on the next-mounted screen (the posts
  list) is fine; useToast persists across screen mounts in this
  app. P3 polish if QA flags it.

- **Suggestion:** P3's push deep-link routing must target the new
  `/account/notifications` path, not the deleted `/notifications`.
  **Taken** — flagged in T2's commit message + carried to the P2c
  implementation report.

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- `MyPostRow` is a NEW component under
  `features/community/components/` — keyed to `AdminPostRow`,
  renders status pill + rejected_reason + edit-tap affordance.
- REST URLs confirmed (`/api/v1/account/listings`,
  `/api/v1/community/my-posts`, PATCH/DELETE
  `/api/v1/community/posts/{id}`).
- `apiPatch` helper added in T5 to `lib/api/client.ts`.
- About page uses `expo-constants` (already installed), not
  `expo-application`.
- Editor sends `body: undefined` (never `null`) when the field is
  empty, to avoid the
  `EditMyPostInputSchema.body.nullable()` foot-gun.
- Hub icons locked (7 MaterialCommunityIcons names).
- Sign out + Delete account stay on the hub.
- Editor Delete: bottom of form + Dialog confirm.
- About version: marketing string from `Constants.expoConfig?.version`,
  no build number.
- `/account/listings` EmptyState includes a mailto: "Claim my
  business" tappable row.
- Pull-to-refresh on every data-fetching sub-page.
- Hub row order: Favorites → My Listings → My Posts →
  Notifications → Privacy & Security → Terms → About → Sign out
  → Delete account.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit). `/mlabs-code` runs autonomously
but pauses if a task lists a **Pause if** trigger that matches the
situation.

### Task 1: Account hub layout restructure (flat row list)

- **Files:**
  - `apps/mobile/app/(app)/account/index.tsx` (edit)
- **What:** Rewrite the hub to a flat vertical list of 7 sub-page
  rows + Sign out + Delete account. Drop the iOS Settings section
  headers (Profile / Notifications / Security / Danger Zone). Drop
  the no-op Name / Email / Change password rows. The "Enable
  notifications" push-permission re-prompt action moves out of the
  hub (T6 picks it up under privacy-security).

  Hub structure top to bottom:
  - Avatar header (preserved byte-for-byte)
  - 7 sub-page rows (each with leading
    MaterialCommunityIcons glyph + label + trailing chevron):
    1. Favorites (`heart-outline`) → `/account/favorites`
    2. My Listings (`store-outline`) → `/account/listings`
    3. My Posts (`message-text-outline`) → `/account/posts`
    4. Notifications (`bell-outline`) → `/account/notifications`
    5. Privacy & Security (`lock-outline`) → `/account/privacy-security`
    6. Terms (`file-document-outline`) → `/account/terms`
    7. About (`information-outline`) → `/account/about`
  - Sign out (destructive row, opens existing Dialog)
  - Delete account (destructive row, opens existing Dialog)

  Each row routes via `router.push('/account/<slug>' as never)`.
  Sub-pages that don't exist yet (everything except favorites)
  404 until later tasks fill them in.

  The existing `Row` helper component already handles label +
  trailing chevron. Update it to optionally accept a leading
  icon node (or wrap in a new `IconRow` component if the prop
  surface gets gnarly).

  Preserve byte-for-byte: avatar Pressable + upload flow,
  `useSignOut` + `useDeleteAccount` + Toast plumbing, both
  Dialogs.

- **Acceptance:**
  - Account tab renders the flat row list in the locked order.
  - No iOS Settings section headers visible.
  - Each row has a leading MaterialCommunityIcons glyph (verified
    by glyph name, not visual).
  - Tapping each row pushes the matching `/account/<slug>` route.
  - Sign out still works (Dialog confirm → `useSignOut.mutateAsync`
    → auth gate redirects to welcome).
  - Delete account still works (same pattern with
    `useDeleteAccount`).
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

### Task 2: Move notifications screen to /account/notifications

- **Files:**
  - `apps/mobile/app/(app)/notifications.tsx` (delete)
  - `apps/mobile/app/(app)/account/notifications.tsx` (new — same content as deleted file)
  - `apps/mobile/app/(app)/_layout.tsx` (edit — drop the `<Tabs.Screen name="notifications" options={{ href: null }} />` entry)
- **What:** Move the orphaned notifications screen under the
  Account directory. Content stays the same — the screen uses
  `useNotifications` from `features/notifications/hooks.ts` (no
  changes needed there). The Stack header on the new sub-page
  inherits from `account/_layout.tsx` (paper-cream background,
  back chevron returns to the hub).

  Update `(app)/_layout.tsx`: remove the hidden notifications tab
  entry. The route `/notifications` no longer exists; push deep-
  links must target `/account/notifications` (flag in commit
  message for P3).

- **Acceptance:**
  - `apps/mobile/app/(app)/notifications.tsx` no longer exists.
  - `apps/mobile/app/(app)/account/notifications.tsx` exists and
    renders the same in-app notifications list as before.
  - `(app)/_layout.tsx` no longer contains
    `name="notifications"` in the Tabs.Screen entries.
  - Tapping Notifications on the hub pushes
    `/account/notifications` and the screen renders.
  - Pull-to-refresh works on the notifications list.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - expo-router complains about a missing `/notifications`
    route after the deletion. Should be clean since no
    Tabs.Screen registers it post-edit, but Metro cache
    invalidation may be needed.

### Task 3: /account/listings — read-only owned businesses

- **Files:**
  - `apps/mobile/features/listings/api.ts` (edit — add `getMyListings`)
  - `apps/mobile/features/listings/hooks.ts` (edit — add `useMyListings`)
  - `apps/mobile/app/(app)/account/listings.tsx` (new)
- **What:** New stack screen that fetches via
  `getMyListings` (GET `/api/v1/account/listings`) and renders the
  results as `BusinessCard` rows. Read-only — no edit affordance
  (business edit is admin-only).

  `getMyListings()` wraps `apiGet<{ items: Business[] }>('/api/v1/account/listings')`,
  returns `{ items: Business[] }`.

  `useMyListings()` is a `useQuery` keyed by
  `["listings", "mine"]`, returns the array via
  `data?.items ?? []`.

  Screen layout: FlatList of `BusinessCard` (no showCategory
  override since these are user-owned businesses across
  categories), pull-to-refresh, EmptyState with the locked copy:
  "You don't manage any listings yet." + "Contact AIRA support
  to claim a business." + a tappable mailto: button opening
  `mailto:${brand.supportEmail}?subject=Claim%20my%20business`.

- **Acceptance:**
  - `/account/listings` route resolves and renders the screen.
  - useMyListings fires on mount; pull-to-refresh re-fetches.
  - Owned businesses render as `BusinessCard` rows (full chrome
    including heart toggle).
  - EmptyState renders the locked copy when zero businesses, and
    the mailto: button opens the support email pre-filled with
    the subject.
  - Stack header shows "My Listings" with back chevron returning
    to the hub.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

### Task 4: /account/posts — author's own posts list

- **Files:**
  - `apps/mobile/features/community/api.ts` (edit — add `listMyCommunityPosts`)
  - `apps/mobile/features/community/hooks.ts` (edit — add `useMyCommunityPosts`)
  - `apps/mobile/features/community/components/MyPostRow.tsx` (new)
  - `apps/mobile/app/(app)/account/posts.tsx` (new)
- **What:** New stack screen that fetches via
  `listMyCommunityPosts` (GET `/api/v1/community/my-posts`,
  returns `{ items: AdminPostRow[] }`) and renders the results as
  `MyPostRow` rows.

  `MyPostRow` is a new component under
  `features/community/components/`. Keyed to `AdminPostRow`
  (includes `status`, `rejected_reason`, `user_id`). Renders:
  - Status pill at the top (per-status color matching
    `PostStatusBanner` — pending muted, approved primary,
    expired muted, rejected destructive)
  - Title (numberOfLines=2)
  - Body preview (numberOfLines=1)
  - relative-time meta
  - For rejected rows: `rejected_reason` as a small destructive
    caption below the body
  - Tappable whole-row → `router.push('/account/posts/edit/<id>')`
  - Same chrome standard as PostCard (no border, soft shadow,
    bg-card).

  Screen layout: FlatList of MyPostRow, pull-to-refresh,
  EmptyState "You haven't posted yet. Tap Post on AIRA on the tab
  bar to share what you need." with no extra CTA (the Post tab
  is already in the bottom bar).

  Stack header: "My Posts".

- **Acceptance:**
  - `/account/posts` route resolves.
  - useMyCommunityPosts fires on mount; pull-to-refresh re-fetches.
  - Rows render with the correct status pill per row.
  - Rejected rows show the rejected_reason caption.
  - Tap row → `router.push('/account/posts/edit/<id>')` (404 until
    T5 lands).
  - EmptyState renders locked copy when zero posts.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

### Task 5: /account/posts/edit/[id] — author editor + delete

- **Files:**
  - `apps/mobile/lib/api/client.ts` (edit — add `apiPatch` helper)
  - `apps/mobile/features/community/api.ts` (edit — add `editMyCommunityPost` + `deleteMyCommunityPost`)
  - `apps/mobile/features/community/hooks.ts` (edit — add `useEditMyPost` + `useDeleteMyPost`)
  - `apps/mobile/app/(app)/account/posts/edit/[id].tsx` (new)
- **What:**

  Add `apiPatch<T>(path, body?)` to `lib/api/client.ts` — mirrors
  `apiPost` with `method: "PATCH"`.

  `editMyCommunityPost(input)` wraps
  `apiPatch<{ post: AdminPostRow }>('/api/v1/community/posts/{id}', { title, body, phone, email })`.

  `deleteMyCommunityPost(id)` wraps
  `apiDelete('/api/v1/community/posts/{id}')`.

  Hooks: `useEditMyPost(postId)` and `useDeleteMyPost(postId)` —
  both `useMutation` with `onSuccess` invalidating
  `["community", "my-posts"]` (for the list refresh) and
  `["community", "post", postId]` (in case the user opens the
  public detail).

  Editor screen: Stack screen at
  `account/posts/edit/[id].tsx`. Reads `id` via
  `useLocalSearchParams`. Pre-fills the form from `usePost(id)`
  (reuses the hook from P2a — `usePost` returns the public
  post shape but the same fields the editor cares about
  exist on both shapes). Form: title (required, max 120),
  body (multiline, max 1000), phone, email. Submit calls
  `useEditMyPost.mutateAsync({ id, title, body, phone, email })`
  with `body` sent as the string value or `undefined` when
  empty (never `null` — avoids the `nullable()` foot-gun in
  EditMyPostInputSchema).

  On submit success: toast "Edits sent for moderation"
  (the server reverts approved posts to pending per F20 v2) +
  `router.back()`.

  Delete button at the bottom of the form, destructive-tinted,
  opens a `Dialog` confirm. On confirm:
  `useDeleteMyPost.mutateAsync({ id })` → toast "Post deleted"
  → `router.back()`.

  Loading state: skeleton placeholders for the form fields
  during `usePost(id)` fetch. 404: EmptyState "Post not found."
  if usePost returns null.

- **Acceptance:**
  - `apiPatch` helper exists in `lib/api/client.ts` and
    typechecks.
  - `/account/posts/edit/<id>` route resolves; form pre-fills
    from `usePost(id)`.
  - Submit calls editMyCommunityPostOp via PATCH; on success
    navigates back to `/account/posts` and the list re-renders
    with the new state (status pill flips to pending if previously
    approved).
  - Delete confirm Dialog appears; confirming calls
    deleteMyCommunityPostOp via DELETE; on success navigates
    back and the post no longer appears in the list.
  - Empty body field sends `body: undefined`, not `body: null`.
  - 404 EmptyState renders when usePost returns null.
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.
- **Pause if:**
  - `usePost` returns a `PostRow` shape but the editor needs a
    field the public shape doesn't expose (e.g., phone visible
    only to author per a service-side check). If the form
    pre-fill is missing data, escalate — we may need a separate
    `usePostForEdit` hook calling a different endpoint.

### Task 6: /account/privacy-security + /account/terms + /account/about (content bundle)

- **Files:**
  - `apps/mobile/app/(app)/account/privacy-security.tsx` (new)
  - `apps/mobile/app/(app)/account/terms.tsx` (new)
  - `apps/mobile/app/(app)/account/about.tsx` (new)
- **What:**

  **`privacy-security.tsx`** — single Row at top: "Enable
  notifications" (the relocated push-permission re-prompt from the
  old hub). Below, a ScrollView with privacy + security copy
  paraphrased from the web `/account/privacy-security/page.tsx`:
  - "What we collect" (email, post content, favorites,
    notification settings)
  - "How we use it" (delivering the app, no third-party data
    sales)
  - "Your controls" (sign out, delete account from the hub,
    revoke push from system settings)
  
  Stack header: "Privacy & Security".

  **`terms.tsx`** — ScrollView with terms text. Port from web's
  `/account/terms/page.tsx`. Short paragraphs paraphrased per
  the brand voice. Stack header: "Terms".

  **`about.tsx`** — ScrollView with the brand block:
  - AIRA tree-of-life logo
  - Brand name (`brand.name`) + tagline (`brand.tagline`)
  - "AIRA by {brand.parentName}" caption
  - Short about copy from `brand.homepage.aboutBody`
  - Marketing version line via
    `Constants.expoConfig?.version` from `expo-constants`
    (e.g., "Version 0.1.0")
  - Support email row (tappable mailto:)
  
  Stack header: "About".

- **Acceptance:**
  - All three routes resolve and render their content.
  - "Enable notifications" row on privacy-security calls
    `requestPermissionAndRegister()` (same handler as the
    legacy hub had) and toasts success/error.
  - About page shows the marketing version string from
    `expo-constants` (e.g. `Version 0.1.0`).
  - All three screens have a Stack header with back chevron.
  - No hardcoded brand strings (every brand reference goes
    through `brand.*` from `@aira/config` — CLAUDE.md hard rule).
  - `pnpm --filter @aira/mobile typecheck` + `pnpm lint` clean.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not
guess.

- **MyPostRow status pill colors.** Per-status: pending →
  `bg-muted text-mutedForeground`; approved → `bg-success
  text-successForeground` (or a smaller variant); expired →
  `bg-muted text-mutedForeground` (same as pending — both are
  "not actively visible"); rejected → `bg-destructive
  text-destructiveForeground`. Mirrors web's pill styling
  pattern. `/mlabs-code` may tweak colors if the existing pill
  pattern (e.g., the AIRA Stars / verified pill) suggests
  something else — escalate if unclear.

- **Privacy + Terms + About copy.** Locked at "paraphrase from
  web, brand voice". `/mlabs-code` should write the copy
  directly; if the web copy is shorter than expected or
  references something mobile doesn't have (e.g., browser-
  specific behavior), adapt without escalating.

- **Editor success toast vs banner.** Plan said toast.
  `useToast` is already imported elsewhere in the app. If
  `/mlabs-code` finds that toast doesn't persist across the
  immediate `router.back()`, fall back to a brief banner inside
  the editor before navigating (300ms setTimeout
  router.back).

- **Notification badge invalidation.** When the user opens
  `/account/notifications`, web invalidates the unread count.
  Mobile's `useUnreadCount` is still called in `(app)/_layout.tsx`
  (warm cache from P1). T2's notifications screen should
  invalidate `["notifications", "unread-count"]` on mount OR
  call `markAllRead` if that's the web pattern. `/mlabs-code`
  should check the web `/account/notifications` behavior +
  match it.

- **The `usePost` hook for the editor pre-fill.** Plan said
  reuse from P2a. The public `getCommunityPostOp` returns
  `PostRow` which has phone/email/title/body — same fields the
  editor edits. Should work directly. If `/mlabs-code` discovers
  the author needs a richer shape (e.g., `rejected_reason`
  visible in the editor), surface for review.

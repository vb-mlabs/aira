# Review: Avatar rendering consolidation (web)

**Date:** 2026-07-07
**Slug:** 2026-07-07-avatar-consolidation
**Plan reviewed:** [2026-07-07-avatar-consolidation.md](../plans/2026-07-07-avatar-consolidation.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** framer@millionlabs.co.uk (via /mlabs-review)

---

## Summary

Plan is sound. The consolidation replaces seven initials-only surfaces
with a single primitive backed by one initials rule, and widens the
community post shape to carry `author_image`. Review clarified three
implementation details that the plan left open (initials rule choice,
`size-9` handling, unit-test infra) and one type-shape wording issue
(`PostRow`/`AdminPostRow` are Zod-inferred; the source-of-truth edit
lives in `packages/validators/`, not in a hand-written interface). All
resolved; no blockers.

Although the `UI-Significant` flag computes to **yes** (five qualifying
UI files touched), this is a technical refactor — no new screens, no
layout changes, no design decisions. Skipping `/mlabs-mockup` is the
right call. Run `/mlabs-code` next.

## Findings

### Blockers (must fix before /mlabs-code)

None.

### Concerns (raised, decided, recorded)

- **Concern:** Plan says "extend `PostRow`, `AdminPostRow` interfaces +
  mappers" in `packages/services/src/community/service.ts`. Those are
  actually Zod-inferred types (`z.infer<typeof PostRowSchema>` from
  `packages/validators/src/community.ts:46,66`). Editing the service
  file's interface wouldn't propagate; the schema is the source of
  truth.
  **Decision:** The type-widening edit lives **only** in
  `packages/validators/src/community.ts`. The service edits are:
  (1) add `author_image` to `POST_SELECT`, (2) add `author_image` to
  the hand-written `DbPostRow` interface at service.ts:34-53 (the DB
  row type used inside the service module), (3) add `author_image` to
  both mappers `toPostRow` (service.ts:55) and `toAdminPostRow`
  (service.ts:71). Task 3 in the implementation plan below spells this
  out.

- **Concern:** Three distinct initials behaviors exist today:
  `avatar-uploader.tsx:125-130` uses `slice(0,2)` for single words and
  `first+last` for two-plus; `top-utility-bar.tsx:11-19` uses one char
  for single words; community `initialsOf` uses first-two-words.
  Migrating everything to the primitive forces a choice.
  **Decision:** Adopt the `avatar-uploader.tsx` rule verbatim (single
  word → `slice(0,2).toUpperCase()`; multi-word → first+last
  initial). Rationale: it's the only variant already validated by
  the working `<Preview>` component, and single-word "AL" reads as
  identity where "A" is ambiguous. Side-effect: `TopUtilityBar`'s
  small avatar for single-name users changes from 1 char → 2 chars.
  Accept — the visual delta is negligible at 32px and consistency
  wins.

- **Concern:** Community `post-card.tsx` and `post-detail-modal.tsx`
  render the initials circle at `size-9` (36px), which doesn't map onto
  the sm=32 / md=40 scale from the plan.
  **Decision:** Snap both to `size="md"` (40px). +2px each side is
  visually negligible; keeping the scale clean is worth more than
  preserving the exact 36px number.

- **Concern:** `<Avatar>` behavior when the image URL fails to load
  (404, external OAuth avatar host down).
  **Decision:** Primitive includes `onError` → fall back to initials.
  Small (~5 lines: `useState<'ok'|'error'>('ok')`, `onError` sets
  `'error'`, render initials branch in that state). Prevents the
  browser's broken-image icon appearing in the UI.

- **Concern:** `packages/ui-web` has no vitest configuration today. The
  plan proposes a unit test for the primitive.
  **Decision:** Add a minimal `vitest.config.ts` to `packages/ui-web`
  and ship `avatar.test.tsx` alongside the primitive. Unlocks tests
  for future ui-web primitives (roughly 30 lines of config + one dev
  dep: `vitest`, already used elsewhere in the workspace).

- **Concern:** `AdminPostRowSchema` is reused by `MyPostsListOutputSchema`
  (author-side `/account/posts`), `EditPostOutputSchema`, and
  `AdminModeratePostOutputSchema`. Widening it means those endpoints
  also carry `author_image`.
  **Decision:** Accept — additive, no client breakage. `AdminPostRow`
  producers other than the two mappers use unrelated shapes
  (`responder_name` at service.ts:504,1073 is `InterestRow`). No
  ripple concerns.

### Suggestions (taken or deferred)

- **Suggestion (taken):** Document the "same-origin, server-resized JPEG,
  bypass next/image" rationale as a short comment on the primitive's
  `<img>` so future readers don't rediscover it. Same justification
  already exists inline in `avatar-uploader.tsx:102-104`.
- **Suggestion (deferred):** Fold the `messages/conversation-row.tsx`
  refactor into this stack to delete the last inline `initials()` helper.
  Deferred per the plan's out-of-scope call and the user's scope pick.
  Captured as a follow-up.

## Decisions locked

- Initials rule = `avatar-uploader.tsx` variant.
- Fallback style = single (bg-muted / text-muted-foreground) per plan.
- Size scale = `sm=32, md=40, lg=56, xl=64`. `className` overrides
  everything for outliers.
- Broken-image `onError` fallback = yes, inside the primitive.
- Unit test infra = vitest in `packages/ui-web`; test lives at
  `packages/ui-web/src/components/avatar.test.tsx`.
- Type source of truth for `PostRow` / `AdminPostRow` = the Zod schemas
  in `packages/validators/src/community.ts`.

## Implementation plan

Ordered tasks. `/mlabs-code` executes top-to-bottom, one commit each.

### Task 1: Add vitest to `@aira/ui-web`

- **Files:**
  `packages/ui-web/package.json` (edit) ·
  `packages/ui-web/vitest.config.ts` (new) ·
  `packages/ui-web/tsconfig.json` (edit if `types` needs `vitest/globals`)
- **What:** Add `vitest` (+ `jsdom`, `@testing-library/react`,
  `@testing-library/jest-dom`) to `packages/ui-web/package.json`
  devDependencies at the versions already used elsewhere in the
  workspace (grep for existing usage — e.g. `apps/web/package.json`).
  Add a minimal `vitest.config.ts` with `environment: 'jsdom'` and
  `globals: true`. Add a `test` script to package.json:
  `"test": "vitest run"` so `pnpm test` at the workspace root picks it
  up via turbo.
- **Acceptance:** `pnpm --filter @aira/ui-web test` runs vitest and
  exits 0 (with no tests, "no tests found" is fine). `pnpm typecheck`
  still passes.
- **Pause if:** the workspace vitest version is not consistent across
  packages (mismatched vitest versions across the monorepo — ask
  before pinning a new one).

### Task 2: Build `<Avatar>` primitive in `@aira/ui-web`

- **Files:**
  `packages/ui-web/src/components/avatar.tsx` (new) ·
  `packages/ui-web/src/components/avatar.test.tsx` (new) ·
  `packages/ui-web/src/index.ts` (edit — barrel export) ·
  `packages/ui-web/package.json` (edit — add `./avatar` subpath export)
- **What:** Presentational primitive.
  Props: `{ src: string | null; name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }`.
  Sizes map to `size-8`, `size-10`, `size-14`, `size-16` respectively.
  Default `size='md'`. Renders `<img>` (not `next/image`) when `src` is
  truthy AND no load error has occurred; otherwise renders a `<div>`
  with initials on a `bg-muted text-muted-foreground` background. Add
  `useState` for the load-error flag; `<img onError>` flips it and the
  next render falls back to initials. Private `initials(name)` helper
  uses the `avatar-uploader.tsx:125-130` algorithm exactly. Include the
  `// eslint-disable-next-line @next/next/no-img-element` line above
  the `<img>` with a one-line justification comment. Client component
  (needs `"use client"` for `useState`).
  Barrel export from `src/index.ts`; add `"./avatar": "./src/components/avatar.tsx"` to package.json's `exports` (matches how `button`, `input`, `field` are declared today).
  Unit test file covers: initials for single-word (`"Alice"` → `"AL"`),
  two-word (`"Alice Smith"` → `"AS"`), three-word (`"Alice Beth Smith"` →
  `"AS"`), empty (`""` → `"?"`), and both render branches (src truthy →
  `<img>`; src null → initials div).
- **Acceptance:** `pnpm --filter @aira/ui-web test` passes all cases.
  `pnpm --filter @aira/ui-web typecheck` passes. Barrel imports resolve
  from `@aira/ui-web` and subpath `@aira/ui-web/avatar`.
- **Pause if:** the `useState` approach for onError creates a
  server-vs-client rendering mismatch (should not — the initial state
  is `'ok'`, matching the server-rendered `<img>` branch).

### Task 3: Widen community post shape to carry `author_image`

- **Files:**
  `packages/validators/src/community.ts` (edit) ·
  `packages/services/src/community/service.ts` (edit)
- **What:** In `PostRowSchema` (validators:26-45) and
  `AdminPostRowSchema` (validators:50-66), add
  `author_image: z.string().nullable()`. Zod-inferred `PostRow` and
  `AdminPostRow` types update automatically; no separate type edits
  needed.
  In `service.ts`: add `author_image: user.image` to `POST_SELECT`
  (line 90-105); add `author_image: string | null` to the hand-written
  `DbPostRow` interface at line 34-53; add `author_image: row.author_image`
  to both `toPostRow` (line 55-69) and `toAdminPostRow` (line 71-88)
  mappers.
- **Acceptance:** `pnpm typecheck` passes across the monorepo. Zod parse
  round-trip: fetch `/api/v1/community/posts` from a local dev session;
  response items include `author_image` (null or a URL string). A user
  with an uploaded avatar shows a non-null `author_image` on their own
  post's row.
- **Pause if:** the Zod schema is imported by mobile in a way that would
  fail on the additive change (should not — `PostRowSchema` is not
  `.strict()`, so extra fields are silently accepted; the Zod default is
  strip-unknown for `.object()`).

### Task 4: Migrate `/account` header to `<Avatar>`

- **Files:** `apps/web/src/app/(app)/account/page.tsx` (edit)
- **What:** Replace the initials `<span>` (lines 65-70) with
  `<Avatar size="xl" src={user.image} name={user.name || user.email} />`.
  Delete the local `initial` computation on line 60.
- **Acceptance:** Reproduce the original bug: upload an avatar on
  `/profile`, then visit `/account`. The header now shows the uploaded
  image. Removing the avatar reverts to initials. `pnpm typecheck` +
  `pnpm lint` pass.
- **Pause if:** `user.image` isn't in the `requireUser()` return type —
  should be present via Better Auth's user schema; if it's typed
  as `undefined` instead of nullable, the primitive's `src` prop will
  accept it, so no code change needed, but flag if the types don't line
  up.

### Task 5: Thread `image` into `TopUtilityBar` + swap to `<Avatar>`

- **Files:**
  `apps/web/src/app/(app)/_components/top-utility-bar.tsx` (edit) ·
  `apps/web/src/app/(app)/layout.tsx` (edit)
- **What:** Extend `TopUtilityBarProps` to
  `{ name: string; email: string; image: string | null }`. Delete the
  local `getInitials()` helper. Inside the `<Link href="/account">`,
  swap the initials span for
  `<Avatar size="sm" src={image} name={name || email} className="ring-1 ring-primary/20 transition-opacity hover:opacity-80" />`.
  In `layout.tsx:62`, pass `image: user.image` alongside name/email
  (`<TopUtilityBar user={{ name: user.name, email: user.email, image: user.image ?? null }} />` or spread the parts explicitly).
- **Acceptance:** Desktop top-right avatar shows the uploaded image on
  every authed route; initials for users without one. Hover keeps the
  opacity fade. `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** the `<Link>` composition around `<Avatar>` breaks the
  ring styling — the primitive uses `rounded-full` internally, so
  `className` extras merge via `cn`; if the ring is clipped, wrap it
  or adjust and note it in the run log.

### Task 6: Refactor `AvatarUploader` to use `<Avatar>`

- **Files:** `apps/web/src/features/avatar/components/avatar-uploader.tsx` (edit)
- **What:** Delete the local `<Preview>` component (lines 99-123) and
  the local `initials()` helper (lines 125-130). Replace the
  `<Preview>` callsite with
  `<Avatar size="xl" src={currentUrl} name={userName} className="ring-1 ring-border" />`.
  Keep the surrounding markup (button row, hidden input, error text)
  untouched.
- **Acceptance:** `/profile` renders the uploader identically to today.
  Upload → refresh → the new avatar appears. Remove → falls back to
  initials. `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** none.

### Task 7: Migrate community post-card to `<Avatar>`

- **Files:** `apps/web/src/features/community/components/post-card.tsx` (edit)
- **What:** Replace both initials-circle divs (lines 61-66 and 152-158)
  with `<Avatar size="md" src={post.author_image} name={post.author_name} />`.
  Delete the local `initialsOf()` helper. Note: `size="md"` intentionally
  bumps the visual size from 36px → 40px (locked decision).
- **Acceptance:** Community board renders author images when present.
  `pnpm typecheck` + `pnpm lint` pass. Manual check: at least one post
  shows an author image (upload an avatar, create a post) and at least
  one shows initials (a post from a user with no avatar).
- **Pause if:** `post.author_image` isn't yet on `PostRow` (Task 3 must
  land first — enforced by task order; the pause is a safety net for
  out-of-order execution).

### Task 8: Migrate community post-detail-modal to `<Avatar>`

- **Files:** `apps/web/src/features/community/components/post-detail-modal.tsx` (edit)
- **What:** Replace the initials-circle div (lines 45-50) with
  `<Avatar size="md" src={post.author_image} name={post.author_name} />`.
  Delete the local `initialsOf()` helper.
- **Acceptance:** Clicking a post opens the modal with the author's
  avatar in the header. `pnpm typecheck` + `pnpm lint` pass.
- **Pause if:** same as Task 7.

## Open questions

None. All plan-doc questions resolved above.

## Follow-ups (recorded, not blocking)

- Admin surface migration (AdminTopBar, business-owner-section, admin
  community-table + post-detail-modal). AdminPostRow now carries
  `author_image` — admin surfaces can start rendering it whenever the
  next plan lands.
- `apps/web/src/features/messages/components/conversation-row.tsx` —
  fold into the shared primitive; deletes the last inline `initials()`.
- Mobile app avatar consolidation (`apps/mobile/`) — mirrors this plan
  on Expo. Standalone plan.

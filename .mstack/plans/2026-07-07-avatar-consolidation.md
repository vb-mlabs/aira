# Plan: Avatar rendering consolidation (web)

**Date:** 2026-07-07
**Slug:** 2026-07-07-avatar-consolidation
**Status:** implemented
**Author:** framer@millionlabs.co.uk (via /mlabs-plan)

Traces to `.mstack/fixes/2026-07-07-0957-account-avatar-shows-initials.md`
(escalated from `/mstack-fix`).

---

## Problem

Users who upload a profile image on `/profile` don't see it in most places
in the web app — the `/account` header still shows a name initial in a
coloured circle. The bug is one surface (`/account`), but the survey
uncovered a systemic issue: seven avatar surfaces never read `user.image`
at all, and four near-identical inline `initials()` helpers exist across
the codebase because there's no shared `<Avatar>` primitive in
`packages/ui-web/`.

**Who benefits:** every signed-in end-user who has uploaded (or will
upload) an avatar — currently the upload UI lies about where the image
appears.

**Success:** every avatar surface on the end-user side of the web app
renders `user.image` when set and falls back to consistent-looking
initials when null, backed by one primitive with one source of truth
for the initials rule.

## Scope

**In:**
- New `@aira/ui-web` primitive `<Avatar>` with a size scale
  (`sm`/`md`/`lg`/`xl`) and a single muted fallback style; extendable
  via `className`. Ships with a private `initials()` helper.
- Migrate the following surfaces to the primitive:
  - `apps/web/src/app/(app)/account/page.tsx` — user-visible regression
    that triggered this plan; must render `user.image`.
  - `apps/web/src/app/(app)/_components/top-utility-bar.tsx` — desktop
    utility bar avatar link; extend props to accept `image: string | null`.
  - `apps/web/src/features/avatar/components/avatar-uploader.tsx` —
    replace local `<Preview>` + `initials()` with the primitive.
  - `apps/web/src/features/community/components/post-card.tsx` — both
    layout branches (lines 61-66, 152-158).
  - `apps/web/src/features/community/components/post-detail-modal.tsx`.
- Widen community post data to carry `author_image`:
  - `packages/services/src/community/service.ts` — add
    `author_image: user.image` to `POST_SELECT` and to both `PostRow`
    and `AdminPostRow` interfaces + mappers.
  - `packages/validators/src/community.ts` — add
    `author_image: z.string().nullable()` on both the public and admin
    post schemas.
- Thread `image` through `AppLayout` → `TopUtilityBar` so the desktop
  avatar link works.

**Out (deferred):**
- Admin surfaces (`AdminTopBar`, `business-owner-section`, admin
  `community-table`, admin `post-detail-modal`) — internal-only; will
  ride a follow-up plan so this PR stays tight.
- `apps/web/src/features/messages/components/conversation-row.tsx` —
  already renders images correctly; refactoring it to the primitive is
  pure cleanup and can ride a follow-up.
- Mobile app (`apps/mobile/`) — has its own rendering; mirror in a
  separate plan.
- Marketing surfaces (`components/marketing/*`) — those `rounded-full`
  circles are brand/decorative graphics, not user avatars.
- Comment thread — renders author name without an avatar circle at all;
  adding one is a UX call, not this plan's job.

## Approach

Bottom-up. Build the primitive in `@aira/ui-web` first with its own
subpath export (matches `button`, `input`, `field` — see
`packages/ui-web/src/index.ts`), then migrate one surface per commit. The
service/validator widen is a single commit that must land before the
community post-card / post-detail-modal migrations, because those consume
`author_image` off `PostRow`.

The primitive follows the shape the `<Preview>` component in
`avatar-uploader.tsx:99-123` already validated in production — the only
new decisions are the size scale, the single muted fallback style, and
the `className` extension slot for cases like the top-bar hover ring.
Because the ui-web package is already the shadcn/primitives home for the
web app, this is where a caller (Cursor/Codex/future-you) will naturally
look for it.

Rendering uses a plain `<img>` (not `next/image`) mirroring the
`avatar-uploader.tsx:106` decision: avatars are already server-resized
256×256 JPEGs served by our own `/api/v1/avatar` route, so paying for
the next/image optimization round-trip is wasted work. Keep the
`eslint-disable-next-line @next/next/no-img-element` justification in
the primitive so callers don't rediscover it.

**Alternatives considered:**

- **Copy-and-fix without a shared primitive** — reject. The bug isn't
  one missing conditional; it's a systemic pattern of "just render
  initials" that will regress the moment someone adds another surface.
  A primitive is how you make the correct default the easy default.
- **Radix / shadcn Avatar** — reject. shadcn's `Avatar` component
  brings in `@radix-ui/react-avatar` for a two-line conditional we can
  write ourselves. Adds a dep for zero win. Our fallback rule (initials
  from name) is trivial and already codified in four places.
- **Do the wider service change as a separate PR before this one** —
  reject. The service SELECT widen is one column; splitting it out
  bloats the PR count without changing risk. Kept as a single ordered
  commit inside this stack so the migration order is enforced.

## Data model changes

None. No schema migration.

The community service SELECT widen adds `user.image` (already an
existing column on the `user` table via Better Auth's schema) to the
`POST_SELECT` block and propagates it through the DTOs. This is a
service/validator contract change, not a DB change.

## Files to touch

**New:**
- `packages/ui-web/src/components/avatar.tsx` — the primitive.
- `packages/ui-web/src/components/avatar.test.tsx` — unit tests for
  `initials()` (single name → 2 chars, two names → first+last initials,
  empty → `?`) and for the render-image-vs-fallback branch.

**Edit:**
- `packages/ui-web/src/index.ts` — barrel export + subpath.
- `packages/ui-web/package.json` — add `./avatar` to `exports`.
- `packages/services/src/community/service.ts` — extend `POST_SELECT`,
  `DbPostRow`, `PostRow`, `AdminPostRow`, `toPostRow`, `toAdminPostRow`
  with `author_image`.
- `packages/validators/src/community.ts` — add `author_image` to the
  two exported post schemas (public + admin).
- `apps/web/src/app/(app)/account/page.tsx` — replace inline initial
  span with `<Avatar size="xl" src={user.image} name={user.name || user.email} />`.
- `apps/web/src/app/(app)/_components/top-utility-bar.tsx` — extend
  props to `{ name, email, image: string | null }`; use `<Avatar
  size="sm" src={image} name={name || email} className="ring-1 ring-primary/20 hover:opacity-80" />`
  inside the `<Link>`; delete the local `getInitials()`.
- `apps/web/src/app/(app)/layout.tsx` — pass `image: user.image` to
  `<TopUtilityBar user={...} />`.
- `apps/web/src/features/avatar/components/avatar-uploader.tsx` —
  replace `<Preview>` and the local `initials()` with `<Avatar
  size="xl" src={currentUrl} name={userName} />`.
- `apps/web/src/features/community/components/post-card.tsx` — replace
  both initials-circle divs (lines 61-66 and 152-158) with `<Avatar
  size="sm" src={post.author_image} name={post.author_name} />`; delete
  the local `initialsOf()`.
- `apps/web/src/features/community/components/post-detail-modal.tsx` —
  same swap; delete the local `initialsOf()`.

**Verify (no edit expected, but read to confirm no ripples):**
- `apps/web/src/features/community/types.ts` — check whether `PostRow`
  is re-typed here and needs `author_image` added.
- `apps/web/src/features/admin/community/community-table.tsx` +
  `apps/web/src/features/admin/community/post-detail-modal.tsx` — these
  consume `AdminPostRow`; the widen is additive so they don't need
  updates, but confirm typecheck stays green.

## Edge cases

- **User with no name (only email).** `<Avatar name={user.email} />` —
  `initials()` needs to handle emails: today the helpers do
  `name.trim().split(/\s+/)` which for `"someone@example.com"` returns
  `["someone@example.com"]`, then `slice(0, 2).toUpperCase()` gives
  `"SO"`. That's fine, but the primitive should document that callers
  pass name-or-email fallback themselves — mirroring what the account
  page already does (`user.name || user.email`).
- **Empty/whitespace name.** `initials()` returns `"?"` — keep that.
- **Broken image URL.** The uploader-side pipeline stores a real URL;
  a 404 falls back to the browser's broken-image icon. Not worth an
  `onError` fallback in v1 — no real prod incident indicates this
  happens. Documented as an open question below.
- **Image with query string (cache-busting).** Avatars are served by
  `/api/v1/avatar` — the app doesn't append cache-busters today, so
  `<img key={src}>` isn't needed. If we ever add cache-busting, the
  primitive won't need changes.
- **Legacy `user.image` from a social login.** Better Auth can populate
  `user.image` from an OAuth provider (e.g. Google). Those URLs are
  external — using them directly is fine (public HTTPS), but the
  primitive should not assume same-origin.
- **`author_image` null on old posts.** Not a schema migration concern
  because we're widening the SELECT to read from a nullable column that
  already exists on the joined `user` row. Posts by users who never
  uploaded return `null` → fallback to initials. Expected.

## Acceptance criteria

- [ ] `<Avatar>` exported from `@aira/ui-web/avatar` with props
      `{ src: string | null; name: string; size?: 'sm'|'md'|'lg'|'xl';
      className?: string }`.
- [ ] Unit tests cover: initials for single-word name, two-word name,
      empty name (`?`), and the `src` truthy vs null branch.
- [ ] `/account` page header renders the uploaded image when
      `user.image` is set. Manual repro: upload avatar on `/profile` →
      visit `/account` → see the image (not initials).
- [ ] Desktop `TopUtilityBar` renders the image in the top-right link.
- [ ] Community post cards + detail modal render the author's image
      when they have one, else initials. `/api/v1/community/posts`
      response now includes `author_image` on each item.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm lint` passes (no new eslint-disable additions outside the
      primitive's justified `no-img-element`).
- [ ] `pnpm test` passes.
- [ ] `avatar-uploader.tsx`, `post-card.tsx`,
      `post-detail-modal.tsx` no longer contain local `initials()` /
      `initialsOf()` helpers.
- [ ] No mobile files under `apps/mobile/` are modified.

## Open questions

For `/mlabs-review` to resolve before implementation.

- **Ring / hover treatment.** The top-utility-bar avatar today has
  `hover:opacity-80` and no ring; the account header has no ring; the
  uploader preview has `ring-1 ring-border`. Do we standardise a ring
  in the primitive (opinionated) or leave it as caller-side
  `className`? Current plan says caller-side.
- **Broken-image fallback.** Add an `onError` → swap to initials in
  the primitive, or defer? Cheap to add; do it if the review agrees.
- **`author_image` on admin surfaces.** The service widen means
  `AdminPostRow` also carries `author_image`. Do we render it in the
  admin community table now for consistency, or genuinely leave admin
  UI for a follow-up? Plan says follow-up.
- **Messages conversation-row.** Its working `<Avatar>` still holds a
  local `initials()`. Leave it (per user's scope pick) or fold it in
  as a cleanup commit at the end of this stack? Plan says leave; add
  to TODOS.

## Follow-ups (to append after review)

- Second plan: admin avatar surfaces (`AdminTopBar`,
  `business-owner-section`, admin `community-table` + modal).
- Second plan: mobile avatar consolidation (`apps/mobile/`).
- Cleanup task: refactor `conversation-row.tsx` to use the shared
  primitive (delete the last inline `initials()` helper).

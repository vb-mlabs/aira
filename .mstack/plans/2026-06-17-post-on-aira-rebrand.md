# Plan: Post on AIRA — broaden Community Board + add contact details

**Date:** 2026-06-17
**Slug:** 2026-06-17-post-on-aira-rebrand
**Status:** implemented
**Author:** Claude (mlabs-plan)

---

## Problem

The Community Board today (F20) is framed as "Ask the community" — a place
for referrals only. Real user behaviour is broader: people want to post "I
have a room for rent", "Selling a kids' bike", "Offering tutoring on
weekends", not just questions. The current copy actively pushes broader
intents away, and respondents can only reach an author through the
in-app "I can help" funnel — there's no fast "call me / email me" path.

**Success:** A signed-in AIRA user can post any kind of community
classified — housing, items, services, asks — with an optional phone
and/or email so neighbours can reach them directly. Copy across the
board, dialog, board page, and notifications calls this "Post on AIRA"
instead of "Ask the community."

## Scope

**In:**
- DB migration: `community_post.phone TEXT NULL`, `community_post.email TEXT NULL`.
- Validators: add `phone`/`email` to `CreatePostInputSchema`,
  `EditPostInputSchema`, `PostRowSchema`, `AdminPostRowSchema` (all
  optional/nullable).
- Service: thread `phone`/`email` through `createPost`, `getPost`, the
  admin `editPost`, and the `toPostRow` / `toAdminPostRow` mappers.
- Web copy: rename "Ask the community" → "Post on AIRA" everywhere on
  `/community` (page hero, dialog title/description, trigger label,
  empty state, search aria-label, comments inside `post-form.tsx`).
- Dialog form fields:
  - Post Title (required, existing 120-char cap)
  - Post Description (optional, existing 1000-char cap)
  - Phone (optional, ≤ 30 chars trimmed)
  - Email (optional, Zod email or empty)
- Post card + detail modal show a "Contact author" affordance when at
  least one contact field is present (tel:/mailto: links to any signed-in
  viewer per locked decision).
- Rename "I can help" → "I'm interested" wherever it appears in
  `InterestButton`, notification subjects/bodies, and email templates.
- Admin: surface phone/email on the post detail modal + the edit modal.
- Notification + email copy refresh — current language calls them
  "requests" and "asks"; switch to neutral "posts."

**Out (deferred):**
- Post categorization / `post_type` enum (locked: single freeform feed).
- Strict E.164 phone validation (locked: lenient trim ≤ 30).
- libphonenumber-js or any new top-level dep.
- Mobile parity — `apps/mobile` has no community surface yet; the shared
  validators stay compatible so future mobile work is unblocked.
- Repurposing the existing `audit_log` `post_*` action codes — those
  references stay even though the user-facing language changes.
- Renaming the DB table (`community_post` stays; the page URL stays
  `/community` to preserve any external links).
- Loosening the 1-active-post limit or the moderation flow.

## Approach

This is a thin extension of the existing F20 surface — schema additions
+ copy churn, no architectural change. The data model already routes
through `defineOperation` and the shared `@aira/validators/community`
contract, so a single coordinated diff across DB → validators →
service → web copy lands the rebrand cleanly. Mobile imports the same
validators but doesn't render the surface yet, so the only mobile-side
risk is that the validators must stay backward-compatible (we accept
omitted phone/email as `undefined`, exactly mirroring the existing `body`
handling).

Contact visibility is "any signed-in viewer" per the locked decision.
That removes the need for a server-side authorization branch — the
public `PostRowSchema` simply gains `phone`/`email` and the row is
projected as-is for any caller that already reaches `/api/v1/community`.
On the card we render a tiny "Contact" affordance (icon-only) and on
the detail modal we render `tel:` / `mailto:` rows below the body. The
existing card density is preserved; the affordance only renders when at
least one contact is present.

The "I'm interested" rename is also pure copy — the
`postInterest` table, the `addInterestOp`, the audit codes, and the
denormalized `interest_count` all stay. Only user-facing strings in
`InterestButton`, the post-author notifications, the post-author
emails, and a few aria-labels need updating.

For phone format, we go lenient: `z.string().trim().max(30)` matches
how `businesses.phone` is stored today (loose). The locked answer
explicitly rejected the libphonenumber-js dep. Email uses Zod's
`z.string().email()` so an obvious typo fails server-side.

**Alternatives considered:**

- **Add a `post_type` enum (Housing/Items/Services/Asks).** Rejected at
  the question gate — keeps the plan tight, ships the rebrand without
  pulling in admin filters, copy variants per type, and migration of
  existing rows. Easy to add later as a follow-up.
- **Gate contact reveal behind "I'm interested."** Rejected at the
  question gate — friction-heavy for a freeform classifieds use case,
  defeats the user's stated wedge of "let neighbours reach the author
  directly." Privacy concern is partially mitigated by: contacts are
  optional, only signed-in users see the board, and admin moderation
  remains the gate before any post goes live.
- **Strict E.164 phone validation.** Rejected at the question gate —
  inconsistent with the rest of the app (businesses use a loose string),
  and a UX hurdle for users who paste "(404) 555-1212".

## Data model changes

**Migration** (`packages/db/drizzle/migrations/0028_community_post_contact.sql`,
generated via `pnpm db:generate`):

```sql
ALTER TABLE "community_post"
  ADD COLUMN "phone" TEXT NULL,
  ADD COLUMN "email" TEXT NULL;
```

Both nullable; no backfill needed. No new indexes — the columns are
not queried, only projected.

Schema file `packages/db/src/schema/community-post.ts` adds the two
fields in line with `body`.

## Files to touch

**New:**
- `packages/db/drizzle/migrations/0028_community_post_contact.sql` — generated.

**Edit:**
- `packages/db/src/schema/community-post.ts` — add `phone`, `email` columns.
- `packages/validators/src/community.ts`:
  - `PostRowSchema` — add `phone: z.string().nullable()`,
    `email: z.string().nullable()`.
  - `AdminPostRowSchema` — same.
  - `CreatePostInputSchema` — add `phone: z.string().trim().max(30).optional()`,
    `email: z.string().trim().email().optional()`.
  - `EditPostInputSchema` — add same two as `.nullable().optional()` so an
    admin can clear them; extend the `.refine(...)` to include the new
    fields.
- `packages/services/src/community/service.ts`:
  - `DbPostRow` / `toPostRow` / `toAdminPostRow` — pass through `phone`,
    `email`.
  - Base `SELECT` projections — add the two columns.
  - `createPost` — write `phone` and `email` from `args` (empty string → null).
  - `editPost` (admin) — thread the two fields, mirroring how `body` is
    handled (explicit `null` clears, `undefined` skips).
- `apps/web/src/features/community/components/post-form.tsx`:
  - Trigger label default: `"Ask the community"` → `"Post on AIRA"`.
  - Dialog title / description / button copy / comments.
  - Add two `<Input>` rows for phone + email below the body field with
    helper text "Optional — visible to other signed-in members."
  - Wire to `apiClient.post(...)` with the new fields (omit when blank).
- `apps/web/src/features/community/components/post-list.tsx` — empty state
  copy + search aria-label.
- `apps/web/src/features/community/components/post-card.tsx` — add a small
  "Contact" pill when `post.phone || post.email` is present.
- `apps/web/src/features/community/components/post-detail-modal.tsx` —
  render `tel:` / `mailto:` rows under the body.
- `apps/web/src/features/community/components/interest-button.tsx` —
  rename label to "I'm interested" + aria-label updates.
- `apps/web/src/app/(app)/community/page.tsx` — hero copy.
- `apps/web/src/app/(app)/community/[id]/page.tsx` — any copy churn.
- `apps/web/src/features/admin/community/edit-post-modal.tsx` — add
  phone + email fields.
- `apps/web/src/features/admin/community/post-detail-modal.tsx` — show
  contact fields on the admin row.
- `apps/web/src/features/admin/community/community-table.tsx` — minor
  column header copy if any "request" wording remains.
- `packages/email/src/templates/notification.tsx` (or whatever
  template the community interest flow uses) — copy refresh for
  subject + body ("Someone is interested in your post" instead of
  "Someone can help with your request"). Determine exact path by
  grepping for the post-interest email build site.
- `packages/services/src/community/service.ts` — in-app notification
  body strings — replace "request" with "post."

## Edge cases

- **Empty-string contact fields submitted by the form.** Treat as
  `undefined`/null at the validator boundary so we don't store empty
  strings. The form should send `phone: phone.trim() || undefined`.
- **Admin clears a contact field on edit.** `EditPostInputSchema`
  accepts `null` to mean "clear" (mirrors how `body` is handled
  today). An empty string is rejected for the same defensive reason.
- **Invalid email pasted into the new field.** Zod `email()` returns
  the standard error, the existing `ApiError` flow surfaces the
  message inline.
- **Phone with a `+` and country code longer than 30 chars** — extremely
  uncommon, but `max(30)` will reject. We accept that and surface
  the standard "Too long" inline.
- **Posts created before this migration.** Both columns nullable, so
  existing rows have `phone = NULL, email = NULL` — the card simply
  doesn't render the contact pill, identical to today.
- **`tel:` / `mailto:` injection.** Both go through Next's `<a href>`;
  Zod email validation + the 30-char phone cap prevent meaningful
  abuse. We still URL-encode the phone string defensively before
  embedding (`encodeURIComponent`).
- **Notification + email backlog for existing pending posts.** Copy
  refresh is server-rendered each time, so the moment the templates
  ship the language updates everywhere — no migration needed.
- **`audit_log` rows with `action: "community_post_created"` etc.**
  Action codes stay — only the user-facing copy changes. Keeping the
  codes preserves historical analytics.
- **The 1-active-post limit is preserved.** A user who has an
  active "room for rent" post and tries to post "looking for a
  pediatrician" still gets the 409.
- **Mobile clients reading the new `phone`/`email` fields.** Both
  optional/nullable in the validator — old mobile builds (if any
  ever ship a community surface) won't break because they'd
  destructure and ignore unknown keys.

## Acceptance criteria

- [ ] DB migration applied; `community_post.phone` and
      `community_post.email` columns exist, both nullable.
- [ ] `CreatePostInputSchema`, `EditPostInputSchema`, `PostRowSchema`,
      `AdminPostRowSchema` accept the new fields with the agreed shape.
- [ ] Submitting the form with title + body + phone + email creates a
      post with all four fields persisted.
- [ ] Submitting with only title (no body, no contact) still works,
      identical to today.
- [ ] Submitting with an invalid email surfaces the inline error
      below the email field.
- [ ] The `/community` board renders a "Contact" affordance on any
      card with at least one contact field, hidden otherwise.
- [ ] The `/community/[id]` detail (and the inline modal) renders
      `tel:` and/or `mailto:` rows when the corresponding field is set.
- [ ] "Ask the community" no longer appears in any web copy
      (`apps/web/src/**`); searches return zero matches.
- [ ] The "I can help" button label reads "I'm interested" across the
      card, detail modal, and notification + email templates. Existing
      `post_interest` DB rows and the `addInterestOp` are untouched.
- [ ] Admin can view and edit phone/email on any post.
- [ ] The 1-active-post limit still triggers when expected.
- [ ] `pnpm typecheck`, `pnpm lint`, and the community-related Vitest
      suites pass.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- Should the **post card** show the actual phone/email or just a
  generic "Contact" pill that expands on the detail view? Trade-off:
  density vs. friction. Default in this plan: a small icon-only pill
  on the card, full `tel:`/`mailto:` rows on the detail. Reviewer to
  confirm.
- Confirm the exact email-template path to update — the plan calls out
  `packages/email/src/templates/notification.tsx` but `mlabs-review`
  should grep the post-interest send site to double-check.
- Should we also rename the page header `"Real people. Real asks.
  Trusted leads."` on `/community/page.tsx`? It's marketing copy that
  could stay if we want continuity. Plan leans yes (it conflicts with
  the new freeform framing), but reviewer can lock either way.
- The hero strapline currently says "Community Requests" — change to
  "Community Posts" or just drop the eyebrow? Default in this plan:
  change to "Community Posts."

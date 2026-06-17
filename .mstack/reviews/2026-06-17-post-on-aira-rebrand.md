# Review: Post on AIRA — broaden Community Board + add contact details

**Date:** 2026-06-17
**Slug:** 2026-06-17-post-on-aira-rebrand
**Plan reviewed:** [2026-06-17-post-on-aira-rebrand.md](../plans/2026-06-17-post-on-aira-rebrand.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** Claude (mlabs-review)

---

## Summary

The plan is sound and ships with a thin diff (two nullable columns +
copy). Review expanded scope in three places the plan missed:

1. The `community.post_edited` audit-meta needs widening to track
   phone/email edits so the audit trail stays complete.
2. There's no community-specific email template — the post-interest
   email already uses neutral language via `sendNotificationEmail` in
   `apps/web/src/server/operations/community.ts:99`, so we **drop the
   email-template touch** from the plan.
3. Several copy threads the plan only mentioned in passing are
   pinned to specific files: the in-app notification card
   (`notification-item.tsx:103`), service-layer error messages, the
   marketing hero strap, and the form placeholders.

Two technical sharpenings: use Zod 4 syntax (`z.email()`, this repo's
convention — see `packages/validators/src/auth.ts:17`), and pass raw
validated values into `tel:`/`mailto:` hrefs (no `encodeURIComponent`,
which would mangle real phone numbers).

## Findings

### Blockers (must fix before /mlabs-code)

- **Audit meta narrows the edit surface to `"title" | "body"`.**
  `packages/validators/src/audit-meta.ts:96-109` defines
  `community.post_edited` with `fields: Array<"title" | "body">` plus
  per-field before/after pairs. Once the admin edit modal accepts
  phone/email, those edits would either fall out of the audit trail
  (silent contact changes) or fail the audit meta type-check. **Decision
  taken:** widen the union to `Array<"title" | "body" | "phone" | "email">`
  and add `phone`/`email` before/after pairs. Implementation captured
  in Task 4.

- **Plan uses Zod 3 syntax `z.string().email()`.** This repo is on Zod 4
  — confirmed by `packages/validators/src/auth.ts:17` (`z.email("Enter a
  valid email")`). **Decision taken:** all new email validators use
  `z.email()`. Tasks 2 and 4 reflect this.

### Concerns (raised, decided, recorded)

- **Concern:** Plan called out `packages/email/src/templates/notification.tsx`
  for a copy refresh, but no community-specific email template
  exists. The post-interest email is built inline in
  `apps/web/src/server/operations/community.ts:97-103` with the subject
  `"Someone responded to your post"` — already neutral.
  **Decision:** Drop the email-template touch from the scope. No
  email-side change needed. Reviewer confirmed with the user.

- **Concern:** The in-app notification rendering at
  `apps/web/src/features/notifications/components/notification-item.tsx:103`
  reads `${responder_name} can help with your request`. Plan only
  said "in-app notification body strings" generically.
  **Decision:** Update to "is interested in your post." File pinned in
  Task 8.

- **Concern:** Service-layer error messages
  (`packages/services/src/community/service.ts:228-229`, `:367`, `:374`,
  `:393`) still say "request." User-facing 409/400 strings.
  **Decision:** Rename "request" → "post" in those four sites. Pinned in
  Task 3.

- **Concern:** Marketing hero strap on `/community/page.tsx:38` reads
  `"Real people. Real asks. Trusted leads."` — explicit "asks"
  framing.
  **Decision:** Replace with a broader strap (e.g. "Real people. Real
  posts. Trusted neighbours.") and switch the eyebrow `"Community
  Requests"` → `"Community Posts"`. Pinned in Task 7.

- **Concern:** Form placeholders in `post-form.tsx:112` ("Looking for a
  pediatrician near Alpharetta…") and `:134` ("Aetna PPO, weekend
  availability…") read as ask-flavoured.
  **Decision:** Replace with broader examples that span asks +
  classifieds (e.g. "Room for rent in Sandy Springs / Looking for a
  weekend tutor / Selling a kids' bike"). Pinned in Task 6.

- **Concern:** Plan recommended `encodeURIComponent` on phone before
  the `tel:` href. That would mangle valid numbers — `+1 (404)
  555-1212` → `%2B1%20%28404%29%20555-1212` which most dialers reject.
  **Decision:** Pass raw validated values. Phone is `.trim().max(30)`
  server-side, email is Zod-validated; React already escapes attribute
  values so there's no injection vector. Pinned in Tasks 6 & 9.

- **Concern:** `EditPostInputSchema` `.refine()` currently requires
  `title !== undefined || body !== undefined`. Adding phone/email to
  the edit surface means the refine must also count those fields, else
  a contact-only edit is rejected with "Nothing to update."
  **Decision:** Widen the predicate to include phone/email. Pinned in
  Task 2.

- **Concern:** Plan's "card contact pill" copy — show a generic icon
  pill on the card and full `tel:`/`mailto:` rows on the detail. The
  plan flagged this as open. **Decision:** Lock the icon-only pill on
  the card, full rows in the detail modal. Density wins on the card;
  the detail is where reach-out happens.

### Suggestions (taken or deferred)

- **Suggestion:** The mobile app has no community surface, so mobile is
  not in scope. Validators stay backward-compatible (all new fields
  optional/nullable). **Taken.** No mobile work in the task list.

- **Suggestion:** Keep the `kind: "post_interest"` notification-body
  identifier even though the user-facing label rebrands to "interested
  in your post." Renaming the discriminator would break in-flight
  notifications in the DB. **Taken.** The body-kind string stays.

- **Suggestion:** Defer broadening `interest_count`-based microcopy
  beyond the bare minimum ("1 neighbour offered to help" → "1
  neighbour is interested"). It crops up in `PostCard`, the public
  detail modal, the `/community/[id]` page, and the InterestButton
  count. **Taken** — captured in Task 8.

- **Suggestion:** Add `pnpm db:studio` + manual `INSERT … RETURNING`
  smoke-test step to the QA list once shipped. **Deferred** to the
  separate `/mlabs-qa` run after `/mlabs-code` lands.

## Decisions locked

Net new decisions from this review:

- Audit meta `community.post_edited.fields` widens to include
  `"phone" | "email"`; per-field before/after pairs added.
- Drop the email-template touch — generic template + neutral subject
  already in place.
- `z.email(message)` (Zod 4) replaces the plan's `z.string().email()`.
- Pass raw validated phone/email into `tel:`/`mailto:` hrefs; no
  `encodeURIComponent`.
- `EditPostInputSchema.refine()` widens to count phone/email.
- Icon-only contact pill on cards, full `tel:`/`mailto:` rows on
  detail.
- Form placeholders, marketing strap, in-app notification copy,
  service error strings — all in scope, files pinned per task below.
- Notification body kind discriminator (`"post_interest"`) stays.

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: DB schema + migration for `community_post.phone` + `community_post.email`

- **Files:** `packages/db/src/schema/community-post.ts` (edit) ·
  `packages/db/drizzle/migrations/0028_community_post_contact.sql` (new,
  generated)
- **What:** Add `phone: text("phone")` and `email: text("email")` to
  the `communityPost` table (both nullable). Generate the migration
  via `pnpm db:generate`, then apply with `pnpm db:migrate`. No
  backfill, no new indexes.
- **Acceptance:** Migration file present and applied; `\d community_post`
  in psql shows both columns as TEXT NULL; `pnpm typecheck` passes.
- **Pause if:** the next migration number isn't `0028` (check
  `packages/db/drizzle/migrations/` first) — adjust naming and ask
  before continuing. **Pause if** the generated migration includes
  anything beyond the two `ADD COLUMN`s (drift from a different
  schema edit) — investigate before applying.

### Task 2: Validators — add phone/email to community schemas

- **Files:** `packages/validators/src/community.ts` (edit)
- **What:**
  - `PostRowSchema`: append `phone: z.string().nullable()`,
    `email: z.string().nullable()`.
  - `AdminPostRowSchema`: same.
  - `CreatePostInputSchema`: append
    `phone: z.string().trim().max(30).optional()` and
    `email: z.email("Enter a valid email").optional()`. Keep
    `.strict()`.
  - `EditPostInputSchema`: append
    `phone: z.string().trim().max(30).nullable().optional()` and
    `email: z.union([z.email("Enter a valid email"), z.null()]).optional()`.
    Widen the `.refine(...)` predicate to:
    `(v) => v.title !== undefined || v.body !== undefined || v.phone !== undefined || v.email !== undefined`.
- **Acceptance:** `pnpm --filter @aira/validators typecheck` passes.
  Running `pnpm test` in `packages/validators` (if any) still passes.
  Manual parse trial in a scratch file: empty input rejected; valid
  input with only contact fields accepted by `EditPostInputSchema`.
- **Pause if:** Zod 4 `z.email()` isn't available in the installed Zod
  version (check `packages/validators/package.json`). If unavailable,
  fall back to `z.string().email(...)` and flag in the run log.

### Task 3: Service — thread phone/email through createPost, getPost, mappers; rename "request" → "post" in error strings

- **Files:** `packages/services/src/community/service.ts` (edit)
- **What:**
  - Add `phone: string | null` and `email: string | null` to
    `DbPostRow`. Pass them through `toPostRow` and `toAdminPostRow`.
  - Extend the base `POST_SELECT` projection to include the two new
    columns from `communityPost`.
  - `CreatePostArgs`: add `phone?: string | null`, `email?: string | null`.
  - `createPost`: write `phone: normalise(args.phone)` and `email:
    normalise(args.email)` where `normalise` returns `null` for empty
    string / undefined. Mirror the pattern already used for `body`.
  - Rename "request" → "post" in user-facing messages at lines
    228, 229, 367, 374, 393. Exact replacements:
    - L228: "You already have a request awaiting moderation." →
      "You already have a post awaiting moderation."
    - L229: "You already have an active request. Wait for it to
      expire or be resolved before posting another." → "You already
      have an active post. Wait for it to expire or be resolved before
      posting another."
    - L367: "This request is no longer accepting offers to help." →
      "This post is no longer accepting interest."
    - L374: "You can't offer to help on your own request." → "You
      can't show interest in your own post."
    - L393: "You've already offered to help on this request." → "You've
      already shown interest in this post."
- **Acceptance:** `pnpm --filter @aira/services typecheck` passes;
  `pnpm test --filter @aira/services` passes; manual call to
  `createPost` with a phone string persists the value; manual call
  with an undefined phone leaves the column NULL.
- **Pause if:** any existing test asserts the exact "request" wording
  on a thrown ApiError message (would force a separate decision).

### Task 4: Audit meta + editPost service — phone/email editing + audit coverage

- **Files:** `packages/validators/src/audit-meta.ts` (edit) ·
  `packages/services/src/community/service.ts` (edit)
- **What:**
  - In `audit-meta.ts`, widen
    `community.post_edited.fields` from
    `Array<"title" | "body">` to `Array<"title" | "body" | "phone" | "email">`.
    Append optional per-field pairs:
    `phone?: { from: string | null; to: string | null }`
    `email?: { from: string | null; to: string | null }`.
  - In `service.ts:editPost`, extend the `args` signature to accept
    `phone?: string | null`, `email?: string | null`. Mirror the
    `body` handling: undefined skips, null clears, non-empty string
    persists, empty string → null.
  - Extend the `fields` array, `meta`, and SELECT projection
    accordingly. Audit row written inside the same transaction.
- **Acceptance:** `pnpm typecheck` passes (audit-meta is referenced
  across packages). Edit a post via admin path with a phone-only
  change: audit row in `audit_log` has `fields: ["phone"]` with the
  before/after pair populated and the post's `phone` column updated.
- **Pause if:** any audit-consuming code (e.g. an audit log UI
  renderer) hard-codes the old union — handle gracefully or surface
  for fix.

### Task 5: Public post-form — rename, broaden, add contact fields

- **Files:** `apps/web/src/features/community/components/post-form.tsx` (edit)
- **What:**
  - Default `triggerLabel` → `"Post on AIRA"`. Update the prop's JSDoc
    accordingly.
  - Dialog title → `"Post on AIRA"`; description →
    `"Share something with the community — an offer, a request, an
    item, anything. A moderator will review before it goes live."`
  - Title field label: `"Title"` (was "What do you need?").
    Placeholder: `"Room for rent in Sandy Springs, weekend tutoring,
    looking for a paediatrician…"`.
  - Body field label: `"Description (optional)"` (was "Any extra
    context?"). Placeholder: `"Any extra detail neighbours should
    know — price, availability, what you're looking for…"`.
  - Add two new optional `<Input>` fields below body:
    - Phone — `<Input type="tel" maxLength={30} value={phone}
      onChange={…}>`; helper text `"Optional — visible to other
      signed-in members."`
    - Email — `<Input type="email" value={email} onChange={…}>`; same
      helper text.
  - Submit button label: `"Post"` (was "Post request"). Loading:
    `"Posting…"` (unchanged).
  - On submit, send `phone: phone.trim() || undefined`, `email:
    email.trim() || undefined`. Trim title + body unchanged.
  - Replace any remaining "request" / "Ask the community" mentions in
    the file's comments.
- **Acceptance:** Opening the dialog shows the new title/description,
  4 fields total, with the phone + email fields persisting on submit
  (verify via DB query). Submitting empty contact fields persists
  NULL. Submitting an invalid email surfaces the Zod error inline.
- **Pause if:** the `<Input type="email">` HTML5 validator + our Zod
  validator double-fire and produce a confusing error UX — pause to
  confirm whether to suppress the browser-side validator
  (`noValidate` on the form).

### Task 6: Public post-card + post-detail-modal — contact affordances

- **Files:** `apps/web/src/features/community/components/post-card.tsx`
  (edit) ·
  `apps/web/src/features/community/components/post-detail-modal.tsx` (edit)
- **What:**
  - **PostCard:** When `post.phone || post.email`, render a small
    icon-only pill (e.g. `<Phone className="size-3" aria-hidden />`)
    next to the `StatusPill` with `aria-label="Contact details
    available"`. No `tel:`/`mailto:` here — keep card density.
  - **PostDetailModal:** Below the body block, render a `Contact`
    section iff at least one of phone/email is non-null:
    - Phone: `<a href={`tel:${post.phone}`}>{post.phone}</a>` with a
      `<Phone />` icon.
    - Email: `<a href={`mailto:${post.email}`}>{post.email}</a>` with
      a `<Mail />` icon.
    - Use raw validated values (no `encodeURIComponent`).
  - Rename "I can help" → "I'm interested" microcopy used by the
    modal narration (e.g. "1 neighbour offered to help" →
    "1 neighbour interested"). Drop any "offered to help" phrasing.
- **Acceptance:** Card with at least one contact field shows the
  pill; card without contacts is visually identical to today. Detail
  modal opens phone in the OS dialer + email in the default mail
  client when tapped. Author-side count narration reads "interested"
  rather than "offered to help."
- **Pause if:** the existing `Phone` import name conflicts with
  another import in the file — alias as needed and flag.

### Task 7: Public board page + standalone detail page — copy

- **Files:** `apps/web/src/app/(app)/community/page.tsx` (edit) ·
  `apps/web/src/app/(app)/community/[id]/page.tsx` (edit) ·
  `apps/web/src/features/community/components/post-list.tsx` (edit)
- **What:**
  - `/community/page.tsx`:
    - Eyebrow `"Community Requests"` → `"Community Posts"`.
    - Hero h1 `"Real people. Real asks. Trusted leads."` →
      `"Real neighbours. Real posts. Trusted leads."` (or similar —
      reviewer recommended; keep emphasis on the last clause).
    - Sub-paragraph copy: drop "Ask the community for a referral" —
      replace with `"Post anything — a room for rent, a kids' bike to
      sell, a contractor you trust, or a question you'd ask a
      neighbour."` (or similar, ~2 lines).
    - Update `metadata.title` if needed (currently "Community" —
      keep).
  - `/community/[id]/page.tsx`:
    - L1 comment: "single community request" → "single community post."
    - L4 comment: "I can help" → "I'm interested."
    - L75 h2 `"Neighbours offering to help"` → `"Neighbours who are
      interested"`.
    - L86 `"When someone taps 'I can help', you'll see their name…"`
      → `"When someone taps 'I'm interested', you'll see their name…"`.
    - L116 fallback `"No note attached — just wanted you to know they
      can help."` → `"No note attached — just letting you know they're
      interested."`.
  - `PostList`:
    - Search placeholder `"Search requests (pediatrician,
      caterer, tax advisor…)"` → `"Search posts (room for rent,
      caterer, sale, referral…)"`.
    - aria-label `"Search community requests"` → `"Search community
      posts"`.
    - Empty state titles: `"No requests match that search"` →
      `"No posts match that search"`; `"Be the first to ask the
      community"` → `"Be the first to post on AIRA"`.
    - Empty state description referencing `"Tap 'Ask the community'
      above…"` → `"Tap 'Post on AIRA' above to share a post — a
      moderator will review it before it goes live."`.
    - Pagination `"request{data.total === 1 ? '' : 's'}"` → `"post{…
      }s"`.
- **Acceptance:** Grep for `"Ask the community"` in
  `apps/web/src/**` returns zero matches. Grep for `"requests"` in
  user-facing strings in those files returns zero (excluding code
  comments where "request" refers to HTTP requests, etc.).
- **Pause if:** the literal copy proposals conflict with anything in
  `packages/config/src/brand.ts` (e.g. a brand-locked tagline) —
  pause and ask.

### Task 8: InterestButton + in-app notification — "interested" rename

- **Files:** `apps/web/src/features/community/components/interest-button.tsx`
  (edit) ·
  `apps/web/src/features/notifications/components/notification-item.tsx`
  (edit)
- **What:**
  - **InterestButton:**
    - Inactive label: `"I can help"` → `"I'm interested"`. Active
      label: `"Offered to help"` → `"Interested"`.
    - Adjust icon choice: keep `Heart` + `HeartHandshake` (still
      reads as warm interest) OR swap to a single `Sparkles` style —
      keep `Heart` / `HeartHandshake` to avoid lucide churn.
    - Count narrations: `"Be the first to offer help"` → `"Be the
      first to show interest"`; `"1 neighbour has offered to help"` →
      `"1 neighbour is interested"`; `"${count} neighbours have
      offered to help"` → `"${count} neighbours are interested"`.
    - Update the file header comment.
  - **notification-item.tsx:** rendered title for `case "post_interest"`
    on line 103: `"${responder_name} can help with your request"` →
    `"${responder_name} is interested in your post"`. Body fallback
    `Re: ${post_title}` unchanged.
- **Acceptance:** Active + inactive states show the new labels.
  Notification bell renders the new title on existing rows
  (rendering is dynamic from `body` payload so no migration needed).
- **Pause if:** there's a Vitest snapshot of `InterestButton` (likely
  no — no Vitest snapshots in repo) — update if found.

### Task 9: Admin community surfaces — edit modal + detail modal + table

- **Files:** `apps/web/src/features/admin/community/edit-post-modal.tsx`
  (edit) ·
  `apps/web/src/features/admin/community/post-detail-modal.tsx` (edit) ·
  `apps/web/src/features/admin/community/community-table.tsx` (edit)
- **What:**
  - **edit-post-modal.tsx:**
    - Dialog title `"Edit request"` → `"Edit post"`.
    - Local state: add `phone` and `email` initialized from
      `post.phone ?? ""` and `post.email ?? ""`.
    - Add change-detection (`phoneChanged`, `emailChanged`) mirroring
      `bodyChanged`.
    - Widen `canSave` predicate: include phone/email changed.
    - Add two `<Input>` fields below body with same UX as the public
      form (phone `type="tel"` max 30, email `type="email"`).
    - Build the patch payload to include `phone`/`email` (null clears,
      non-empty string persists).
    - Update inline `type` annotation for `update` to include
      `phone?` and `email?`.
  - **post-detail-modal.tsx:** below the body, render phone + email
    rows with `tel:`/`mailto:` links when non-null. Read-only.
  - **community-table.tsx:** copy: `"No requests yet"` → `"No posts
    yet"`; `"When a community member submits a request…"` → `"When a
    community member submits a post…"`; `"Approve a pending request
    to see it land here."` → `"Approve a pending post to see it land
    here."`. Audit any other "request" mentions in the file.
- **Acceptance:** Admin edit modal can flip a post's phone/email
  independently of title/body, save succeeds, and the audit row in
  `audit_log` captures `fields: ["phone"]` / `["email"]` per Task 4.
  Detail modal shows contact rows when present, omits the section
  otherwise.
- **Pause if:** admin-side Zod parse errors surface differently than
  public-side (look at `apiClient.patch` error path) — handle the
  inline error display uniformly.

### Task 10: Verification pass

- **Files:** none
- **What:** Run the full check suite:
  - `pnpm typecheck` — all 10 packages green.
  - `pnpm lint` — green.
  - `pnpm test` — all Vitest suites pass.
  - Spot-check: `grep -RIn "Ask the community" apps/web/src/` returns
    zero matches; `grep -RIn "I can help" apps/web/src/` returns zero
    matches.
  - Manual smoke: start `pnpm dev`, post a community post with title +
    phone + email; confirm card pill renders; open detail modal +
    confirm `tel:` / `mailto:` links work; log in as a second user +
    confirm the "I'm interested" button + notification + email all
    use the new wording; log in as admin, edit phone-only on the same
    post, save, confirm audit row.
- **Acceptance:** All four `pnpm` commands green; the four grep
  spot-checks return zero matches; the manual smoke flow described
  above succeeds end-to-end.
- **Pause if:** any check fails — surface the specific failure
  rather than guessing a fix.

## Open questions

Nothing for `/mlabs-code` to escalate. All blockers, copy decisions,
and edge cases were resolved during this review.

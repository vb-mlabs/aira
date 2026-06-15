# Review: Account sub-pages — Notifications, Privacy & Security, Terms, About

**Date:** 2026-06-15
**Slug:** account-sub-pages
**Plan reviewed:** [2026-06-15-account-sub-pages.md](../plans/2026-06-15-account-sub-pages.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** mlabs-review

---

## Summary

Plan is ready to implement after three meaningful corrections: (1) email-send
moves out of the service into the operation handler so `packages/services`
stays pure (matches existing cron / waitlist / auth-callback pattern); (2)
the two proposed new email templates collapse into reuse of the existing
generic `sendNotificationEmail({ title, body, ctaLabel, ctaUrl })` at
`packages/email/src/templates.tsx:125`; (3) error logging from a failed email
send must NOT include the message preview (PII).

All seven of the plan's open questions are resolved below. The implementation
plan splits into nine atomic tasks ordered so each leaves the codebase
green-build green-test. UI-Significant: **yes** (4 new `page.tsx` files +
back-link component + 2 page edits) — `/mlabs-mockup --from-review
2026-06-15-account-sub-pages` is recommended before `/mlabs-code`, especially
for the Terms and About pages where layout dictates readability.

---

## Findings

### Blockers (must fix before /mlabs-code)

None. All blockers were resolved in the consultation round (see "Decisions
locked" below).

### Concerns (raised, decided, recorded)

- **Concern:** The plan instructs editing
  `packages/services/src/messages/service.ts` and
  `packages/services/src/community/service.ts` to "wire email-send paths".
  But `packages/services/*` imports zero email code today: every email
  sender (waitlist welcome, renewal reminders, verify, password reset) lives
  at the app composition root (`apps/web/src/lib/email/templates.ts`,
  `apps/web/src/lib/cron/renewal-reminder.ts`) or in the auth package's
  Better Auth callbacks (`packages/auth/src/server.ts`). The services
  package is pure-business-logic by AGENTS.md design — it has no
  `@/config/env` access, no driver wiring. Importing `@aira/email` into
  `packages/services/` is the only way to do the send inside the service,
  and it leaks the env-bound driver into business logic.

  **Decision:** Email send moves to the OPERATION layer.
  `sendMessageOp.handler` (in `apps/web/src/server/operations/messages.ts`)
  calls `messages.sendMessage(...)` first, then on success queries
  participants with their prefs and fires the email via
  `sendNotificationEmail` from `@/lib/email`. Same for `addInterestOp.handler`
  in `apps/web/src/server/operations/community.ts`. The services package
  stays untouched (apart from a new helper service method to return
  recipients-with-prefs — see Task 5). This matches the renewal-reminder
  cron pattern.

- **Concern:** The plan proposes two new React Email templates
  (`new-message.tsx`, `post-interest-received.tsx`). But
  `packages/email/src/templates.tsx:125` already exports a generic
  `sendNotificationEmail({ to, title, body, ctaLabel?, ctaUrl? })` that
  renders via `NotificationEmail` with the same `<Layout>` chrome the plan
  asks for. Both new use-cases fit:
  - message → `title: "New message from {sender}"`, `body: preview`,
    `ctaLabel: "Open conversation"`, `ctaUrl: buildAppLinkUrl("/messages/{convId}")`
  - post_interest → `title: "Someone responded to your post"`,
    `body: post_title + (message ? \\\n\\\n + message : '')`,
    `ctaLabel: "View response"`, `ctaUrl: buildAppLinkUrl("/community/{postId}")`

  **Decision:** Drop the two new template files. Both senders reuse
  `sendNotificationEmail` with the shapes above. If a future polish pass
  wants dedicated layouts (sender avatar, post pull-quote), that's a
  follow-up plan — out of scope here.

- **Concern:** Plan's Edge Cases section says "wrap email send in try/catch,
  log to `error_log`, never rethrow." But `messages.body` and
  `post_interest.message` contain user-generated PII (the message preview,
  the responder's optional note). If the email send fails and we dump the
  send-args into `error_log`, the PII lands in a row that lives long after
  the user might delete their account.

  **Decision:** The `error_log.meta` for a failed transactional email
  contains ONLY: `kind` (e.g. `"email.new_message"`), `recipient_user_id`,
  and `error_class` (e.g. `"PostmarkError"`). Never the title, body, or
  preview. Logger calls use `logger.error("send failed", { kind,
  recipient_user_id, message: String(err) })` and the audit/error_log
  pipeline picks up only those fields.

- **Concern:** Reading the recipient's email + preference flags for every
  message-send is an extra DB roundtrip on the hot path. Today
  `sendMessage` already does N+1-style cross-table reads inside its
  transaction (sender lookup + participant fan-out). Adding one more
  `SELECT email, email_on_message_received FROM user WHERE id IN (...)`
  for the email branch is acceptable, but worth being explicit.

  **Decision:** The new helper `messages.listMessageRecipientsForEmail(db,
  conversationId, excludeUserId)` returns
  `{ user_id, email, email_on_message_received }[]` in one query. Called
  AFTER the service's in-app fan-out, not inside the transaction. Adds ~1ms
  to a send. Acceptable; revisit only if message-send P99 regresses.

- **Concern:** Plan's default for `email_on_message_received` is `true`,
  which changes behavior for existing users (they start receiving emails
  they didn't opt into). Need explicit reviewer sign-off because this is
  observable from outside the codebase.

  **Decision:** **Both new columns default to TRUE.** Locked with the user.
  Reasoning: feature feels real out of the box; common SaaS default; the
  preference toggle is reachable from `/account/notifications` so users
  who don't want it can flip it. The release notes / changelog (when we
  have one) should call this out so support knows.

- **Concern:** The two new account static pages
  (`/account/terms`, `/account/about`) live under
  `apps/web/src/app/(app)/account/*` which is NOT in the
  `no-brand-string-literal` allowlist (which covers `/config/`,
  `/templates/`, `/legal/`, `/translations/`, `/docs/`,
  `/components/marketing/`). So any literal "AIRA" in the JSX will fail
  lint.

  **Decision:** Both pages source brand strings via `{brand.name}`,
  `{brand.tagline}`, `{brand.parentName}`, `{brand.supportEmail}`,
  `{brand.legalEntity}`, `{brand.socialHandle}` exclusively. No bare
  string literal of the brand name. Verified at lint time by the existing
  ESLint rule.

### Suggestions (taken or deferred)

- **Taken:** Reuse the existing `Layout`-wrapped `SectionCard` component
  (`apps/web/src/features/profile/components/section-card.tsx`) for the
  Terms and About page section blocks so the visual language matches
  `/profile`.
- **Taken:** Render the `<AccountBackLink />` as a plain server component
  (just a `<Link>` with a `ChevronLeft` icon) — no client JS needed.
- **Deferred:** Adding "Manage business listings" or "Membership" rows to
  `/account` — out of scope for this plan; raise as a separate feature.
- **Deferred:** Mobile (Expo) UI for the new sub-pages. REST endpoint
  contract is built so mobile can consume it later; building screens is a
  separate plan as the user explicitly accepted.
- **Deferred:** Rate-limiting / digesting outbound email volume (e.g.
  collapse 5 messages-in-2-minutes into one digest). Out of scope; revisit
  if user complaints surface.

---

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

1. **Email send architecture: operation layer, not service layer.** Email
   send happens in `sendMessageOp.handler` and `addInterestOp.handler`,
   AFTER the corresponding service call returns. `packages/services/*`
   stays pure.
2. **Email template reuse: drop the two proposed new templates.** Both
   sends use the existing `sendNotificationEmail({ title, body, ctaLabel,
   ctaUrl })` template at `packages/email/src/templates.tsx:125`.
3. **PII protection: error_log/logger meta for failed email sends must NOT
   include title/body/preview.** Only `kind`, `recipient_user_id`,
   `error_class`.
4. **Default preference values: BOTH default to TRUE.** Existing users
   start receiving message and post-interest emails by default.
5. **Schema: two boolean columns on `user` (not a new table).** Columns
   `email_on_message_received` and `email_on_post_interest`, both
   `NOT NULL DEFAULT true`. If we add 5+ more toggles later, migrate to a
   `user_preferences` table then.
6. **Back-link on `/profile` AND every `/account/*` sub-page; NOT on the
   `/account` hub itself.** The hub uses sidebar / bottom-tab nav for
   outward movement.
7. **About page version string: hardcoded "MVP".** No env var until there's
   a real semver.
8. **No new email template files; no new dedicated subject lines beyond
   the title field passed to `sendNotificationEmail`.** The generic
   subject = title pipeline is sufficient.
9. **Recipient + prefs lookup happens AFTER the service-level transaction
   commits**, not inside it. One extra `SELECT` per send.
10. **CTA URLs use `buildAppLinkUrl` (`apps/web/src/lib/email/url.ts`)** so
    the email links work for both web and mobile (Expo scheme + universal
    link).
11. **Legal/About copy: reasonable generic MVP draft. Reviewer flags that
    `/account/terms` mentions "subject to revision; final legal copy
    pending"** as a footer so users aren't misled before launch.
12. **`/account/notifications` toggles are independent; PATCH accepts a
    partial body.** Toggling one column does not require sending the other.

---

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (one commit) and leaves the codebase build/test-green if executed in
isolation.

### Task 1: Add `email_on_message_received` and `email_on_post_interest` columns to `user` with default true

- **Files:**
  - `packages/db/src/schema/auth.ts` (edit) — append the two `boolean`
    columns inside the `user` `pgTable` definition, NOT NULL DEFAULT true
  - Auto-generated migration file under `packages/db/drizzle/` (new)
- **What:** Add two boolean columns to `user` table via Drizzle schema
  edit; generate the migration with `pnpm db:generate`; apply via
  `pnpm db:migrate`. Defaults are `true` (existing users start receiving
  emails for messages and post-interest).
- **Acceptance:**
  - `pnpm db:generate` produces a migration file containing two
    `ADD COLUMN ... NOT NULL DEFAULT true` statements (one per column).
  - `pnpm db:migrate` applies cleanly against a dev database.
  - `pnpm typecheck` and `pnpm lint` pass.
  - Drizzle introspection on `user` shows both new columns.
- **Pause if:** the generated migration includes anything destructive
  (drop column / type change / rename) — must escalate.

### Task 2: Add Zod schemas and service for user preferences

- **Files:**
  - `packages/validators/src/user-preferences.ts` (new)
  - `packages/validators/src/index.ts` (edit) — re-export the new module
  - `packages/services/src/user-preferences/service.ts` (new)
  - `packages/services/src/user-preferences/index.ts` (new) —
    `export * from "./service"`
  - `packages/services/src/index.ts` (edit) — re-export userPreferences
  - `packages/services/src/user-preferences/__tests__/service.test.ts` (new)
- **What:**
  - Zod: `UserPreferencesSchema = z.object({ email_on_message_received:
    z.boolean(), email_on_post_interest: z.boolean() }).strict()` plus
    `UpdateUserPreferencesInputSchema = UserPreferencesSchema.partial().strict()`
  - Service exposes `getPreferences(db, ctx, _args)` and
    `updatePreferences(db, ctx, args)`. Both scope by `ctx.userId`. The
    service shape mirrors the existing `(db, ctx, args)` contract.
  - Vitest covers: happy-path get returns defaults; update sets one column
    without disturbing the other; update with empty object is a no-op;
    per-user isolation (user A's update doesn't affect user B).
- **Acceptance:**
  - `pnpm --filter @aira/services test user-preferences` passes.
  - Type-check passes on both packages.
  - Service has zero imports from `apps/web/*` or `@aira/email`.

### Task 3: Add preferences GET + PATCH route at `/api/v1/profile/preferences`

- **Files:**
  - `apps/web/src/server/operations/user-preferences.ts` (new) — defines
    `getPreferencesOp` and `updatePreferencesOp` via `defineOperation`
  - `apps/web/src/server/operations/index.ts` (edit) — re-export
  - `apps/web/src/app/api/v1/profile/preferences/route.ts` (new)
    - `export const GET = getPreferencesOp.runFromRequest`
    - `export const PATCH = updatePreferencesOp.runFromRequest`
- **What:** Wires the service through the operation adapter so web + mobile
  share the contract. Permission `"user"`. Input/output schemas reuse the
  Zod from Task 2.
- **Acceptance:**
  - `GET /api/v1/profile/preferences` returns `{
    email_on_message_received: true, email_on_post_interest: true }` for a
    freshly-migrated test user.
  - `PATCH /api/v1/profile/preferences { email_on_message_received: false }`
    persists and returns the updated row.
  - 401 for unauthenticated; 400 with a body containing an unknown column.

### Task 4: Add `<AccountBackLink />` component

- **Files:**
  - `apps/web/src/app/(app)/account/_components/back-link.tsx` (new)
- **What:** Plain server component. Renders `<Link href="/account">` with a
  `ChevronLeft` icon (`lucide-react`) and the label "Account". Styled to
  match the existing `/account` muted text + hover treatment. ~20 lines.
- **Acceptance:**
  - Component file under 30 lines.
  - No `"use client"` directive (pure server component).
  - Importable from `@/app/(app)/account/_components/back-link`.

### Task 5: Add `listMessageRecipientsForEmail` and `getPostAuthorForEmail` service helpers

- **Files:**
  - `packages/services/src/messages/service.ts` (edit) — append
    `listMessageRecipientsForEmail(db, conversationId, excludeUserId)`
    returning `Array<{ user_id, email, email_on_message_received }>`. Pure
    SELECT; no side effects.
  - `packages/services/src/community/service.ts` (edit) — append
    `getPostAuthorForEmail(db, postId)` returning `{ user_id, email,
    email_on_post_interest } | null`. Pure SELECT.
  - `packages/services/src/messages/__tests__/service.test.ts` (edit) —
    add 1 case covering recipient lookup + excludeUserId
  - `packages/services/src/community/__tests__/service.test.ts` (edit OR
    new file) — add 1 case
- **What:** Two read-only helpers so operation handlers can decide whether
  to fire an email AND get the recipient email in one query. NOT called
  from the existing in-app notification fan-out (that path stays intact).
- **Acceptance:**
  - Both helpers return only the columns listed (no extra fields).
  - `excludeUserId` properly filters the sender out of the messages
    recipient list.
  - Existing service tests still pass; new tests cover the helpers.
- **Pause if:** the existing message-service mock store doesn't track the
  new boolean columns on `user` after Task 1 — extend the mock; do not
  silently default both to `true` only in tests.

### Task 6: Wire email-send in `sendMessageOp` and `addInterestOp` handlers

- **Files:**
  - `apps/web/src/server/operations/messages.ts` (edit) — `sendMessageOp`
    handler: call `messages.sendMessage(...)`, then call
    `messages.listMessageRecipientsForEmail(...)`, then for each recipient
    with `email_on_message_received === true`, fire
    `sendNotificationEmail({ to, title: 'New message from {senderName}',
    body: preview, ctaLabel: 'Open conversation', ctaUrl:
    buildAppLinkUrl('/messages/' + conversationId) })`. Wrap each send in
    try/catch; logger.error with `{ kind: 'email.new_message',
    recipient_user_id, message: String(err) }`. Never rethrow.
  - `apps/web/src/server/operations/community.ts` (edit) — `addInterestOp`
    handler: call `communityService.addInterest(...)`, then call
    `communityService.getPostAuthorForEmail(...)`, fire
    `sendNotificationEmail({ to, title: 'Someone responded to your post',
    body: post_title + (interestMessage ? '\\n\\n' + interestMessage :
    ''), ctaLabel: 'View response', ctaUrl:
    buildAppLinkUrl('/community/' + postId) })` if pref is true and the
    responder isn't the author. Same try/catch + logger.error shape.
  - `apps/web/src/server/operations/messages.ts` and
    `apps/web/src/server/operations/community.ts` import
    `sendNotificationEmail` from `@/lib/email` and `buildAppLinkUrl` from
    `@/lib/email`.
- **What:** Wires the actual email gating. Service-level returns are
  unchanged.
- **Acceptance:**
  - Sending a message to a recipient with `email_on_message_received=true`
    causes `sendNotificationEmail` to be called once with the expected
    args. With `false`, it is NOT called. The message INSERT succeeds in
    both cases.
  - Same for post-interest with `email_on_post_interest`.
  - Mocking `sendNotificationEmail` to throw does NOT cause the operation
    to throw; the service call still returns success.
  - Logger meta on failure contains `kind`, `recipient_user_id`, error
    message string — and NEVER the body / preview / post title.
- **Pause if:** importing `@/lib/email` from `apps/web/src/server/operations/*`
  produces a circular-import lint warning — escalate (current scan shows it
  doesn't, but the lint may surface a transitive cycle once both ops do it).

### Task 7: Build `/account/notifications` page + toggle component

- **Files:**
  - `apps/web/src/app/(app)/account/notifications/page.tsx` (new) — server
    component, fetches `getPreferencesOp` via `apiServerFetch`, renders
    `<AccountBackLink />` + page header + `<PreferenceToggles initial=...
    />`
  - `apps/web/src/app/(app)/account/notifications/_components/preference-toggles.tsx`
    (new) — client component, two labeled switches; PATCH on toggle via
    `apiClient.patch`; success/error feedback (matches existing
    `SecuritySection` pattern in `/profile`)
- **What:** Real preference page. Labels: "Email me when someone sends me a
  message" and "Email me when someone responds to my community post".
- **Acceptance:**
  - Authenticated user lands on `/account/notifications` and sees both
    toggles reflecting their current values.
  - Toggling persists immediately (PATCH succeeds; UI shows updated
    state); page refresh shows same value.
  - Network error during PATCH shows inline error feedback; toggle
    reverts to pre-click state.
  - Back link visible at top; clicking returns to `/account`.

### Task 8: Build `/account/privacy-security`, `/account/terms`, `/account/about` pages

- **Files:**
  - `apps/web/src/app/(app)/account/privacy-security/page.tsx` (new) —
    server component, calls `apiServerFetch(getProfileOp)` to get
    `user.email` for the danger-zone form, renders `<AccountBackLink />`
    + `<SecuritySection />` + `<DangerZoneSection user={{ email }} />`
  - `apps/web/src/app/(app)/account/terms/page.tsx` (new) — static SSR;
    renders `<AccountBackLink />` + `<SectionCard>`-wrapped sections:
    "Use of service", "User content", "Account termination", "Limitation
    of liability", "Contact us". Then a Privacy Policy section: "What we
    collect", "How we use it", "Cookies & tracking", "Your rights",
    "Contact us". Footer note: "These terms are pre-launch placeholders
    pending legal review." Brand strings via `{brand.name}`,
    `{brand.legalEntity}`, `{brand.supportEmail}`.
  - `apps/web/src/app/(app)/account/about/page.tsx` (new) — static SSR;
    renders `<AccountBackLink />` + brand mission paragraph + tagline
    pull-quote (`{brand.tagline}` with `{brand.taglineHighlight}` styled
    in `text-primary`) + "Operated by {brand.legalEntity}" credit +
    support email + social handle + hardcoded `Version: MVP` line.
- **What:** Three additional sub-pages. Privacy & security REUSES the
  existing `SecuritySection` and `DangerZoneSection` components (no
  re-implementation; just mounts at a new route).
- **Acceptance:**
  - `/account/privacy-security` renders the password-change form and the
    delete-account flow identically to their current `/profile` behavior.
    Functional happy path verified end-to-end.
  - `/account/terms` page passes `no-brand-string-literal` ESLint rule
    (i.e. no literal string "AIRA" appears in the file).
  - `/account/about` page passes the same rule.
  - All three pages render the `<AccountBackLink />` at the top.
- **Pause if:** the ESLint `no-brand-string-literal` rule fires on either
  static page — re-source the offending text through `{brand.*}` instead
  of working around the rule.

### Task 9: Update `/account` and `/profile` to wire the new routes and the back link

- **Files:**
  - `apps/web/src/app/(app)/account/page.tsx` (edit) — replace `"#"` hrefs
    for the four previously-placeholder rows with their real routes:
    `/account/notifications`, `/account/privacy-security`,
    `/account/terms`, `/account/about`. Remove `placeholder: true` from
    those rows so they render at full contrast.
  - `apps/web/src/app/(app)/profile/page.tsx` (edit) — remove
    `SecuritySection`, `NotificationsSection`, `DangerZoneSection`. Add
    `<AccountBackLink />` at the top of the page body. Page now renders
    only `<AccountBackLink /> + <h1>Profile</h1> + <AccountSection />`.
- **What:** Final wiring. After this commit the user-visible bug from the
  original report is gone: chevrons go somewhere; sub-pages have a back
  link; `/profile` no longer duplicates `/account/*` sub-page content.
- **Acceptance:**
  - All six rows on `/account` route to a real destination (no `#`).
  - All four newly-real rows render at full opacity / contrast.
  - `/profile` renders only the Account section + back link.
  - Clicking "← Account" from any sub-page returns to `/account`.
  - `pnpm typecheck`, `pnpm lint`, `pnpm test` all pass on
    `apps/web` and `packages/*`.

---

## Open questions

None blocking — all the plan's open questions and the review's concerns
have been resolved above. Items intentionally deferred and tracked for
later plans:

- Mobile (Expo) screens for `/account/*` sub-pages.
- Real legal copy (current generic copy is a placeholder pending review).
- Email rate-limiting / digesting if outbound volume becomes a problem.
- Migration to a `user_preferences` table if more than ~5 toggles emerge.

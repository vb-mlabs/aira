# Implementation report: Account sub-pages

**Status:** complete
**Review:** [2026-06-15-account-sub-pages](../../reviews/2026-06-15-account-sub-pages.md)
**Branch:** feat/rest-api-migration

## Tasks

| # | Status | Task | Commit |
|---|---|---|---|
| 1 | ✓ done | user-prefs columns on `user` + migration 0024 | `08a117b` |
| 2 | ✓ done | user-preferences Zod schemas + service | `f12230b` |
| 3 | ✓ done | GET/PATCH `/api/v1/profile/preferences` | `7b0c0f9` |
| 4 | ✓ done | `<AccountBackLink />` component | `ae59940` |
| 5 | ✓ done | recipients-with-prefs helpers (messages + community) | `79c0bae` + `104e048` (auto-committed by Replit Agent — see follow-ups) |
| 6 | ✓ done | email-send wired in `sendMessageOp` + `addInterestOp` | `f297096` |
| 7 | ✓ done | `/account/notifications` page + toggle component | `3640c16` |
| 8 | ✓ done | `/account/privacy-security`, `/terms`, `/about` static pages | `f148432` |
| 9 | ✓ done | `/account` hub wired to real routes; `/profile` trimmed | `19d54ff` |

## Commits (chronological)

```
08a117b feat(db): add email_on_message_received + email_on_post_interest to user
f12230b feat(services): add user-preferences domain (get + update)
7b0c0f9 feat(api): GET + PATCH /api/v1/profile/preferences
ae59940 feat(account): AccountBackLink component
79c0bae Published your App                       ← Replit auto-commit (task 5 service edits)
104e048 Add tests for email recipient retrieval functions ← Replit auto-commit (task 5 tests)
f297096 feat(api): gate new-message + post-interest emails on user prefs in ops
3640c16 feat(account): /account/notifications page with preference toggles
f148432 feat(account): /privacy-security, /terms, /about sub-pages
19d54ff feat(account): wire hub links to real routes; trim /profile to AccountSection + back link
```

## Verification

- `pnpm typecheck` — 10/10 tasks pass (turbo cache: 3 cached, 7 fresh)
- `pnpm --filter @aira/services test` — 54/54 tests pass (6 test files)
- `pnpm --filter @aira/web test` — 164/164 tests pass (18 test files)
- Lefthook hooks (`check-migrations`, `check-no-server-actions`, `check-contrast`) green on every commit

## Decisions worth knowing

- **Email send architecture.** Per review concern: services package stays pure. `sendMessageOp.handler` and `addInterestOp.handler` do the follow-up `listMessageRecipientsForEmail` / `getPostAuthorForEmail` lookup AFTER the service returns success, then fire `sendNotificationEmail` (the existing generic template at `packages/email/src/templates.tsx:125`) — gated by the per-user boolean. Two layers of try/catch: inner around each send (PII-stripped log meta), outer around the lookup.
- **PII protection.** Failed-email logger meta is `{ kind, recipient_user_id, message: String(err) }`. The message body / preview / post title / responder note are never logged.
- **Helper extension.** `getPostAuthorForEmail` was extended during task 6 to also return `post_title` so the op handler can build the email body in one query rather than two.
- **Defaults.** Both new boolean columns default to `true` (opt-out semantics). Existing users start receiving message + post-interest emails by default.
- **No new email templates.** Per review concern: reused `sendNotificationEmail({ title, body, ctaLabel, ctaUrl })` instead of building two new React Email components.

## Follow-ups

- **Replit Agent auto-commit interference (task 5).** Two of my commits got intercepted by Replit's auto-committer:
  - `79c0bae` ("Published your App") swept up my service.ts edits + the mstack ledger.
  - `104e048` ("Add tests for email recipient retrieval functions") swept up the test files I wrote.
  - Functional impact: zero (all changes are in the repo and tests pass). Hygiene impact: task 5's commit history is split + named by the auto-committer rather than mine. Did NOT rebase-rewrite to avoid an arms race with the auto-commit agent.

- **Mobile (Expo) UI** for the four new sub-pages — out of scope per the review. REST endpoint `/api/v1/profile/preferences` is already wired so mobile can consume it later.

- **Real legal copy** — `/account/terms` ships generic MVP placeholder copy with a "pre-launch drafts" disclaimer pointing to `brand.supportEmail`. Replace before launch.

- **`/account/about` version string** — hardcoded `MVP`. If you adopt semver (e.g. via CI-injected `NEXT_PUBLIC_APP_VERSION`), swap the literal for the env var.

- **Email-send rate limiting / digesting** — not implemented. If outbound email volume becomes a problem (many messages in quick succession), this is the place to add a debounce / digest. Out of scope per the review.

- **Schema migration to `user_preferences` table** — not needed at 2 booleans. Revisit if the toggle count crosses ~5.

## Recommended next step

`/mlabs-qa` focused on the new account sub-pages + the email-gating flow. Suggested scenarios:

1. End user toggles `email_on_message_received` off, has another user send them a message → in-app notification fires, NO email sent.
2. Same toggle on (default) → both fire.
3. Same for community post-interest.
4. Navigation: from `/account`, click each of the 4 sub-page rows → renders, back link returns to `/account`.
5. From `/profile`, back link returns to `/account` and `/profile` no longer shows Security / Notifications / Danger Zone sections.

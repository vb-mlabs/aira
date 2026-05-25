# Review: React Email templates (replace Postmark hosted templates)

**Date:** 2026-05-24
**Slug:** 2026-05-24-react-email-templates
**Plan reviewed:** [2026-05-24-react-email-templates.md](../plans/2026-05-24-react-email-templates.md)
**Status:** approved
**UI-Significant:** yes
**Reviewer:** VB

---

## Summary

Plan is sound: replace `templateAlias` payloads with rendered HTML+text from
in-code React Email components, keep Postmark as the driver, expose a dev
preview page. The `EmailTemplates` public interface is preserved, so
BetterAuth (`packages/auth/src/server.ts`) and the web app's email shims
(`apps/web/src/lib/email/*`) keep compiling without edits. One blocker
fixed during review (preview-route path collision) and three concerns
locked. UI-Significant fires on the heuristic (new `page.tsx` under
`apps/web/src/app/`), but the new page is a dev-only preview, not a
user-facing flow — `/mlabs-mockup` is optional here.

## Findings

### Blockers (must fix before /mlabs-code)

- **Path collision at `/_dev/messages`.** That route already exists — it's
  the dev seed page for the chat (`features/messages`) module. The plan's
  preview route is moved to **`/_dev/emails`** (decided below).

### Concerns (raised, decided, recorded)

- **Concern:** Plan used `process.env.NODE_ENV === "production"` as the
  preview-page guard. AGENTS.md forbids raw `process.env` outside
  `src/config/env.ts`.
  **Decision:** Import `env` from `@/config/env` and guard with
  `if (env.NODE_ENV === "production") notFound()`.

- **Concern:** Subject line ownership was left open in the plan.
  **Decision:** Subjects stay centralized in `templates.ts` inside the
  `sendXxx` functions (the plan's default). Co-locating subjects in each
  template component was offered but not chosen — keeps the React Email
  components purely body-shaped.

- **Concern:** React dep strategy for `@mlabs/email` was left open.
  **Decision:** Regular dep on `react@19.2.4` (exact match for
  `apps/web`). pnpm workspace resolution will dedupe; this is simpler than
  peer-dep gymnastics for a workspace-private package.

- **Concern:** Three new top-level deps (`@react-email/components`,
  `@react-email/render`, `react`) added to `@mlabs/email`. MLabs prefers
  boring deps.
  **Decision:** Approved — these are exactly the deps the refactor exists
  to add; `react-email` is maintained, stable, MIT, and used by Resend
  itself. No alternative gives in-code templates without comparable
  surface area.

### Suggestions (taken or deferred)

- **Taken:** Explicitly mark `apps/web/src/lib/email/{templates,driver,types,url}.ts`
  as **unchanged**. Their re-exports keep working because the
  `EmailTemplates` interface signatures (`sendVerifyEmail`,
  `sendPasswordResetEmail`, `sendNotificationEmail`) are preserved. Listed
  in Task 6 as a verification step rather than an edit.
- **Taken:** Add a `// Delete src/app/_dev/ before v1 ship.` comment to the
  new preview page header — matches the existing `_dev/` convention.
- **Deferred:** react-email standalone preview server (out of scope per
  plan).
- **Deferred:** Snapshot tests per template — open question, not blocker.
  Promoted to Task 5b (optional, can be skipped).

## Decisions locked

Net new decisions made during review (beyond what was in the plan):

- Preview route is **`/_dev/emails`**, not `/_dev/messages`.
- Production guard uses **`env.NODE_ENV` from `@/config/env`**, not raw
  `process.env`.
- Subjects live in **`templates.ts`** (centralized, inside `sendXxx`).
- React is a **regular dep at `19.2.4`** in `@mlabs/email`.
- `apps/web/src/lib/email/*` shims are **unchanged** by this refactor —
  any edit there is a Pause trigger.
- `feature-grid.tsx` copy update is in scope (plan already listed it).

## Implementation plan

Ordered tasks for `/mlabs-code` to execute top-to-bottom. Each task is
atomic (reviewable as a single commit).

### Task 1: Add email-safe brand color palette to @mlabs/config

- **Files:** `packages/config/src/brand.ts` (edit)
- **What:** Add an `emailColors` block to the `brand` export with sRGB hex
  values: `primary` (~`#FF6B2C`, OKLCH(0.69 0.18 39) equivalent),
  `primaryForeground` (~`#1F1F1F`), `background` (`#FFFFFF`),
  `foreground` (`#1A1A1A`), `muted` (`#F5F5F5`), `mutedForeground`
  (`#525252`), `border` (`#E5E5E5`). Add a comment noting these are
  hand-tuned email-client-safe equivalents of `design.colors.light` —
  email clients don't support `oklch()`. Update the `Brand` type.
- **Acceptance:** `brand.emailColors.primary` resolves to a hex string;
  `pnpm -F @mlabs/config typecheck` passes.
- **Pause if:** This touches the rebrand layer (`packages/config/src/brand.ts`).
  Per AGENTS.md hard rules, `/mlabs-code` must pause and confirm the
  hex values before commit. Show the diff and ask: "Confirm these hex
  values match the OKLCH design tokens?"

### Task 2: Add React Email deps to @mlabs/email

- **Files:** `packages/email/package.json` (edit)
- **What:** Add dependencies: `@react-email/components` (latest stable),
  `@react-email/render` (latest stable), `react@19.2.4` (exact match for
  `apps/web`). Run `pnpm install` to update the lockfile.
- **Acceptance:** `pnpm -F @mlabs/email typecheck` passes. Lockfile has
  new entries. No `react` major-version mismatch warnings during install.
- **Pause if:** `pnpm install` reports peer-dep conflicts with any other
  workspace package — that means the React version pin needs reconsidering.

### Task 3: Build shared Layout + Button components

- **Files:**
  - `packages/email/src/components/Layout.tsx` (new)
  - `packages/email/src/components/Button.tsx` (new)
  - `packages/email/src/components/theme.ts` (new)
- **What:** `theme.ts` re-exports `brand.emailColors` as a flat
  `theme.colors` object plus spacing/radius constants for email layout.
  `Layout.tsx` is a React Email `<Html><Body>` wrapper with a branded
  header (brand name in primary color), body slot (children prop), and
  footer (legal entity, support email, "you're receiving this because"
  block). `Button.tsx` is a React Email `<Button>` wrapper styled with
  `theme.colors.primary` / `primaryForeground`. **Do not** add
  `import "server-only"` to these files — they're plain JSX modules that
  must render in node-side `@react-email/render`.
- **Acceptance:** Files compile. `Layout` accepts `children` + optional
  `preheader` prop. `Button` accepts `href` + `children`.
  `pnpm -F @mlabs/email typecheck` passes.

### Task 4: Build three template components

- **Files:**
  - `packages/email/src/templates/verify-email.tsx` (new)
  - `packages/email/src/templates/password-reset.tsx` (new)
  - `packages/email/src/templates/notification.tsx` (new)
- **What:** Each is a React Email component that takes a props object
  matching the existing `sendXxx` opts:
  - `VerifyEmail({ brandName, name, verifyUrl })` — greeting, copy,
    `<Button href={verifyUrl}>Verify email</Button>`, footer fallback URL.
  - `PasswordResetEmail({ brandName, name, resetUrl, expiresInMinutes })`
    — greeting, copy mentioning expiry, button, "didn't request this?"
    footer line.
  - `NotificationEmail({ brandName, title, body, ctaLabel?, ctaUrl? })` —
    title heading, body paragraph(s), optional CTA button.
  All three import and use `Layout` + `Button`. **No** `server-only` import.
- **Acceptance:** Each component renders to valid HTML via
  `@react-email/render(<VerifyEmail ... />)` without throwing.
  `pnpm -F @mlabs/email typecheck` passes.

### Task 5: Rewire types + templates.ts + drivers to send rendered HTML

- **Files:**
  - `packages/email/src/types.ts` (edit)
  - `packages/email/src/templates.ts` (edit)
  - `packages/email/src/drivers/postmark.ts` (edit)
  - `packages/email/src/drivers/console.ts` (edit)
  - `packages/email/src/index.ts` (edit)
- **What:**
  - `types.ts`: `SendArgs` becomes `{ to: string; subject: string; html: string; text: string; fromName?: string }`. Drop `templateAlias` and `variables`. Keep `SendResult` unchanged.
  - `templates.ts`: each `sendXxx` builds the React tree, calls `await render(tree)` for HTML and `await render(tree, { plainText: true })` for text, builds the subject string in code (e.g. `` `Verify your ${brandName} email` ``), then calls `getDriver().send({ to, subject, html, text, fromName: brandName })`. Public `EmailTemplates` interface signatures unchanged.
  - `postmark.ts`: switch to `client.sendEmail({ From, To, Subject, HtmlBody, TextBody, MessageStream: "outbound" })`.
  - `console.ts`: log `{ to, subject, text: text.slice(0, 120) }`. Drop `variables` reference.
  - `index.ts`: export `Layout`, `Button`, and the three template components for the preview route.
- **Acceptance:**
  - `grep -r "templateAlias" packages/email/src` returns empty.
  - `pnpm -F @mlabs/email typecheck` passes.
  - `pnpm -F @mlabs/auth typecheck` passes (signature compatibility).
  - `pnpm -F @mlabs/services typecheck` passes.
  - `pnpm -F @mlabs/web typecheck` passes.

### Task 5b: (optional) Snapshot tests per template

- **Files:** `packages/email/src/templates/__tests__/render.test.ts` (new)
- **What:** One snapshot test per template that renders with fixture props
  and asserts the HTML contains key strings (brand name, CTA URL, subject)
  + matches a stored snapshot. Catches accidental brand-color drift.
- **Acceptance:** `pnpm -F @mlabs/email test` passes. Three snapshots created.
- **Pause if:** No test runner is configured for `@mlabs/email`. Check
  `package.json` `scripts.test` first; if missing, skip this task and note
  in the report.

### Task 6: Verify apps/web shims unaffected

- **Files:** None edited; verification only.
- **What:** Confirm `apps/web/src/lib/email/{templates,driver,types,url}.ts`
  still compile and re-export correctly without modification. Run typecheck
  + read each file to confirm no `templateAlias` references leak through.
- **Acceptance:** `pnpm -F @mlabs/web typecheck` passes. `grep -rn "templateAlias" apps/web/src` returns empty. No edits required.
- **Pause if:** Any shim file needs editing to make typecheck pass — that
  means the seam broke and we need to revisit the interface. Show the
  failing type error and ask before editing the shim.

### Task 7: Add /_dev/emails preview route

- **Files:** `apps/web/src/app/_dev/emails/page.tsx` (new)
- **What:** Page module that:
  1. Imports `env` from `@/config/env` and calls `notFound()` from
     `next/navigation` if `env.NODE_ENV === "production"`.
  2. Imports the three template components from `@mlabs/email`.
  3. Renders each to HTML via `@react-email/render` with hardcoded fixture
     props (e.g. `verifyUrl: "https://example.com/verify?token=demo"`).
  4. Displays each in a labeled section with an `<iframe srcDoc={html} />`
     so styles don't leak into the page chrome.
  5. Header comment: `// Dev preview for @mlabs/email templates. Delete src/app/_dev/ before v1 ship.`
- **Acceptance:**
  - Visiting `/_dev/emails` in `pnpm -F @mlabs/web dev` shows three iframes with the rendered templates.
  - In a production build (`NODE_ENV=production`), the route returns 404.
  - No raw `process.env` access anywhere in the file (uses `env`).

### Task 8: Update landing page copy + handover docs

- **Files:**
  - `apps/web/src/components/marketing/feature-grid.tsx` (edit)
  - `docs/handover/postmark-templates.md` (edit if exists, else skip)
- **What:**
  - `feature-grid.tsx`: update the `@mlabs/email` card body to reflect in-code templates. Drop the "Templates currently live in the Postmark UI — React Email replacement is the next refactor" line; replace with something like "Postmark driver + typed sends for verify-email, password-reset, and notification. React Email templates branded from @mlabs/config. Console driver for local dev. Preview at `/_dev/emails`."
  - `docs/handover/postmark-templates.md`: if the file exists, replace with a one-liner noting templates moved to `packages/email/src/templates/` in code. If it doesn't exist, skip.
- **Acceptance:** Landing page copy mentions React Email + preview route.
  Handover doc (if it existed) no longer references hosted templates.
- **Pause if:** `feature-grid.tsx` has been edited beyond what's in the
  current `git HEAD` since this review was written — surface the diff
  and ask whether to merge or overwrite.

## Open questions

Anything still unresolved that `/mlabs-code` should escalate, not guess.

- **Hex values for `brand.emailColors`** — Task 1 lists the expected hex
  for the OKLCH primary (`#FF6B2C` for `oklch(0.69 0.18 39)`). These are
  approximate hand-tuned conversions. `/mlabs-code` should propose its
  computed hex values in the Pause prompt and let the user lock them
  before commit.
- **Test runner availability for `@mlabs/email`** — Task 5b is optional
  and skips cleanly if no test runner is configured.
- **Snapshot vs explicit HTML assertions** — if Task 5b runs, prefer
  small explicit `expect(html).toContain(...)` assertions over big inline
  snapshots; snapshots rot when brand copy changes.

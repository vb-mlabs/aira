# Plan: React Email templates (replace Postmark hosted templates)

**Date:** 2026-05-24
**Slug:** 2026-05-24-react-email-templates
**Status:** implemented — see `.mstack/code/2026-05-24-react-email-templates/report.md`
**Author:** VB

---

## Problem

`@mlabs/email` currently sends via `postmark.sendEmailWithTemplate({ TemplateAlias })`,
which means every fork must manually create three templates (`verify-email`,
`password-reset`, `notification-generic`) inside the Postmark UI before auth,
password reset, or notifications work. That breaks the "fork and run" promise
the landing page now advertises: a fresh clone with valid Postmark creds still
fails on send because no `TemplateAlias` resolves.

Moving template rendering into code — branded from `@mlabs/config` —
removes the hosted-template prerequisite, restores brand parity across web
emails and the app, and gives engineers a typed, code-reviewable place to
iterate on copy. Postmark stays as the driver (deliverability, no migration
risk for existing forks already paying for it).

## Scope

**In:**
- Add `@react-email/components` + `@react-email/render` + `react` to `@mlabs/email`.
- Replace `templateAlias`/`variables` in `SendArgs` with `subject`/`html`/`text` (driver-agnostic).
- Rebuild the three existing templates as `.tsx` components: `verify-email`, `password-reset`, `notification`.
- Add a shared `Layout` component (header w/ brand name, footer w/ legal entity + support email) and `Button` primitive, both branded from `@mlabs/config`.
- Add an email-safe color palette in `@mlabs/config` (hex equivalents of the brand primary/foreground OKLCH values) — email clients don't reliably support OKLCH.
- Switch the Postmark driver to `sendEmail()` (no `TemplateAlias`).
- Update the console driver to log `subject` + first ~120 chars of plaintext.
- Add a dev-only Next.js route `apps/web/src/app/_dev/messages/page.tsx` that lists all templates and renders their HTML in iframes; returns 404 when `process.env.NODE_ENV === "production"`.
- Render plaintext alongside HTML on every send (`@react-email/render({ plainText: true })`).

**Out (deferred):**
- Resend driver (interface stays driver-agnostic so it's a future drop-in).
- Welcome email, magic-link email, any new template types.
- i18n / multi-language templates.
- Dark-mode-specific email styling (single light-mode-leaning palette that reads OK in Gmail/Outlook dark inversion).
- react-email standalone preview server (the `/_dev/messages` route is enough).
- Email A/B testing, open/click tracking changes (Postmark defaults stay).

## Approach

Push rendering up into `templates.ts` and make the driver dumb. Each template
function becomes: build the React tree → `await render(tree)` + `await render(tree, { plainText: true })` →
call `driver.send({ subject, to, html, text, fromName })`. The
`EmailTemplates` interface (`sendVerifyEmail`, `sendPasswordResetEmail`,
`sendNotificationEmail`) keeps its current public signatures, so BetterAuth
and `@mlabs/services` call sites stay untouched — this is the seam the
last session deliberately preserved.

`Layout.tsx` wraps every email with header (brand name, primary-colored
underline) + body slot + footer (legal entity, support email, "you're
receiving this because..."). All chrome reads from `brand` and a new
`brand.emailColors` block (sRGB hex, since `oklch()` in inline CSS is
unsupported in most clients). `Button.tsx` is a `<a>` styled as a CTA
using `emailColors.primary` / `emailColors.primaryForeground`.

The `/_dev/messages` route reads each template's fixture data (hardcoded in
the page), renders to HTML via `@react-email/render`, and shows them stacked
in `srcdoc` iframes so styles don't leak. The route file guards with an
early `notFound()` in production — simpler than a middleware rule, and
keeps the dev affordance out of the prod bundle's route manifest.

**Alternatives considered:**

- **Hybrid `SendArgs` (keep `templateAlias` + add `html`/`text`)** — rejected. Leaves a Postmark-shaped field on a supposedly generic driver interface; nothing in the codebase needs hosted templates anymore, so keeping the field is dead surface area that confuses the next reader.
- **Render inside each driver (templates pass JSX to driver, driver calls `render`)** — rejected. Forces every future driver to depend on `@react-email/render` and re-implement plaintext generation. Rendering once in `templates.ts` is the simpler seam.
- **Switch driver to Resend in the same change** — rejected per user scope decision. Postmark + in-code templates is the minimum-risk change; Resend can land later behind the same `EmailDriver` interface without touching templates.

## Data model changes

None.

## Files to touch

**New:**
- `packages/email/src/components/Layout.tsx` — shared shell (header, body, footer).
- `packages/email/src/components/Button.tsx` — CTA primitive.
- `packages/email/src/components/theme.ts` — re-exports email-safe color/spacing constants derived from `@mlabs/config`.
- `packages/email/src/templates/verify-email.tsx` — React Email component.
- `packages/email/src/templates/password-reset.tsx` — React Email component.
- `packages/email/src/templates/notification.tsx` — React Email component.
- `apps/web/src/app/_dev/messages/page.tsx` — preview route, 404 in production.
- `apps/web/src/app/_dev/messages/[template]/page.tsx` — single-template iframe view (optional helper for full-bleed preview).

**Edit:**
- `packages/email/package.json` — add `@react-email/components`, `@react-email/render`, `react` (pin to same major as the web app), update `exports` if needed.
- `packages/email/src/types.ts` — `SendArgs` becomes `{ to; subject; html; text; fromName? }`; drop `templateAlias` and `variables`.
- `packages/email/src/templates.ts` — render React components to HTML+text, build subject lines, call driver.
- `packages/email/src/drivers/postmark.ts` — swap `sendEmailWithTemplate` → `sendEmail` (HtmlBody + TextBody + Subject).
- `packages/email/src/drivers/console.ts` — log subject + plaintext preview (replace the current variables dump).
- `packages/email/src/index.ts` — export `Layout`, `Button`, template components (so the dev preview route can import them directly).
- `packages/config/src/brand.ts` — add `emailColors: { primary, primaryForeground, background, foreground, muted, border }` as sRGB hex (the OKLCH equivalents of the design tokens, hand-tuned for WCAG AA).
- `docs/handover/postmark-templates.md` (if exists) — replace with "templates now live in code at `packages/email/src/templates/`; edit copy there and ship."
- `apps/web/src/components/marketing/feature-grid.tsx` — update the `@mlabs/email` card copy (the "templates currently live in the Postmark UI" line is no longer true once this lands).

## Edge cases

- **OKLCH support in email clients** — Gmail, Outlook, Yahoo do not support `oklch()` in inline styles. Mitigation: hardcode sRGB hex in `brand.emailColors`. Document that this is a deliberate parallel palette, not derived at runtime, because color-space conversion in the render pipeline would add deps for one number per token.
- **React peer dep** — `@mlabs/email` becomes a React consumer at runtime. Add `react` as a regular dep (not peer) at the same major as `apps/web` to avoid duplicate-React hazards in tests.
- **`server-only` directive on templates** — `@react-email/components` is environment-agnostic and the component files are plain JSX modules; do NOT put `import "server-only"` in the template/component files. The `server-only` boundary stays at `templates.ts` and the drivers (where the render call + Postmark client live).
- **Plaintext fallback** — `@react-email/render(tree, { plainText: true })` produces text from the JSX; we must pass *the same tree*, not a stripped variant, so links and CTAs survive.
- **Subject lines** — each `sendXxx` function builds the subject in code (e.g. `\`Verify your ${brandName} email\``); not a prop on the template component, to keep components purely body-shaped.
- **`/_dev/messages` exposure** — must 404 in production. Guard with `if (process.env.NODE_ENV === "production") notFound()` at the top of the page module so the route never renders even if the path is reached. The Next 15 `notFound()` from `next/navigation` is correct here.
- **BetterAuth wiring** — `packages/auth/` calls `sendVerifyEmail({ to, name, verifyUrl })` and `sendPasswordResetEmail({ to, name, resetUrl })` through the `EmailTemplates` interface. Signatures are preserved by design; verify no caller broke after the type-level rename of internal `SendArgs`.
- **Existing forks on Postmark hosted templates** — this is a breaking driver-payload change. Document in CHANGELOG that the three template aliases can now be deleted from the Postmark UI. (Forks that have *modified* their hosted templates lose those edits — they should diff and port into the .tsx versions.)
- **`fromName` semantics** — currently every send passes `fromName: brandName`. Keep that behavior; do not move the brand-name composition into the driver.

## Acceptance criteria

- [ ] `/_dev/messages` renders the three templates with the current brand colors; route returns 404 in a `NODE_ENV=production` build.
- [ ] `packages/email` no longer references `templateAlias` anywhere; `grep templateAlias packages/email` is empty.
- [ ] Postmark driver calls `sendEmail` (not `sendEmailWithTemplate`); payload contains `HtmlBody`, `TextBody`, `Subject`.
- [ ] Console driver output for a send shows `[email:console]` + `subject` + plaintext preview (no `TemplateModel` dump).
- [ ] BetterAuth verify-email and password-reset flows still work end-to-end against the console driver (signature compatibility preserved).
- [ ] `pnpm typecheck` passes for all workspaces.
- [ ] `pnpm -F @mlabs/email build` (or `typecheck`) passes.
- [ ] `brand.emailColors` is the only place email hex values live; templates import from `@mlabs/config`, not literal hex.
- [ ] `apps/web` `feature-grid.tsx` "Postmark UI" copy is updated to reflect in-code templates.
- [ ] Sending a real email via Postmark (manual smoke test with a real token) delivers and renders with brand styling in Gmail web + Apple Mail.

## Open questions

For the reviewer (`/mlabs-review`) to resolve before implementation.

- **`brand.emailColors` palette** — hand-tune sRGB hex (likely `#FF6B2C` for primary, `#0A0F1C` for foreground, off-white background) or pull from an OKLCH→sRGB conversion script committed in `tooling/`? Recommendation: hand-tune for v1, document the OKLCH source in a comment.
- **Subject line ownership** — keep subjects as literals inside the `sendXxx` functions in `templates.ts`, or hoist into a `subjects` map next to each template component? Recommendation: subjects next to component (`templates/verify-email.tsx` exports `subject(brandName)`), so copy edits are co-located.
- **Preview route discovery** — link to `/_dev/messages` from anywhere (e.g. landing footer in dev, a navbar dev badge), or leave as a known dev URL documented in README? Recommendation: README + AGENTS.md only; no UI affordance.
- **React version pinning** — `@mlabs/email` adds `react` as a dep. Should it be a peer dep matching `apps/web`, a regular dep, or pulled from the workspace root? Recommendation: peer dep on `react@^19` with a regular devDep for typecheck, to avoid duplicate-React in the bundler.
- **Mobile (`apps/mobile`) impact** — Expo never imports `@mlabs/email` (server-only), so no impact, but worth confirming in review.
- **Test coverage** — add a snapshot test of rendered HTML per template, or rely on the dev preview + manual smoke? Recommendation: one snapshot test per template (cheap insurance, catches accidental brand-color drift).

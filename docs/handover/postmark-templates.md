# Postmark templates (moved into code)

**Templates now live in code**, not in the Postmark UI. As of the React Email
refactor (review `.mstack/reviews/2026-05-24-react-email-templates.md`), the
three transactional emails — verify-email, password-reset, and notification —
are React components rendered to HTML + plaintext at send time and posted to
Postmark via `client.sendEmail()`.

**There is nothing to set up in the Postmark UI** beyond a Server + verified
sender. Hosted templates are not used and `TemplateAlias` is no longer part of
the driver payload.

## Per-fork Postmark setup

1. **Create a new Server** in [Postmark](https://account.postmarkapp.com/servers)
   (one per project — never share servers across clients).
2. **Add a Sender Signature** for your `From` address (must be verified).
3. Copy the Server's **API Token** to `POSTMARK_SERVER_TOKEN` in Replit Secrets.
4. Set `POSTMARK_FROM_EMAIL` to the verified sender email.

That's it. No template aliases, no variable maps — sign up a test user and the
verify-email send will Just Work.

## Where the templates live

- `packages/email/src/templates/verify-email.tsx`
- `packages/email/src/templates/password-reset.tsx`
- `packages/email/src/templates/notification.tsx`

Shared chrome (header, footer, CTA button, colors) lives in
`packages/email/src/components/`. Brand colors come from
`packages/config/src/brand.ts` (`brand.emailColors`) — a parallel sRGB hex
palette, because email clients (Gmail, Outlook, Yahoo) don't support
`oklch()` in inline CSS.

## Editing copy

To change the wording, design, or layout of an email, edit the matching
`.tsx` file and ship a normal PR. The dev preview at **`/dev/emails`** in
`pnpm -F @mlabs/web dev` shows all three rendered live in iframes — refresh
to see edits. The preview route returns 404 in production.

## Driver swap (future)

The `EmailDriver` interface in `packages/email/src/types.ts` takes a generic
`{ subject, html, text, to, fromName? }` payload, so swapping Postmark for
Resend / SES / Mailgun is a single new driver file — call sites stay
untouched. See `packages/email/src/drivers/postmark.ts` for the reference
implementation.

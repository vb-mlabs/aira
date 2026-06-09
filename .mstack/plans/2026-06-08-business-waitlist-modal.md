# Plan: Business Waitlist Sign-Up Modal

**Date:** 2026-06-08
**Slug:** business-waitlist-modal
**Status:** implemented
**Author:** mlabs-plan

---

## Problem

Business owners who click "Get Listed Early" on the landing page are currently
sent to an external Google Form. This loses the submission data from the app,
breaks the UX flow (new tab, generic Google branding), and makes it impossible
to trigger a welcome email or track conversion in the product.

The fix: replace the Google Form link with an in-app Dialog modal that collects
the same contact details, saves them to the database, and sends a welcome email
— all without leaving the page.

**Persona:** A business owner visiting the marketing landing page, deciding
whether to join the pre-launch waitlist.

## Scope

**In:**
- Dialog modal on "Get Listed Early" CTA with six fields: Full Name, Business Name, Phone, Email, Preferred Contact Method, Preferred Contact Time
- `POST /api/v1/business-waitlist` route — validates, inserts, sends welcome email
- Extend existing `waitlist` table with `type` discriminator + business-specific nullable columns (unique constraint shifts from `email` → `(email, type)`)
- New Zod validator `BusinessWaitlistSignupSchema` in `@aira/validators`
- New email template `BusinessWaitlistWelcomeEmail` + `sendBusinessWaitlistWelcomeEmail` helper
- Success state: swap form for thank-you message inside the modal (user dismisses manually)
- Honeypot field on the form (consistent with existing consumer waitlist)

**Out (deferred):**
- Admin view / dashboard to browse submissions
- Duplicate-submission UX beyond the DB-level `(email, type)` unique constraint
- Double-opt-in email confirmation flow
- Mobile app exposure (REST endpoint ships first; mobile can consume it later)

## Approach

**Single merged `waitlist` table with a `type` discriminator.** The existing
table has `id`, `email` (unique), `source`, `created_at`, `confirmed_at`. We
extend it with:

- `type text NOT NULL DEFAULT 'consumer'` — discriminates consumer vs business rows
- `full_name`, `business_name`, `phone` — nullable text columns (NULL for consumer rows)
- `preferred_contact text` — nullable, CHECK `IN ('phone','whatsapp','email')`
- `preferred_time text` — nullable, CHECK `IN ('morning','afternoon','evening','anytime')`
- Drop the `UNIQUE(email)` column-level constraint, replace with `UNIQUE(email, type)` table-level constraint

The existing `/api/v1/waitlist` route and `WaitlistSignupSchema` are unchanged —
they continue to insert `type = 'consumer'` rows implicitly. The new
`/api/v1/business-waitlist` route uses a `BusinessWaitlistSignupSchema` that
sets `type = 'business'` and requires the extra fields.

Frontend: `business-cta-pair.tsx` already holds the "Get Listed Early" button
as a plain `<a>` tag pointing at the Google Form URL. We wrap it in a
`Dialog.Root` (same `@base-ui/react` already in use for the Launch Offer modal
in the same file) and add a controlled form with `useState` — no new form
library needed for six fields. On success, swap the form JSX for a
thank-you block; the Dialog.Close button dismisses.

**Alternatives considered:**

- **Separate `business_waitlist` table** — cleaner in isolation, but the user
  explicitly prefers one table; adds another export to the schema index and
  another migration file for no additional query capability at this stage.
- **JSON `metadata` column on existing `waitlist`** — avoids schema columns but
  loses Drizzle type safety, makes future admin queries harder, and still needs
  a migration.
- **Extend the existing `/api/v1/waitlist` endpoint** — would complicate the
  validation branching (`type` optional → conditional required fields) and risk
  breaking the existing consumer form if validation logic diverges.

## Data model changes

### `packages/db/src/schema/waitlist.ts`

```
ALTER TABLE waitlist
  ADD COLUMN type          text NOT NULL DEFAULT 'consumer',
  ADD COLUMN full_name     text,
  ADD COLUMN business_name text,
  ADD COLUMN phone         text,
  ADD COLUMN preferred_contact text,
  ADD COLUMN preferred_time    text;

-- Drop column-level unique, add composite
ALTER TABLE waitlist DROP CONSTRAINT waitlist_email_unique;
ALTER TABLE waitlist ADD CONSTRAINT waitlist_email_type_unique UNIQUE (email, type);

-- New check constraints
ALTER TABLE waitlist ADD CONSTRAINT waitlist_type_check
  CHECK (type IN ('consumer', 'business'));
ALTER TABLE waitlist ADD CONSTRAINT waitlist_preferred_contact_check
  CHECK (preferred_contact IS NULL OR preferred_contact IN ('phone','whatsapp','email'));
ALTER TABLE waitlist ADD CONSTRAINT waitlist_preferred_time_check
  CHECK (preferred_time IS NULL OR preferred_time IN ('morning','afternoon','evening','anytime'));

-- Extend source check to include new value
-- (Drizzle will regenerate the CHECK with the new enum list)
```

Migration generated via `pnpm db:generate`, applied via `pnpm db:migrate`.

## Files to touch

**New:**
- `packages/email/src/templates/business-waitlist-welcome.tsx` — React Email template
- `apps/web/src/app/api/v1/business-waitlist/route.ts` — POST handler

**Edit:**
- `packages/db/src/schema/waitlist.ts` — add type + business columns, composite unique, new CHECKs, new source value
- `packages/validators/src/waitlist.ts` — add `BusinessWaitlistSignupSchema`, `WaitlistTypeSchema`, contact/time enums
- `packages/validators/src/index.ts` — ensure new types exported (check if barrel re-exports automatically)
- `packages/email/src/templates.tsx` — add `sendBusinessWaitlistWelcomeEmail` to factory + `EmailTemplates` interface
- `apps/web/src/lib/email/templates.ts` — export `sendBusinessWaitlistWelcomeEmail`
- `apps/web/src/components/marketing/business-cta-pair.tsx` — replace `<a href={GOOGLE_FORM_URL}>` with Dialog form

## Edge cases

- **Same email, both consumer and business**: The `(email, type)` unique constraint allows it. `ON CONFLICT DO NOTHING` silences re-submission from the same business owner — no error shown to the user (mirrors consumer waitlist behaviour).
- **Drizzle schema change to `email` uniqueness**: The column-level `.unique()` must be removed and replaced with a table-level `uniqueIndex` — Drizzle generates `DROP CONSTRAINT … ADD CONSTRAINT` correctly but needs careful review of the generated SQL before `db:migrate`.
- **Existing source CHECK constraint**: The Drizzle `check()` call is fully replaced (not additive) when regenerating, so updating the enum list in code automatically recreates the constraint in the migration. The old constraint name `waitlist_source_check` will be dropped and recreated.
- **Email send failure**: Same pattern as consumer waitlist — catch, log, don't fail the HTTP response. Row committed = source of truth.
- **Form re-submission while `isSubmitting`**: Disable the submit button during the fetch to prevent double-posts.
- **Phone validation**: Accept any non-empty string (international formats vary). No regex enforcement at this stage — keep it permissive.

## Acceptance criteria

- [ ] Clicking "Get Listed Early" opens a Dialog modal (not a new tab/Google Form)
- [ ] Form has all six fields: Full Name, Business Name, Phone, Email, Preferred Contact (Phone/WhatsApp/Email radio), Preferred Time (Morning/Afternoon/Evening/Anytime radio)
- [ ] All fields required; form cannot submit with any field empty
- [ ] Submit POSTs to `/api/v1/business-waitlist` with correct JSON body
- [ ] Successful submission shows thank-you message inside modal; form is replaced
- [ ] A new `waitlist` row is inserted with `type = 'business'` and all fields populated
- [ ] A welcome email is sent to the submitted email address on first submission
- [ ] Re-submitting the same email returns 200 silently (no DB row added, no second email)
- [ ] Existing consumer waitlist (`/api/v1/waitlist`, `waitlist-card.tsx`) is unaffected
- [ ] `pnpm typecheck` passes across all packages
- [ ] `pnpm test` passes (no regressions in waitlist-related tests)

## Open questions

1. **Welcome email copy**: The business welcome should differ from the consumer
   "you're on the waitlist" message — should it set expectations about being
   contacted (e.g. "we'll reach out via your preferred channel within X days")?
   Or keep it generic for now?
2. **Source value**: Using `'business-listing-cta'` — confirm this is the right
   label (it records the capture point, not the type of signup).
3. **Phone format**: Accept any non-empty string, or validate for US format given
   Atlanta focus? Currently planned as permissive.

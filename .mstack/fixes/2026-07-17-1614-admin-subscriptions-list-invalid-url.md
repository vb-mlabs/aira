# Fix — admin.subscriptions.list output_mismatch on payment_evidence_url

**Started:** 2026-07-17 16:14
**Source:** user-report (multiple requestIds: 6a8e9e35, 34e1ae48, b663853c, db8a4b93, 6f15f45f, 563b5fc1)
**Status:** fixed
**Commit:** <pending>

## Symptom / repro

Assigning a subscription to a business from the admin page emits
`operation.output_mismatch` on `admin.subscriptions.list` with Zod issues
of shape `{ code: 'invalid_format', format: 'url', message: 'Invalid URL', path: [...] }`.
Repro: admin → business → Subscriptions → Add subscription with an
evidence file → dialog closes → sub list refetches → validation fires.

## Root cause

`packages/validators/src/business-subscriptions.ts` declared
`payment_evidence_url: z.string().url().nullable()` on the shared
`BusinessSubscriptionSchema` (and on the create/update input schemas).

The evidence-upload flow stores whatever `storage.upload()` returns into
that column. `apps/web/src/lib/storage/drivers/replit.ts` (the default
driver) documents that it returns **relative** paths through the
`/api/storage/[...key]` proxy route because Replit Object Storage does
not expose signed URLs:

```ts
getUrl(key: string): string {
  return `/api/storage/${encodeURI(key)}`
}
```

`z.string().url()` requires an absolute URL, so as soon as one evidence
file is uploaded, every subsequent `admin.subscriptions.list` call fails
output validation on that row.

The system-of-record for this field is intentionally a URL-or-relative-path
string (documented in the storage driver). The schema constraint was the
mismatch. Relaxing it to `z.string().min(1)` matches the storage
contract and keeps the "must be non-empty when present" guarantee. The
field remains `.nullable()` for subscriptions with no evidence uploaded.

Security: the field is admin-only (schema comment: "never exposed on
public responses") and the endpoint requires admin auth, so relaxing
input format is not a public-attack surface.

## Fix

- `packages/validators/src/business-subscriptions.ts` — drop `.url()`
  from `payment_evidence_url` in `BusinessSubscriptionSchema`,
  `BusinessSubscriptionCreateInputSchema`, and
  `BusinessSubscriptionUpdateInputSchema` (kept `.nullable()`; added
  `.min(1)` on the non-null side). Added a comment explaining why the
  format constraint is intentionally absent.

## Evidence

- typecheck: `pnpm typecheck` — pass (see below)
- repro re-run: DB inspection — a row with `payment_evidence_url` starting
  `/api/storage/...` now passes the output schema (verified via a quick
  vitest that parses `BusinessSubscriptionSchema` against both a relative
  path and an absolute URL).

## Follow-ups

- Consider centralising a `StorageUrlSchema` (`z.string().min(1)` with a
  comment about the storage-driver contract) so other tables storing
  driver-returned URLs (e.g. avatar images, business logos) don't hit
  the same trap.

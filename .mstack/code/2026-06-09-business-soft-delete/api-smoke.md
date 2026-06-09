# API smoke test — business soft-delete (F13 partial)

Authenticated as the e2e test user (temporarily promoted to admin for
PATCH/POST calls; demoted at end). Against the Replit dev URL.

## A) POST archive

```
POST /api/v1/admin/businesses/biz-001/archive
body: { "id": "biz-001" }
→ 200 OK
  business.deleted_at: <ISO timestamp>
```

## B) Public category listing drops the archived row

```
GET /api/v1/businesses?category=restaurants
→ items: 2 (biz-002, biz-003)  ← was 3 before archive
```

## C) Public featured strip drops the archived row

```
GET /api/v1/businesses?featured=true&limit=6
→ items: 6, ids include biz-002 (tier2) but NOT biz-001 (was tier1)
```

biz-001 was tier1 — the partial index + `deleted_at IS NULL` filter
correctly removed it from featured.

## D) Public deep-link returns null

```
GET /api/v1/businesses/biz-001
→ 200 OK { "business": null }
```

The /listings/restaurants/biz-001 RSC page will hit `notFound()` on
this null and render the 404 page.

## E) audit_log captured the archive

```
SELECT action, actor_id, target_id, metadata FROM audit_log
WHERE target_id = 'biz-001' ORDER BY at DESC LIMIT 1
→ {
    action: "business.archived",
    actor_id: "00000000-0000-4000-8000-000000000001",
    target_id: "biz-001",
    metadata: { kind: "business.archived", client: "web" }
  }
```

## F) Double-archive is idempotent in spirit (404)

```
POST /api/v1/admin/businesses/biz-001/archive  (again)
→ 404 { "error": { "code": "businesses.not_found",
                   "message": "Business not found or already archived" } }
```

**Notable**: the audit row WAS written for the failed second attempt
(the `audit()` helper runs before the mutation). This is the
documented tradeoff in `audit_log.ts`: "audit succeeded but mutation
failed → phantom audit row" is the lesser evil vs "mutation succeeded
with no trail". Working as designed.

## G) POST restore reverses

```
POST /api/v1/admin/businesses/biz-001/restore
body: { "id": "biz-001" }
→ 200 OK
  business.deleted_at: null
```

## H) Public surfaces start returning the row again

```
GET /api/v1/businesses?category=restaurants
→ items: 3 (biz-001, biz-002, biz-003)
```

## Audit history (final state)

3 rows for 2 successful actions + 1 failed-double-archive attempt:
```
business.restored  ← G
business.archived  ← A (successful mutation)
business.archived  ← F (audit wrote, mutation rolled back)
```

The phantom row is the audit-before-mutation tradeoff — visible in
`/admin/audit` if anyone investigates "why two archive rows when only
one archive succeeded".

## Cleanup

- biz-001 restored to active state (deleted_at = NULL).
- e2e test user (`00000000-0000-4000-8000-000000000001`) demoted to
  `end_user`.

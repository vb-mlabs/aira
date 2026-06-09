# API smoke test — business rating (F11)

Authenticated as the e2e test user (temporarily promoted to admin for
the PATCH calls; demoted at end). Against the Replit dev URL.

## A) PATCH valid rating

```
PATCH /api/v1/admin/businesses/biz-001
body: { "id": "biz-001", "rating": 4.5 }
→ 200 OK
  business.rating: 4.5
```

## B) GET reflects persisted rating

```
GET /api/v1/businesses?category=restaurants
→ items:
  biz-001 Spice Garden → rating: 4.5  ← updated
  biz-002 Curry Palace → rating: null
  biz-003 Thali House  → rating: null
```

The number type comes back as a JS number directly (not the string the
driver returns for plain numeric columns) — confirms `mode: "number"`
is wired correctly end-to-end.

## C) PATCH null clears the rating

```
PATCH /api/v1/admin/businesses/biz-001
body: { "id": "biz-001", "rating": null }
→ 200 OK
  business.rating: null
```

## D) PATCH out-of-range value → 400

```
PATCH /api/v1/admin/businesses/biz-001
body: { "id": "biz-001", "rating": 7 }
→ 400 Bad Request
  { error: { code: "validation.input",
             message: "Too big: expected number to be <=5",
             field: "rating" } }
```

Zod's `z.number().min(0).max(5)` validator catches this at the boundary
before it ever reaches the DB.

## E) Defense-in-depth — DB CHECK constraint

Bypassed the validator with a direct SQL UPDATE:

```
UPDATE businesses SET rating = 7 WHERE id = 'biz-001';
→ ERROR: new row for relation "businesses" violates check constraint
  "businesses_rating_check"
```

The CHECK constraint defends even when the application layer is
bypassed (e.g. someone running raw SQL in Drizzle Studio).

## Cleanup

- `biz-001` rating reset to null at end of run.
- e2e test user (`00000000-0000-4000-8000-000000000001`) demoted back
  to `end_user`.

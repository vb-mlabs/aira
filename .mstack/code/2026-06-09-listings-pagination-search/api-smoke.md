# API smoke test — /api/v1/businesses

Authenticated as `e2e-test-primary@mlabs.test` against `http://localhost:5000`.

## Pagination path

```
GET /api/v1/businesses?category=restaurants&pageSize=2&page=1
→ items: 2 (Spice Garden, Curry Palace) · total: 3 · page: 1 · pageSize: 2

GET /api/v1/businesses?category=restaurants&pageSize=2&page=2
→ items: 1 (Thali House) · total: 3 · page: 2 · pageSize: 2

GET /api/v1/businesses?category=restaurants&page=999&pageSize=2
→ items: 0 · total: 3 · page: 999 · pageSize: 2  (out-of-range → empty page)
```

## Search path

```
GET /api/v1/businesses?category=restaurants&q=spice
→ items: 1 (Spice Garden) · total: 1 · page: 1 · pageSize: 12

GET /api/v1/businesses?category=restaurants&q=halal
→ items: 0 · total: 0 · page: 1 · pageSize: 12
```

## Verified filter

```
GET /api/v1/businesses?category=restaurants&verified=1
→ items: 2 (Spice Garden, Curry Palace) · total: 2 · page: 1 · pageSize: 12
```

## Regression — existing callers

```
GET /api/v1/businesses?featured=true&limit=6        (/home featured strip)
→ items: 6 · total: 6 · page: 1 · pageSize: 6 — synthesized meta ✓

GET /api/v1/businesses                              (/admin dashboard + list)
→ items: 6 · total: 6 · page: 1 · pageSize: 6 — synthesized meta ✓
```

Every branch returns the strict output schema shape without runtime
Zod failures. Both new (paginated) and existing (featured, no-filter)
callers work end-to-end.

## Browser screenshot path

Skipped — BetterAuth's `__Secure-` cookie prefix + Replit's HTTPS dev
domain don't map cleanly onto localhost HTTP for headless Playwright.
The QA spec setup at `.mstack/qa/2026-06-08-1600/prepare-auth.mjs` is
shaped for the Replit URL, not localhost. The API smoke above proves
the server-side path end-to-end; visual rendering can be eyeballed at
`http://localhost:5000/listings/restaurants` with a real signed-in
session.

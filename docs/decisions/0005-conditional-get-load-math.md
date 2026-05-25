# 0005 — Conditional GET load math (Phase 5.5)

**Status:** accepted (assumed math, not measured)
**Date:** 2026-05-11
**Replaces:** N/A
**Supersedes:** N/A
**Related:** docs/decisions/0002-polling-load.md, TODOS.md #1

## Context

Phase 5.5 adds an Expo mobile app that polls the same `/api/notifications/unread-count` and `/api/messages/conversations` endpoints as web. The same user can have both clients open concurrently. The original 0002 math assumed web-only.

## The updated math

| Surface | Interval | Requests/user/hour | Notes |
|---|---|---|---|
| Notifications badge (web tab + mobile foregrounded) | 5s × 2 clients | 1,440 | Doubles |
| Notifications badge (mobile backgrounded) | 60s | 60 | AppState-aware cadence drop |
| Messages list (background) | 10s | 360 | One client at a time typically |
| Messages thread (active chat) | 2s | 1,800 | One client at a time typically |

**Worst case single user, both clients active, no conditional GET:** ~3,640 req/hour ≈ 1 req/s.

**Per 1,000 DAU worst case:** ~3.6M req/hour ≈ 1,000 req/s sustained against Neon.

Replit Reserved VM throughput ceiling is ~1,500 req/s for trivial handlers, less for handlers that hit Postgres. Neon's free tier connection pool caps at 100 concurrent connections — sustained 1,000 req/s requires connection pooling at the app layer (already in place via Drizzle).

## Decision

Add **conditional GET (If-Modified-Since / ETag)** to the two highest-frequency endpoints. The 304 path returns before any DB query (just a single indexed timestamp compare on the `users` row, populated by DB triggers).

Expected impact: ~95% of polls return 304 in steady-state (most polls are "nothing changed since last time"). Per-poll cost drops from "indexed query against notifications/messages tables" to "single row read on users + 304 status".

## Critical implementation note

The freshness signal is sourced from **denormalized `notifications_updated_at` + `messages_updated_at` columns on the `users` table**, updated by **DB triggers** on `INSERT INTO notifications` and `INSERT INTO messages` respectively. App-level writes were considered and rejected (race-condition risk: notification could be visible while timestamp lags, causing permanent 304 staleness).

## Consequences

### Positive

- ~20× reduction in per-poll DB load in steady state
- Restores the per-VM ceiling reported in 0002 after mobile-induced doubling
- ETag mechanism is HTTP-standard; mobile + web clients use the same `If-Modified-Since` header pattern

### Negative

- **The math is unmeasured.** Outside voice in /plan-eng-review (2026-05-11) argued the savings may be smaller than estimated — 304 still hits the handler (auth lookup + timestamp read are not free). The "20× reduction" assumes the JSON serialization + notifications query was the dominant cost, which we have not profiled.
- DB triggers are "magic" — invisible to app-level reads. Onboarding cost: anyone working on the notifications/messages tables needs to know the trigger exists.
- Extra columns on `users` table. Two extra indexed timestamps; negligible row-width impact.

## Revisit trigger

**TODOS.md #1** captures the load-test commitment: spike 1k simulated users × 5s × 10 min, measure with and without conditional GET. Drop the mechanism in v1.2 if measurement shows <30% CPU saving.

Trigger: first fork reaches 500 DAU, OR v1.1 cycle starts — whichever first.

## See also

- `docs/decisions/0002-polling-load.md` — original web-only polling math
- `TODOS.md` — load-test commitment
- Outside-voice finding #5 in /plan-eng-review (2026-05-11)

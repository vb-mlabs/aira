# 0002 — Polling load math

**Status:** accepted
**Date:** 2026-05-09
**Replaces:** N/A
**Supersedes:** N/A

## Context

The eng review (`/plan-eng-review`) reversed the original SSE multiplexer plan in favor of polling, on the outside-voice argument that a single Reserved VM with no zero-downtime deploys would drop SSE connections on every push anyway. Polling intervals locked:

- Notifications: 5s (when authed, badge in nav)
- Messages: 2s (when chat open), 10s (background, conversation list)

Before sinking the entire features layer into polling, validate that the math doesn't blow up in our face at scale.

## The math (per single Reserved VM, single user)

| Surface | Interval | Requests/user/hour | Notes |
|---|---|---|---|
| Notifications badge (always polling) | 5s | 720 | Fires whenever any tab is authed |
| Messages list (background) | 10s | 360 | Fires when /messages route open |
| Messages thread (active chat) | 2s | 1,800 | Only when a conversation is open |

**Per-user load worst case** (one user with notifications + active chat thread open): 720 + 1,800 = **2,520 req/hour ≈ 42 req/min ≈ 0.7 req/s**.

**Typical case** (notifications only, app in background tab): 720 req/hour ≈ 12 req/min ≈ 0.2 req/s.

## Scaling per concurrent active users

Assume 80% of "active users" are in the typical case, 20% have an open chat thread.

| Concurrent users | Mixed RPS | Daily reqs | Notes |
|---|---|---|---|
| 100 | ~30 | ~2.6M | Comfortable on Reserved VM. Neon Free fine. |
| 500 | ~150 | ~13M | Reserved VM still comfortable. Neon Free strained on connections. |
| 1,000 | ~300 | ~26M | Reserved VM near its sustainable budget. Neon Launch ($19/mo) needed. |
| 2,500 | ~750 | ~65M | Reserved VM struggles. Time to graduate to multi-instance OR add a polling-aware caching layer (Redis with 1-2s TTL on notification count). |
| 5,000+ | 1,500+ | 130M+ | Beyond template defaults. Project should consider per-feature SSE OR drop to longer poll intervals (e.g., 15s notifications). |

## Replit Reserved VM RPS budget

Replit Reserved VM "Hacker" tier (the smallest Reserved VM, ~$7/mo) provides ~0.5 vCPU and ~0.5 GB RAM. Empirically a Next.js app on this tier handles ~200-400 RPS for short queries (auth-checked DB read of a single notification count) before latency degrades. The "Pro" tier (1 vCPU, 2 GB, ~$25/mo) handles ~600-1000 RPS comfortably.

**Conclusion:** The "Hacker" tier ceilings around 500-700 concurrent users for our polling profile. The "Pro" tier ceilings around 1,500-2,000.

## Neon connection ceiling per tier

| Neon tier | Compute | Direct conns | Pooled (PgBouncer) conns |
|---|---|---|---|
| Free | 0.25 CU shared | 100 | 10,000 |
| Launch ($19/mo) | 0.25 - 1 CU | 100 | 10,000 |
| Scale ($69/mo) | up to 4 CU | 100 | 10,000 |

The template uses `@neondatabase/serverless` HTTP driver (not the pooled WebSocket one) — each query is a stateless HTTP round-trip, so connection-count is irrelevant for the polling endpoints. Connection limits matter only for long-lived listeners, which we explicitly avoided. **Neon connection count is not the bottleneck for our polling architecture at any scale we ship.**

## The "where does it actually break?" answer

For the v1 template at default polling intervals on Replit Reserved VM "Hacker" + Neon Launch:

- **Comfortable:** up to ~500 concurrent active users
- **Stretched but workable:** up to ~1,000
- **Time to upgrade hosting tier:** beyond ~1,000

For typical MVP scale (sub-500 active users, often sub-100), this is fine. For projects that grow, the upgrade path is "bump Replit tier" before "redesign the realtime layer."

## What would make us reconsider SSE

- A first project ships and exceeds 1k concurrent users in regular usage (good problem)
- Polling causes user-visible jank (e.g., new message takes >3s to appear in active chat) — escalate from 2s to 1s before reconsidering architecture
- A specific feature (e.g., live-cursor collaboration) genuinely needs sub-500ms updates — SSE for THAT feature only, not template-wide

## Decision

Polling is the right default for v1. Document the user-count ceiling in the handover pack so clients understand when they need to upgrade. Revisit only if a real project hits the ceiling.

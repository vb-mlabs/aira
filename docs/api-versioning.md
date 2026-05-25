# API versioning

## Scope

All JSON API endpoints live at `/api/v1/*`. Two namespaces stay un-prefixed
by design:

| Path | Why no version prefix |
|------|----------------------|
| `/api/auth/*` (including `/api/auth/refresh`) | Better Auth's own handler reads from `/api/auth/[...all]`; the mobile JWT refresh endpoint sits alongside it. Better Auth has its own versioning model — we don't impose a second one on top. |
| `/api/storage/[...key]` | Avatar URLs are persisted in the user table as `/api/storage/<key>`. Changing this path is a data migration, not a route refactor. Treat the storage proxy as a static asset surface, not a versioned API. |

## Current routes (v1)

| Method | Path | Auth | Adapter | Notes |
|--------|------|------|---------|-------|
| GET | `/api/v1/notifications/unread-count` | required | service-direct | Conditional GET with `If-Modified-Since` 304 short-circuit |
| POST | `/api/v1/notifications/mark-all-read` | required | op | `markAllReadOp` |
| GET | `/api/v1/messages/conversations` | required | service-direct | Conditional GET + inbox list |
| POST | `/api/v1/messages/conversations` | required | op | `openOrCreate1to1Op` |
| GET | `/api/v1/messages/conversations/[id]/messages` | required | service-direct | Cursor paging |
| POST | `/api/v1/messages/conversations/[id]/messages` | required | op | `sendMessageOp` |
| POST | `/api/v1/messages/conversations/[id]/read` | required | op | `markConversationReadOp` |
| PATCH | `/api/v1/profile` | required | op | `updateNameOp` |
| DELETE | `/api/v1/profile` | required | op + storage cleanup | `deleteAccountOp` |
| POST | `/api/v1/profile/password` | required | op | `changePasswordOp` |
| POST | `/api/v1/avatar` | required | route-direct | multipart/form-data |
| DELETE | `/api/v1/avatar` | required | route-direct | |

## Compatibility policy

### Within v1: additive only

The following are **always safe** within `/api/v1/*`:

- New endpoints under `/api/v1/<new-path>`
- New optional fields in request bodies (parsed via Zod with `.optional()`)
- New fields in response bodies (clients ignore unknown fields)
- New optional query parameters
- Tightening server-side validation that was previously permissive (clients
  already had to handle 400s)

The following are **breaking** and require `/api/v2/*`:

- Removing or renaming a field in a request or response body
- Making an optional field required in a request body
- Removing or renaming an endpoint
- Tightening server-side validation that rejects previously-accepted input
- Changing the wire shape of an existing error code

### Moving to v2

When v2 lands:

1. Routes ship side-by-side: `/api/v1/*` and `/api/v2/*` both work
2. Mobile reads `EXPO_PUBLIC_API_VERSION` (default `"v1"`) to target one or
   the other — clients deployed before the v2 rollout keep working
3. After every mobile build older than the deprecation window has rotated
   off the store (typically ~6 months for paid app stores; track with
   App Store Connect / Play Console crash reports), the v1 routes are
   removed in a labelled commit

### Operation-level safety

Every operation's input + output is a Zod schema declared on
`defineOperation({ ... })`. The contract-test scaffold (Phase 4) asserts
that the live route returns shape-compatible JSON. Phase 7 CI will run
the contract test on every PR — any wire-shape regression that breaks
the v1 contract fails the build.

## Server Actions are unversioned

`"use server"` actions consumed by the web app (e.g.
`features/notifications/server/actions.markAllRead`) are not part of the
versioned API surface — they are an implementation detail of the web app
and can change shape on any release.

## Out of scope

- gRPC / GraphQL: not used.
- `Accept: application/vnd.mlabs.v1+json` content negotiation: rejected
  in favour of URL-prefix versioning because it's debuggable from a
  browser and works with every HTTP client out of the box.

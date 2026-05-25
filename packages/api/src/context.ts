// CallerContext — built once per request by defineOperation, passed to every
// service call. Keeping this in a universal module (no server-only guard) so
// types can be re-exported into mobile code if a service signature ever
// surfaces through a public type alias.

import type { Permission } from "./permission"

/** Which client originated the call. Today derived from the `X-Client`
 *  header at the boundary; "job" is a placeholder for future cron/queue
 *  handlers, "admin" for tooling that talks to internal-only operations. */
export type CallerSource = "web" | "mobile" | "job" | "admin"

export interface CallerContext {
  userId: string
  /** Email + role snapshot. Mirrors the better-auth session shape so callers
   *  don't have to know which transport (cookie, bearer, JWT) backed the
   *  request. */
  user: {
    id: string
    email: string
    role: Permission
  }
  /** Correlation ID — pulled from `X-Request-Id` if upstream supplied one,
   *  otherwise generated at the boundary. Pass it through to logger.with()
   *  and audit metadata so a single request can be traced end-to-end. */
  requestId: string
  source: CallerSource
}

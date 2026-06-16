import "server-only"

// audit() helper — single entry point for writing audit log rows.
//
// Critical contract: for state-changing actions, call this BEFORE the action.
// If the audit write fails, the helper throws — the caller's action does NOT
// proceed ("audit failure is silent" was a critical gap).
//
// Metadata uses a typed discriminated-union allowlist (AuditMeta).
// AuditMeta + KNOWN_AUDIT_ACTIONS now live in @aira/validators/audit-meta
// so client code (e.g. the /admin/audit renderer) can import them without
// dragging this module's server-only directive into client bundles.

import type { Database } from "./client"
import { audit_log } from "./schema/audit_log"
import type { AuditMeta } from "@aira/validators/audit-meta"

export type { AuditMeta } from "@aira/validators/audit-meta"

/** Which client surfaced the action. Derived in route
 *  handlers from the `X-Client` header set by the mobile API wrapper; defaults
 *  to "web" so existing callers keep their current row shape unchanged. */
export type AuditClient = "web" | "mobile"

export interface AuditOpts {
  actorId: string | null
  action: AuditMeta["kind"]
  target?: { type: string; id: string }
  meta?: AuditMeta
  /** Optional; defaults to "web" so existing callers compile unchanged. */
  client?: AuditClient
}

export type AuditFn = (opts: AuditOpts) => Promise<void>

/** Subset of the Database API the audit helper actually exercises. Lets
 *  callers pass either the full Database singleton OR a PgTransaction handle
 *  from db.transaction(async (tx) => …) without a type assertion. Used by
 *  F20 v2 deletePost / editPost which write audit + mutation in one
 *  transaction so a failed audit rolls back the change. */
export type AuditDb = Pick<Database, "insert">

export function createAudit(db: AuditDb): AuditFn {
  return async function audit(opts: AuditOpts): Promise<void> {
    const client: AuditClient = opts.client ?? "web"
    // metadata now always carries a discriminated body wrapped with `client` —
    // anonymize() reads inside metadata so leaving the union intact is critical.
    const metadata =
      opts.meta !== undefined ? { ...opts.meta, client } : { client }

    await db.insert(audit_log).values({
      actor_id: opts.actorId,
      action: opts.action,
      target_type: opts.target?.type ?? null,
      target_id: opts.target?.id ?? null,
      metadata,
    })
  }
}

/** Reads `X-Client: mobile` (case-insensitive). Anything else → "web".
 *  Centralised so every route does the same parse. */
export function clientFromHeaders(headers: Headers): AuditClient {
  return headers.get("x-client") === "mobile" ? "mobile" : "web"
}

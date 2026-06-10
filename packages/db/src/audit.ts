import "server-only"

// audit() helper — single entry point for writing audit log rows.
//
// Critical contract: for state-changing actions, call this BEFORE the action.
// If the audit write fails, the helper throws — the caller's action does NOT
// proceed ("audit failure is silent" was a critical gap).
//
// Metadata uses a typed discriminated-union allowlist. Adding a new action
// means extending AuditMeta; no free-form strings allowed (GDPR / anonymize-
// in-place safety: untyped jsonb could leak PII that anonymize() would miss).

import type { Database } from "./client"
import { audit_log } from "./schema/audit_log"

// Add a new variant per action you log. Keep keys snake-cased actions matching
// the `action` column ("user.role_changed" → corresponds to kind below).
export type AuditMeta =
  | { kind: "user.role_changed"; from: string; to: string }
  | { kind: "user.banned"; reason?: string }
  | { kind: "user.unbanned" }
  | { kind: "user.password_reset_sent" }
  | { kind: "user.email_changed"; from_email_hash: string }
  | { kind: "user.deleted_anonymized" }
  // session.revoked.reason values:
  //   logout            — explicit user-initiated sign-out (T9).
  //   admin             — admin-side session revocation.
  //   password_change   — Better Auth invalidates sessions on password reset.
  //   account_deleted   — anonymise-in-place flow cascades session deletion.
  //   idle_timeout      — requireAdmin() forced sign-out after 30min idle (T7).
  | { kind: "session.revoked"; reason: "logout" | "admin" | "password_change" | "account_deleted" | "idle_timeout" }
  | { kind: "user.avatar_changed" }
  | { kind: "user.avatar_removed" }
  | { kind: "user.name_changed" }
  | { kind: "user.admin_notified"; title: string }
  // Sprint 1 — authentication-event audit trail.
  //   user.signed_in       — successful sign-in (cookie or JWT).
  //   user.signed_in_failed — sign-in attempt rejected. actor_id is null for
  //                           user_not_found (we don't know who tried) and
  //                           the user's id for bad_password / banned /
  //                           email_unverified (the email matched a real
  //                           account).
  //   user.signed_up       — successful new-account creation. Bootstrap
  //                           promotion (T6) writes a separate user.role_changed
  //                           row alongside this one.
  | { kind: "user.signed_in" }
  | { kind: "user.signed_in_failed"; reason: "bad_password" | "user_not_found" | "banned" | "email_unverified" }
  | { kind: "user.signed_up" }
  // Admin curation of the business directory. target_id is the business.id.
  //   business.archived — soft-delete (deleted_at stamped, public surfaces drop the row).
  //   business.restored — soft-delete reversed (deleted_at cleared).
  // No extra metadata fields: action + target_id + actor_id are the full story.
  | { kind: "business.archived" }
  | { kind: "business.restored" }
  // S4 — subscription + sponsorship audit trail.
  //   business.subscription_recorded — admin manually records a payment.
  //   business.subscription_voided   — admin deletes a subscription row.
  //   business.sponsorship_assigned  — admin assigns a category sponsorship.
  //   business.sponsorship_cancelled — admin cancels an active/scheduled sponsorship.
  | {
      kind: "business.subscription_recorded"
      payment_status: "paid" | "pending" | "overdue"
      plan_id: string | null
      end_date: string
    }
  | { kind: "business.subscription_voided" }
  | {
      kind: "business.sponsorship_assigned"
      category_id: string
      tier_id: string
      end_date: string
      amount_cents: number
    }
  | { kind: "business.sponsorship_cancelled" }

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

export function createAudit(db: Database): AuditFn {
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

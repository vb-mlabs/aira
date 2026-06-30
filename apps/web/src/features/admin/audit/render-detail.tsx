// F22 — human-readable summary for each audit_log row.
//
// One case per AuditMeta.kind. The `never`-typed default branch is an
// exhaustiveness gate: adding a new variant to AuditMeta without a case
// here fails tsc. Two kinds (session.revoked, user.signed_in_failed)
// have a nested switch on their `reason` discriminator so each variant
// produces a distinct sentence.
//
// Visual treatment: signed_in / signed_in_failed / signed_up render in
// `text-muted-foreground` so high-volume auth events don't drown out
// admin-action signal in the scan.

import type { AuditMeta } from "@aira/validators/audit-meta"

interface RenderDetailProps {
  action: string
  metadata: unknown
}

export function RenderAuditDetail({ action, metadata }: RenderDetailProps) {
  // metadata is jsonb — type-narrow to the union. The audit pipeline
  // never writes a row without metadata.kind, but the safety net is
  // visible in the default branch (renders the raw action string when
  // the cast fails).
  const m = metadata as
    | (AuditMeta & { client?: "web" | "mobile" })
    | null
  if (!m || typeof m !== "object" || !("kind" in m)) {
    return <code className="text-muted-foreground">{action}</code>
  }

  switch (m.kind) {
    // ─── user.* (general) ─────────────────────────────────────────────
    case "user.role_changed":
      return (
        <>
          Changed role from <code>{m.from}</code> to <code>{m.to}</code>
        </>
      )
    case "user.banned":
      return m.reason ? <>Banned ({m.reason})</> : <>Banned</>
    case "user.unbanned":
      return <>Unbanned</>
    case "user.password_reset_sent":
      return <>Sent password-reset email</>
    case "user.email_changed":
      return <>Changed email address</>
    case "user.deleted_anonymized":
      return <>Account deleted (anonymised)</>
    case "user.avatar_changed":
      return <>Changed avatar</>
    case "user.avatar_removed":
      return <>Removed avatar</>
    case "user.name_changed":
      return <>Changed display name</>
    case "user.admin_notified":
      return <>Notified: {m.title}</>

    // ─── session.revoked — nested reason branch ──────────────────────
    case "session.revoked":
      switch (m.reason) {
        case "logout":
          return <>Signed out</>
        case "admin":
          return <>Session revoked by admin</>
        case "password_change":
          return <>Session ended (password changed)</>
        case "account_deleted":
          return <>Session ended (account deleted)</>
        case "idle_timeout":
          return <>Session timed out (30 min idle)</>
      }

    // ─── user.* (auth events — muted) ────────────────────────────────
    case "user.signed_in":
      return <span className="text-muted-foreground">Signed in</span>
    case "user.signed_up":
      return <span className="text-muted-foreground">Signed up</span>
    case "user.signed_in_failed":
      switch (m.reason) {
        case "bad_password":
          return (
            <span className="text-muted-foreground">
              Sign-in failed (bad password)
            </span>
          )
        case "user_not_found":
          return (
            <span className="text-muted-foreground">
              Sign-in attempt for unknown email
            </span>
          )
        case "banned":
          return (
            <span className="text-muted-foreground">
              Sign-in blocked (account banned)
            </span>
          )
        case "email_unverified":
          return (
            <span className="text-muted-foreground">
              Sign-in blocked (email not verified)
            </span>
          )
      }

    // ─── business.* ──────────────────────────────────────────────────
    case "business.archived":
      return <>Archived business</>
    case "business.restored":
      return <>Restored business</>
    case "business.contact_person_changed":
      return (
        <>
          Changed contact person:{" "}
          {m.from !== null ? (
            <>
              <code>{truncate(m.from, 40)}</code> →{" "}
            </>
          ) : (
            <>(empty) → </>
          )}
          {m.to !== null ? (
            <code>{truncate(m.to, 40)}</code>
          ) : (
            <>(empty)</>
          )}
        </>
      )
    case "business.subscription_recorded":
      return (
        <>
          Recorded subscription as <em>{m.payment_status}</em> until{" "}
          {formatDate(m.end_date)}
        </>
      )
    case "business.subscription_voided":
      return <>Voided subscription</>
    case "business.sponsorship_assigned":
      return (
        <>
          Assigned sponsorship through {formatDate(m.end_date)} for{" "}
          {formatCents(m.amount_cents)}
        </>
      )
    case "business.sponsorship_cancelled":
      return <>Cancelled sponsorship</>
    case "business.subscription_followup":
      return (
        <>
          Logged <em>{m.outcome}</em> follow-up
          {m.note ? <> — &ldquo;{m.note}&rdquo;</> : null}
          {m.scheduled_next ? (
            <> · next attempt {formatDate(m.scheduled_next)}</>
          ) : null}
        </>
      )
    case "business.owner_assigned":
      return m.prev_owner_user_id ? (
        <>
          Reassigned owner to <code>{m.owner_email}</code> (replaced previous
          owner)
        </>
      ) : (
        <>
          Assigned <code>{m.owner_email}</code> as owner
        </>
      )
    case "business.owner_unassigned":
      return <>Unassigned business owner</>
    case "business.broadcast_sent":
      return (
        <>
          Broadcast &ldquo;{truncate(m.title, 60)}&rdquo; to{" "}
          {m.recipient_count}{" "}
          {m.recipient_count === 1 ? "owner" : "owners"}
        </>
      )

    // ─── app_setting.* ───────────────────────────────────────────────
    case "app_setting.updated":
      return (
        <>
          Updated <code>{m.key}</code>:{" "}
          {m.old !== null ? (
            <>
              <code>{truncate(m.old, 40)}</code> →{" "}
            </>
          ) : (
            <>(unset) → </>
          )}
          <code>{truncate(m.new, 40)}</code>
        </>
      )

    // ─── community.* ─────────────────────────────────────────────────
    case "community.post_deleted":
      return (
        <>
          Deleted post &ldquo;{truncate(m.title, 60)}&rdquo; ({m.status},{" "}
          {m.interest_count}{" "}
          {m.interest_count === 1 ? "helper" : "helpers"})
        </>
      )
    case "community.post_edited":
      return (
        <>
          Edited post fields: {m.fields.join(", ")}
        </>
      )
    case "community.post_reverted_to_pending":
      return (
        <>
          Post returned to moderation queue (was approved on{" "}
          {formatDate(m.prev_approved_at)})
        </>
      )
    case "community.comment_hidden":
      return (
        <>
          Hid comment &ldquo;{truncate(m.body_snapshot, 60)}&rdquo;
        </>
      )
    case "community.comment_restored":
      return <>Restored a previously hidden comment</>
    case "community.comment_deleted":
      return (
        <>
          Deleted {m.was_reply ? "reply" : "top-level comment"} &ldquo;
          {truncate(m.body_snapshot, 60)}&rdquo;
        </>
      )

    // ─── waitlist.* ──────────────────────────────────────────────────
    case "waitlist.delete":
      return (
        <>
          Deleted {m.waitlist_type} waitlist entry (
          <code>{m.email}</code>)
        </>
      )

    // ─── exhaustiveness gate ─────────────────────────────────────────
    default: {
      // Adding a new variant to AuditMeta without a case above triggers
      // a tsc error here. The runtime fallback renders the raw action.
      const _exhaustive: never = m
      void _exhaustive
      return <code className="text-muted-foreground">{action}</code>
    }
  }
}

/** Stable UTC date formatter — avoids the toLocaleDateString hydration
 *  trap (2026-06-14 lesson). Falls back to the raw string if it can't
 *  parse, so old/corrupt rows still render *something*. */
function formatDate(iso: string): string {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s
  return `${s.slice(0, n - 1)}…`
}

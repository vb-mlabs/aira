// F22 — per-target_type link resolver for audit_log rows.
//
// Falls back to a short hex id when no detail page exists. session rows
// render a muted "session" placeholder (the id is internal noise the
// admin never needs to inspect). app_setting renders the full key
// (not a UUID — the key IS the human-readable target).

import Link from "next/link"
import type { AdminAuditRow } from "@aira/validators/admin"

interface RenderTargetProps {
  row: AdminAuditRow
}

export function RenderAuditTarget({ row }: RenderTargetProps) {
  if (!row.target_type || !row.target_id) {
    return <span className="text-muted-foreground">—</span>
  }
  const shortId = row.target_id.slice(0, 8)

  switch (row.target_type) {
    case "user":
      return (
        <Link
          href={`/admin/users/${row.target_id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {shortId}
        </Link>
      )

    case "business":
      return (
        <Link
          href={`/admin/businesses/${row.target_id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {shortId}
        </Link>
      )

    case "business_subscription":
    case "sponsorship":
      // target_business_id is the LEFT-JOINed business id (T2). When
      // null the target row no longer exists; show the short id only.
      return row.target_business_id ? (
        <Link
          href={`/admin/businesses/${row.target_business_id}`}
          className="font-mono text-xs text-primary hover:underline"
        >
          {shortId}
        </Link>
      ) : (
        <code className="font-mono text-xs">{shortId}</code>
      )

    case "community_post":
      // No per-post admin detail page yet — link to the moderation list.
      return (
        <Link
          href="/admin/community"
          className="font-mono text-xs text-primary hover:underline"
        >
          {shortId}
        </Link>
      )

    case "app_setting":
      // target_id is the AppSetting key (e.g. "reminder_schedule"), not
      // a UUID. Render in full; no per-key detail page in MVP.
      return <code className="font-mono text-xs">{row.target_id}</code>

    case "session":
      // Session ids are internal — admin never needs to chase one.
      return (
        <span className="text-muted-foreground">session</span>
      )

    default:
      return <code className="font-mono text-xs">{shortId}</code>
  }
}

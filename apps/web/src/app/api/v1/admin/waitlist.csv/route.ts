// Waitlist CSV export — admin downloads the current tab's signups for
// email outreach. Mirrors /api/v1/admin/businesses/renewals.csv.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { waitlist as waitlistService } from "@aira/services"
import { db } from "@/lib/db"

export const runtime = "nodejs"

const CONSUMER_HEADERS = ["email", "source", "signed_up_at"] as const
const BUSINESS_HEADERS = [
  "email",
  "full_name",
  "business_name",
  "phone",
  "preferred_contact",
  "preferred_time",
  "source",
  "signed_up_at",
] as const

function escape(v: unknown): string {
  const s = v == null ? "" : String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(req: Request) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const type = url.searchParams.get("type")
  if (type !== "consumer" && type !== "business") {
    return ApiError.badRequest(
      "waitlist.invalid_type",
      "type must be 'consumer' or 'business'",
    ).toResponse()
  }

  const rows = await waitlistService.exportAdmin(db, { type })

  const headers = type === "consumer" ? CONSUMER_HEADERS : BUSINESS_HEADERS

  const lines = [
    headers.join(","),
    ...rows.map((r) => {
      const values =
        type === "consumer"
          ? [r.email, r.source, r.created_at]
          : [
              r.email,
              r.full_name ?? "",
              r.business_name ?? "",
              r.phone ?? "",
              r.preferred_contact ?? "",
              r.preferred_time ?? "",
              r.source,
              r.created_at,
            ]
      return values.map(escape).join(",")
    }),
  ]

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="waitlist-${type}-${today}.csv"`,
    },
  })
}

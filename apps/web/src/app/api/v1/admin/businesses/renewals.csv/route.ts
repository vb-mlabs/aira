import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { requireAdminJSON } from "@/lib/auth/server"
import { businessSubscriptions as subsService } from "@aira/services"
import { db } from "@/lib/db"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const auth = await requireAdminJSON(req)
  if (auth instanceof Response) return auth

  const url = new URL(req.url)
  const withinDays = Number(url.searchParams.get("renewing") ?? "30")
  if (!Number.isInteger(withinDays) || withinDays < 1 || withinDays > 365) {
    return ApiError.badRequest("renewals.invalid_days", "renewing must be 1–365").toResponse()
  }

  const rows = await subsService.findRenewingSoon(db, { withinDays })

  const headers = [
    "business_id",
    "business_name",
    "plan_name",
    "payment_status",
    "end_date",
    "days_remaining",
    "contact_phone",
    "contact_email",
    "payment_evidence_url",
  ]

  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.business_id,
        r.business_name,
        r.plan_name ?? "",
        r.payment_status,
        r.end_date,
        r.days_remaining,
        r.contact_phone ?? "",
        r.contact_email ?? "",
        r.payment_evidence_url ?? "",
      ]
        .map(escape)
        .join(","),
    ),
  ]

  const today = new Date().toISOString().slice(0, 10)
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="renewals-${today}.csv"`,
    },
  })
}

// POST /api/v1/business-waitlist — pre-launch business listing interest form.
//
// Public, unauthenticated route. Cannot use the defineOperation adapter —
// same reason as /api/v1/waitlist: runFromRequest 401s when getSession returns
// null. Documented exception (see /api/v1/waitlist/route.ts for full note).
//
// Behavior:
//   - JSON body validated by BusinessWaitlistSignupSchema.
//   - Honeypot _h non-empty → return 200 silently (do not reveal the trap).
//   - Email lowercased + idempotent insert via ON CONFLICT (email, type) DO NOTHING.
//   - Welcome email sent SYNCHRONOUSLY on first insert; failures logged but
//     do not error the response (the row is the source of truth).
//   - Always returns 200 { ok: true } on success path.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { db } from "@/lib/db"
import { waitlist } from "@aira/db/schema"
import { BusinessWaitlistSignupSchema } from "@aira/validators"
import { sendBusinessWaitlistWelcomeEmail } from "@/lib/email"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function POST(req: Request) {
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return ApiError.badRequest(
      "validation.json",
      "Request body is not valid JSON",
    ).toResponse()
  }

  const parsed = BusinessWaitlistSignupSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return ApiError.badRequest(
      "validation.input",
      first?.message ?? "Invalid input",
      first?.path?.join(".") || undefined,
    ).toResponse()
  }

  const {
    full_name,
    business_name,
    phone,
    email,
    preferred_contact,
    preferred_time,
    source,
    _h,
  } = parsed.data

  if (_h && _h.length > 0) {
    logger.warn("business_waitlist.honeypot_tripped", { source })
    return NextResponse.json({ ok: true })
  }

  const inserted = await db
    .insert(waitlist)
    .values({
      type: "business",
      email: email.toLowerCase(),
      source,
      full_name,
      business_name,
      phone,
      preferred_contact,
      preferred_time,
    })
    .onConflictDoNothing({ target: [waitlist.email, waitlist.type] })
    .returning({ id: waitlist.id })

  if (inserted.length > 0) {
    try {
      await sendBusinessWaitlistWelcomeEmail({ to: email })
    } catch (err) {
      logger.error("business_waitlist.email_send_failed", {
        email,
        source,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

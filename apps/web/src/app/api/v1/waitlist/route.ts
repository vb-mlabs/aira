// POST /api/v1/waitlist — pre-launch email capture for the marketing page.
//
// Public, unauthenticated route. Cannot use the defineOperation adapter:
// runFromRequest in packages/api/src/operation.ts always 401s when getSession
// returns null, and the Permission enum is "user" | "admin" only — there's
// no "public" value. Route-direct is the only path until/unless that adapter
// grows public-route support. Documented exception, same shape as the one
// at /api/v1/notifications/unread-count/route.ts (different reason — that
// one's exemption is for HTTP-caching short-circuit logic).
//
// Behavior:
//   - JSON body { email, source?, _h? } parsed by WaitlistSignupSchema.
//   - Honeypot _h non-empty → return 200 silently (do not reveal the trap).
//   - Email lowercased + idempotent insert via ON CONFLICT DO NOTHING.
//   - Welcome email sent SYNCHRONOUSLY on first insert; failures logged but
//     do not error the response (the row is the source of truth — if Postmark
//     is down we can backfill the mail-merge from the table).
//   - Always returns 200 { ok: true } on success path. No info-leak about
//     prior signups, no info-leak about Postmark configuration state.

import { NextResponse } from "next/server"
import { ApiError } from "@aira/api"
import { db } from "@/lib/db"
import { waitlist } from "@aira/db/schema"
import { WaitlistSignupSchema } from "@aira/validators"
import { sendWaitlistWelcomeEmail } from "@/lib/email"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function POST(req: Request) {
  // Reject anything that isn't JSON; the form always sends JSON.
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return ApiError.badRequest(
      "validation.json",
      "Request body is not valid JSON",
    ).toResponse()
  }

  const parsed = WaitlistSignupSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return ApiError.badRequest(
      "validation.input",
      first?.message ?? "Invalid input",
      first?.path?.join(".") || undefined,
    ).toResponse()
  }

  const { email, source, _h } = parsed.data

  // Honeypot — silent 200 on spam. Log so we can review at sample volume
  // and adjust the field name if real bots target `_h` specifically.
  if (_h && _h.length > 0) {
    logger.warn("waitlist.honeypot_tripped", { source })
    return NextResponse.json({ ok: true })
  }

  // Idempotent insert. Returning [] = already on the list; returning [row]
  // = new signup that needs the welcome email.
  const inserted = await db
    .insert(waitlist)
    .values({ email: email.toLowerCase(), source })
    .onConflictDoNothing({ target: waitlist.email })
    .returning({ id: waitlist.id })

  // Send welcome email only on first insert. Failure here doesn't fail the
  // request — the row is committed and we can backfill if email delivery
  // is broken at the time of signup.
  if (inserted.length > 0) {
    try {
      await sendWaitlistWelcomeEmail({ to: email })
    } catch (err) {
      logger.error("waitlist.email_send_failed", {
        email,
        source,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return NextResponse.json({ ok: true })
}

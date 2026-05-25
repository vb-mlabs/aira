// POST /api/auth/refresh — issues a short-lived access JWT in exchange for a
// valid Better Auth session. Mobile flow:
//
//   1. Mobile signs in via /api/auth/sign-in/email → receives session cookie
//      (and/or session token in response). Stores the session token in
//      expo-secure-store as the refresh credential (7-day lifetime).
//   2. Mobile POSTs here with Authorization: Bearer <session-token>. The
//      bearer plugin converts the header into a synthetic cookie; we then run
//      auth.api.getSession() against it.
//   3. If the session is valid AND the user isn't banned, we sign a JWT
//      (1h expiry, see src/lib/auth/jwt.ts) and return it.
//   4. Mobile uses the JWT in Authorization: Bearer <jwt> for all /api/*
//      calls. On 401, mobile calls this endpoint again with the refresh
//      session token to get a new JWT.
//   5. Admin ban path: features/admin/server/actions.banUser DELETEs all the
//      user's session rows. Mobile's next call here returns 401 → mobile
//      clears SecureStore and lands on login.
//
// Security notes:
//   - Refresh-token rotation: we do NOT rotate the refresh token (session
//     token) on each refresh. Better Auth's session.updateAge already advances
//     the session expiry on every getSession() hit, so the 7-day window slides
//     forward naturally. Explicit rotation would add complexity without a
//     proportional benefit given the stateful session model.
//   - Token leakage: a stolen JWT is valid for up to 1 hour. A stolen session
//     token is revocable instantly via DELETE FROM session (Better Auth
//     admin/audit flow). Both fronts have a path.
//
// Phase 5.5 Lane B: refactored to the locked ApiErrorResponse shape.

import { NextResponse } from "next/server"
import { ApiError } from "@mlabs/api"
import { auth } from "@/lib/auth"
import { signAccessToken } from "@/lib/auth/jwt"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: req.headers })
  if (!session?.user) {
    return ApiError.unauthorized().toResponse()
  }

  const user = session.user as {
    id: string
    email: string
    role?: string
    banned_at?: Date | null
  }

  if (user.banned_at) {
    logger.warn("Refresh requested by banned user", { userId: user.id })
    return new ApiError({
      status: 403,
      code: "auth.account_banned",
      message: "Account is banned",
    }).toResponse()
  }

  const { token, expiresIn } = await signAccessToken({
    id: user.id,
    email: user.email,
    role: user.role ?? "user",
  })

  return NextResponse.json({
    accessToken: token,
    expiresIn,
    tokenType: "Bearer",
  })
}

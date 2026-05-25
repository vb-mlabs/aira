import "server-only"

// Phase 5.5: JWT access tokens for mobile.
//
// Mobile holds two credentials:
//  - Refresh: the long-lived Better Auth session token (7d), in SecureStore.
//  - Access: a short-lived JWT (1h) issued by /api/auth/refresh.
//
// JWT format: HS256 signed with the auth secret. Payload carries `sub`
// (user id), `role`, `email`, `iat`, `exp`. Verification is stateless (no DB
// hit), so every authed /api/* call on mobile costs one HMAC verify, not one
// Postgres query. Revocation on admin ban happens via session-row delete: the
// refresh endpoint requires a valid session row, so a banned user cannot
// obtain a new JWT after their current one expires (max 1h window).

import { SignJWT, jwtVerify, type JWTPayload } from "jose"

const ISSUER = "mlabs-mobile"
const ALG = "HS256"
const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60 // 1h

export interface AccessTokenPayload extends JWTPayload {
  sub: string
  email: string
  role: string
}

export interface CreateJwtOptions {
  /** HMAC secret (BETTER_AUTH_SECRET). Optional at the type level so the
   *  env validator's optional shape composes; calls to sign/verify with an
   *  empty secret will fail at runtime as expected. */
  secret?: string | undefined
  /** Token lifetime in seconds. Defaults to 3600 (1h). */
  accessTtlSeconds?: number
}

export interface JwtHelpers {
  signAccessToken(user: {
    id: string
    email: string
    role: string
  }): Promise<{ token: string; expiresIn: number }>
  verifyAccessToken(jwt: string): Promise<AccessTokenPayload | null>
  extractBearerToken(authHeader: string | null | undefined): string | null
}

export function createJwt({
  secret,
  accessTtlSeconds = DEFAULT_ACCESS_TTL_SECONDS,
}: CreateJwtOptions): JwtHelpers {
  const secretKey = () => new TextEncoder().encode(secret ?? "")

  return {
    async signAccessToken(user) {
      const token = await new SignJWT({ email: user.email, role: user.role })
        .setProtectedHeader({ alg: ALG })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(`${accessTtlSeconds}s`)
        .setIssuer(ISSUER)
        .sign(secretKey())
      return { token, expiresIn: accessTtlSeconds }
    },

    // Returns the decoded payload if the JWT is valid and unexpired.
    // Returns null on any verification failure (bad signature, expired, wrong
    // issuer, missing required claim). Never throws — callers branch on null.
    async verifyAccessToken(jwt) {
      try {
        const { payload } = await jwtVerify(jwt, secretKey(), {
          issuer: ISSUER,
          algorithms: [ALG],
        })
        if (typeof payload.sub !== "string") return null
        if (typeof payload.email !== "string") return null
        if (typeof payload.role !== "string") return null
        return payload as AccessTokenPayload
      } catch {
        return null
      }
    },

    // Extract bearer token from an Authorization header. Returns null if
    // missing or malformed. Used by both the JWT path and Better Auth's
    // bearer plugin.
    extractBearerToken(authHeader) {
      if (!authHeader) return null
      const match = authHeader.match(/^Bearer\s+(.+)$/i)
      return match ? match[1].trim() : null
    },
  }
}

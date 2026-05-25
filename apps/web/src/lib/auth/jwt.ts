// Transitional shim — wires BETTER_AUTH_SECRET into @mlabs/auth/jwt's
// createJwt factory. Existing callers keep the same surface (signAccessToken,
// verifyAccessToken, extractBearerToken).

import "server-only"
import { env } from "@/config/env"
import { createJwt } from "@mlabs/auth/jwt"

export type { AccessTokenPayload } from "@mlabs/auth/jwt"

const jwt = createJwt({ secret: env.BETTER_AUTH_SECRET })

export const signAccessToken = jwt.signAccessToken
export const verifyAccessToken = jwt.verifyAccessToken
export const extractBearerToken = jwt.extractBearerToken

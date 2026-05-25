// Catch-all route handler for Better Auth. Handles /api/auth/sign-up,
// /api/auth/sign-in, /api/auth/sign-out, /api/auth/forget-password,
// /api/auth/reset-password, /api/auth/verify-email, etc.
//
// All routing logic lives in better-auth itself; we just bridge the Next.js
// Request/Response shape.

import { auth } from "@/lib/auth"
import { toNextJsHandler } from "better-auth/next-js"

export const { GET, POST } = toNextJsHandler(auth.handler)

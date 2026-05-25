// Client-side auth singleton — used in client components for sign in/up/out
// flows and the useSession() hook.

"use client"

import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
  // Same origin in dev and prod — no baseURL needed.
})

// Most commonly used helpers — re-exported for ergonomics. For anything else,
// import authClient directly and reach for the method (e.g. authClient.forgetPassword).
export const { signIn, signUp, signOut, useSession } = authClient

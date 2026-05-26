"use client"

import { useSearchParams } from "next/navigation"

// Surfaced when requireAdmin() bounces a stale admin session — see
// apps/web/src/lib/auth/server.ts's bounceStaleAdmin(). The redirect lands
// the user on /login?reason=idle, which renders this banner above the
// sign-in form. No-op for plain /login visits.
export function IdleBanner() {
  const params = useSearchParams()
  if (params.get("reason") !== "idle") return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-md border border-border bg-card px-4 py-3 text-sm text-foreground"
    >
      <p className="font-medium">Signed out for inactivity</p>
      <p className="mt-1 text-muted-foreground">
        You were signed out after 30 minutes of inactivity. Sign in to
        continue.
      </p>
    </div>
  )
}

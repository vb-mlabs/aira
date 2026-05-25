"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { authClient } from "@/lib/auth/client"

type Status = "verifying" | "success" | "error"

function VerifyEmailFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  // Derive initial state from token presence to avoid "setState in effect" lint.
  const [status, setStatus] = useState<Status>(token ? "verifying" : "error")
  const [error, setError] = useState<string | null>(
    token ? null : "Verification link is missing its token.",
  )

  useEffect(() => {
    if (!token) return

    let cancelled = false
    authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (cancelled) return
        if (res.error) {
          setStatus("error")
          setError(res.error.message ?? "Verification failed. The link may have expired.")
        } else {
          setStatus("success")
          // Better Auth's autoSignInAfterVerification handles the session.
          setTimeout(() => router.push("/"), 1500)
        }
      })
      .catch(() => {
        if (cancelled) return
        setStatus("error")
        setError("Something went wrong verifying your email.")
      })

    return () => {
      cancelled = true
    }
  }, [token, router])

  if (status === "verifying") {
    return (
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Verifying your email…</h1>
        <p className="text-sm text-muted-foreground">Hang tight.</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Email verified</h1>
        <p className="text-sm text-muted-foreground">Taking you in…</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold tracking-tight">Couldn&apos;t verify</h1>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Link href="/login" className="text-sm hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <VerifyEmailFlow />
    </Suspense>
  )
}

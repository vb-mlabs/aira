"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { authClient } from "@/lib/auth/client"

type Status = "verifying" | "success" | "needs-resend" | "resend-sent"

// Keep in sync with EMAIL_LINK_TTL_MINUTES in packages/auth/src/server.ts —
// that module is server-only so the copy value can't be imported directly.
const LINK_TTL_HOURS = 2

// Client-side click guard. Better Auth already rate-limits per IP; this just
// stops accidental double-taps from queuing a second send.
const RESEND_COOLDOWN_SECONDS = 30

function VerifyEmailFlow() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""

  const [status, setStatus] = useState<Status>(token ? "verifying" : "needs-resend")
  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (!token) return

    let cancelled = false
    authClient
      .verifyEmail({ query: { token } })
      .then((res) => {
        if (cancelled) return
        if (res.error) {
          setStatus("needs-resend")
        } else {
          setStatus("success")
          // Better Auth's autoSignInAfterVerification handles the session.
          setTimeout(() => router.push("/"), 1500)
        }
      })
      .catch(() => {
        if (cancelled) return
        setStatus("needs-resend")
      })

    return () => {
      cancelled = true
    }
  }, [token, router])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function onResend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setEmailError("Enter a valid email address.")
      return
    }
    setEmailError(null)
    setFormError(null)
    setPending(true)
    // Absolute callbackURL required — Better Auth drops relative paths not in
    // trustedOrigins (undefined in prod) and emits an empty callbackURL in the
    // emailed link. Same trap the forgot-password page comments on.
    const res = await authClient.sendVerificationEmail({
      email: trimmed,
      callbackURL: `${window.location.origin}/`,
    })
    setPending(false)
    if (res.error) {
      setFormError(
        res.error.message ?? "Couldn't send a new link. Try again in a moment.",
      )
      return
    }
    setStatus("resend-sent")
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  if (status === "verifying") {
    return (
      <div className="space-y-2 text-center">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Verifying your email…
        </h1>
        <p className="text-sm text-muted-foreground">Hang tight.</p>
      </div>
    )
  }

  if (status === "success") {
    return (
      <div className="space-y-3 text-center">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Email verified
        </h1>
        <p className="text-sm text-muted-foreground">Taking you in…</p>
      </div>
    )
  }

  if (status === "resend-sent") {
    // Mirrors forgot-password's no-enumeration wording: don't confirm whether
    // the address matches an unverified account.
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          New link sent
        </h1>
        <p className="text-sm text-muted-foreground">
          If an unverified account exists for{" "}
          <span className="text-foreground">{email}</span>, we&apos;ve sent a fresh
          verification link. Check your inbox — it can take a minute.
        </p>
        <p className="text-sm text-muted-foreground">
          <Link href="/login" className="text-foreground hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          {token ? "Verification link expired" : "Verification link missing"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {token
            ? `Links expire after ${LINK_TTL_HOURS} hours for your security. Enter your email and we’ll send a fresh one.`
            : "This page needs a verification token. Enter your email and we’ll send a new link."}
        </p>
      </div>
      <form onSubmit={onResend} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!emailError}
          />
          {emailError ? (
            <p className="text-sm text-destructive" role="alert">
              {emailError}
            </p>
          ) : null}
        </div>
        {formError ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={pending || cooldown > 0}
        >
          {pending
            ? "Sending…"
            : cooldown > 0
              ? `Send new link (${cooldown}s)`
              : "Send new link"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/login" className="text-foreground hover:underline">
          Back to sign in
        </Link>
      </p>
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

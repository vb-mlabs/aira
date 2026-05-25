"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Label } from "@mlabs/ui-web/label"
import { PasswordInput } from "@mlabs/ui-web/password-input"
import { authClient } from "@/lib/auth/client"
import { passwordSchema } from "@mlabs/validators"

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ password?: string; form?: string }>({})
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = passwordSchema.safeParse(password)
    if (!parsed.success) {
      setErrors({
        password: parsed.error.issues[0]?.message ?? "Invalid password",
      })
      return
    }
    setErrors({})
    setPending(true)
    const res = await authClient.resetPassword({ newPassword: password, token })
    setPending(false)
    if (res.error) {
      setErrors({
        form: res.error.message ?? "Reset failed. The link may have expired.",
      })
      return
    }
    router.push("/login?reset=ok")
  }

  if (!token) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Invalid reset link</h1>
        <p className="text-sm text-muted-foreground">
          This password reset link is missing its token. Request a new one.
        </p>
        <Link href="/forgot-password" className="text-sm hover:underline">
          Request a new link
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Set a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose something at least 8 characters long.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="password">New password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          ) : null}
        </div>
        {errors.form && (
          <p className="text-sm text-destructive" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </form>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

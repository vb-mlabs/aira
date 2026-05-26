"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { PasswordInput } from "@aira/ui-web/password-input"
import { signUp } from "@/lib/auth/client"
import { SignUpSchema } from "@aira/validators"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
    form?: string
  }>({})
  const [success, setSuccess] = useState(false)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = SignUpSchema.safeParse({ name, email, password })
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof next
        if (key && !next[key]) next[key] = issue.message
      }
      setErrors(next)
      return
    }
    setErrors({})
    setPending(true)
    const res = await signUp.email({ email, password, name })
    setPending(false)
    if (res.error) {
      setErrors({ form: res.error.message ?? "Sign up failed" })
      return
    }
    setSuccess(true)
  }

  if (success) {
    return (
      <div className="space-y-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Check your email
        </h1>
        <p className="text-sm text-muted-foreground">
          We sent a verification link to <span className="text-foreground">{email}</span>.
          Click it to finish setting up your account.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A few details and you&apos;re in.
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={!!errors.name}
          />
          {errors.name ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.name}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!errors.email}
          />
          {errors.email ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.email}
            </p>
          ) : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            placeholder="Enter your password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">At least 8 characters.</p>
          )}
        </div>
        {errors.form && (
          <p className="text-sm text-destructive" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Creating account…" : "Sign Up"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-foreground hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  )
}

"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Suspense, useState } from "react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { PasswordInput } from "@aira/ui-web/password-input"
import { brand } from "@aira/config"
import { signIn } from "@/lib/auth/client"
import { LoginSchema } from "@aira/validators"
import { IdleBanner } from "./_components/idle-banner"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    email?: string
    password?: string
    form?: string
  }>({})
  const [pending, setPending] = useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const parsed = LoginSchema.safeParse({ email, password })
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
    const res = await signIn.email({ email, password })
    setPending(false)
    if (res.error) {
      setErrors({ form: res.error.message ?? "Sign in failed" })
      return
    }
    router.push("/home")
  }

  return (
    <div className="space-y-4">
      {/* IdleBanner reads ?reason=idle from the URL; wrapped in Suspense
          because useSearchParams() suspends until the search-params bailout
          completes on first paint. Fallback is null — no banner is the
          default state. */}
      <Suspense fallback={null}>
        <IdleBanner />
      </Suspense>
      <div className="text-center">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          Welcome Back!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to continue to {brand.name}
        </p>
      </div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
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
            autoComplete="current-password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!errors.password}
          />
          {errors.password ? (
            <p className="text-sm text-destructive" role="alert">
              {errors.password}
            </p>
          ) : null}
          <div className="text-right">
            <Link
              href="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot Password?
            </Link>
          </div>
        </div>
        {errors.form && (
          <p className="text-sm text-destructive" role="alert">
            {errors.form}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign In"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-foreground hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  )
}

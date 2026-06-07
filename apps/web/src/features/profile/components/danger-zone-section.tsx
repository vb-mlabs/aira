"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { SectionCard } from "./section-card"

interface DangerZoneSectionProps {
  user: { email: string }
}

// Two-step: collapsed CTA → expanded confirm form. Mirrors GitHub / Stripe
// destructive-action UX. Typing the email exactly is the safety latch.
// Confirmation is enforced client-side here; the DELETE /api/v1/profile
// op trusts the caller (mobile sends no body). Worst case of bypass is a
// user deleting their own account without a typed confirm — fine, that's
// their right, and the route already requires auth.
export function DangerZoneSection({ user }: DangerZoneSectionProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <SectionCard
      title="Danger zone"
      description="Permanently anonymize your account. This cannot be undone."
      tone="danger"
    >
      {!confirming && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Your profile, name, and email are replaced with placeholders. Your
            avatar is deleted. You are signed out from all devices. Audit log
            entries are preserved without your personal details.
          </p>
          <Button
            type="button"
            variant="destructive"
            onClick={() => setConfirming(true)}
          >
            Delete account
          </Button>
        </div>
      )}

      {confirming && (
        <form
          action={(formData) => {
            startTransition(async () => {
              const typed = String(formData.get("confirmEmail") ?? "").trim()
              if (typed.toLowerCase() !== user.email.toLowerCase()) {
                setError("Type your email exactly to confirm.")
                return
              }
              try {
                await apiClient.delete("/api/v1/profile")
                router.push("/")
              } catch (err) {
                setError(
                  err instanceof ApiError
                    ? err.message
                    : "Could not delete your account. Try again.",
                )
              }
            })
          }}
          className="space-y-3"
        >
          <p className="text-sm text-destructive">
            Type <strong>{user.email}</strong> to confirm.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="confirmEmail" className="sr-only">
              Confirm email
            </Label>
            <Input
              id="confirmEmail"
              name="confirmEmail"
              type="email"
              autoComplete="off"
              required
              placeholder={user.email}
            />
          </div>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending ? "Deleting…" : "Permanently delete"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(false)
                setError(null)
              }}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}
    </SectionCard>
  )
}

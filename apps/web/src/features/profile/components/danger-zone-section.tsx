"use client"

import { useState, useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"
import { SectionCard } from "./section-card"
import { deleteAccount } from "@/features/profile/server/actions"

interface DangerZoneSectionProps {
  user: { email: string }
}

// Two-step: collapsed CTA → expanded confirm form. Mirrors GitHub / Stripe
// destructive-action UX. Typing the email exactly is the safety latch.
export function DangerZoneSection({ user }: DangerZoneSectionProps) {
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
              const res = await deleteAccount(formData)
              if (!res.ok) setError(res.error)
              // On success the server action redirects — no client-side
              // navigation needed.
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

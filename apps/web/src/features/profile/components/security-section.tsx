"use client"

import { useState, useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"
import { SectionCard } from "./section-card"
import { changePassword } from "@/features/profile/server/actions"

export function SecuritySection() {
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null)
  const [pending, startTransition] = useTransition()

  return (
    <SectionCard
      title="Security"
      description="Update your password. Changing it signs you out everywhere else."
    >
      <form
        action={(formData) => {
          startTransition(async () => {
            const res = await changePassword(formData)
            setFeedback(
              res.ok
                ? { kind: "ok", message: res.message ?? "Password changed." }
                : { kind: "error", message: res.error },
            )
            if (res.ok) {
              const form = document.querySelector<HTMLFormElement>(
                "form[data-form='change-password']",
              )
              form?.reset()
            }
          })
        }}
        data-form="change-password"
        className="space-y-4"
      >
        <div className="space-y-1.5">
          <Label htmlFor="currentPassword">Current password</Label>
          <Input
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">New password</Label>
          <Input
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
          <p className="text-xs text-muted-foreground">
            At least 8 characters.
          </p>
        </div>
        {feedback && (
          <p
            className={
              feedback.kind === "ok"
                ? "text-sm text-muted-foreground"
                : "text-sm text-destructive"
            }
            role={feedback.kind === "error" ? "alert" : undefined}
          >
            {feedback.message}
          </p>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </form>
    </SectionCard>
  )
}

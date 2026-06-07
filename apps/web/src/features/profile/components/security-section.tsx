"use client"

import { useState, useTransition } from "react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { SectionCard } from "./section-card"

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
            const currentPassword = String(formData.get("currentPassword") ?? "")
            const newPassword = String(formData.get("newPassword") ?? "")
            try {
              await apiClient.post<{ ok: true }>(
                "/api/v1/profile/password",
                { currentPassword, newPassword },
              )
              setFeedback({
                kind: "ok",
                message: "Password changed. Other sessions signed out.",
              })
              const form = document.querySelector<HTMLFormElement>(
                "form[data-form='change-password']",
              )
              form?.reset()
            } catch (err) {
              setFeedback({
                kind: "error",
                message:
                  err instanceof ApiError
                    ? err.message
                    : "Could not change password. Try again.",
              })
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

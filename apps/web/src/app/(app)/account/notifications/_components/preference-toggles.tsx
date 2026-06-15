"use client"

import { useState, useTransition } from "react"
import { ApiError } from "@aira/api"
import type { UserPreferences } from "@aira/validators"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"

interface PreferenceTogglesProps {
  initial: UserPreferences
}

interface ToggleSpec {
  key: keyof UserPreferences
  title: string
  description: string
}

const TOGGLES: readonly ToggleSpec[] = [
  {
    key: "email_on_message_received",
    title: "New direct messages",
    description: "Email me when someone sends me a message.",
  },
  {
    key: "email_on_post_interest",
    title: "Community responses",
    description: "Email me when someone responds to my community post.",
  },
] as const

export function PreferenceToggles({ initial }: PreferenceTogglesProps) {
  const [prefs, setPrefs] = useState<UserPreferences>(initial)
  const [pendingKey, setPendingKey] = useState<keyof UserPreferences | null>(
    null,
  )
  const [error, setError] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function toggle(key: keyof UserPreferences) {
    const previous = prefs[key]
    const next = !previous
    // Optimistic flip — revert on error.
    setPrefs((p) => ({ ...p, [key]: next }))
    setPendingKey(key)
    setError(null)
    startTransition(async () => {
      try {
        await apiClient.patch<{ preferences: UserPreferences }>(
          "/api/v1/profile/preferences",
          { [key]: next },
        )
      } catch (err) {
        setPrefs((p) => ({ ...p, [key]: previous }))
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not save your preference. Try again.",
        )
      } finally {
        setPendingKey(null)
      }
    })
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
      {TOGGLES.map((t) => {
        const on = prefs[t.key]
        const busy = pendingKey === t.key
        return (
          <li
            key={t.key}
            className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{t.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.description}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={t.title}
              disabled={busy}
              onClick={() => toggle(t.key)}
              className={cn(
                "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors disabled:opacity-60",
                on ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "inline-block size-5 transform rounded-full bg-card shadow transition-transform",
                  on ? "translate-x-5" : "translate-x-0.5",
                )}
              />
            </button>
          </li>
        )
      })}
      {error && (
        <li className="px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </li>
      )}
    </ul>
  )
}

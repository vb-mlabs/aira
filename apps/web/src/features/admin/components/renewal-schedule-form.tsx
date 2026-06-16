"use client"

// F17 — renewal schedule editor. Single text input with inline Zod
// validation as the admin types; PATCH /api/v1/admin/app-settings/reminder-schedule
// on Save. Server still validates so client-side parsing is just for fast
// feedback, never the guarantee.

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { ReminderScheduleSchema } from "@aira/validators/app_settings"
import { apiClient } from "@/lib/api-client"

interface RenewalScheduleFormProps {
  initialValue: string
  initialWindows: number[]
}

interface ParseState {
  ok: true
  windows: number[]
}
interface ParseFail {
  ok: false
  message: string
}

function parse(value: string): ParseState | ParseFail {
  const parsed = ReminderScheduleSchema.safeParse(value)
  if (parsed.success) return { ok: true, windows: parsed.data }
  return {
    ok: false,
    message: parsed.error.issues[0]?.message ?? "Invalid schedule",
  }
}

export function RenewalScheduleForm({
  initialValue,
  initialWindows,
}: RenewalScheduleFormProps) {
  const router = useRouter()
  const [value, setValue] = useState(initialValue)
  const [serverError, setServerError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const parseResult = useMemo(() => parse(value), [value])
  const dirty = value.trim() !== initialValue.trim()
  const canSubmit = parseResult.ok && dirty && !pending

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setSaved(null)
    if (!parseResult.ok) return
    startTransition(async () => {
      try {
        await apiClient.patch<{ value: string; windows: number[] }>(
          "/api/v1/admin/app-settings/reminder-schedule",
          { value },
        )
        setSaved("Schedule saved.")
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError) {
          setServerError(err.message)
          return
        }
        throw err
      }
    })
  }

  const displayWindows = parseResult.ok
    ? parseResult.windows
    : initialWindows

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="reminder-schedule">Reminder windows (days before renewal)</Label>
        <Input
          id="reminder-schedule"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g. 30, 14, 7"
          autoComplete="off"
          aria-invalid={!parseResult.ok}
          aria-describedby="reminder-schedule-help"
        />
        <p id="reminder-schedule-help" className="text-xs text-muted-foreground">
          Comma-separated integers between 1 and 365. We&rsquo;ll email a
          digest <em>N</em> days before each renewal, once per listed window.
          Up to 10 windows, no duplicates.
        </p>
        {!parseResult.ok && (
          <p role="alert" className="text-xs text-destructive">
            {parseResult.message}
          </p>
        )}
        {parseResult.ok && (
          <p className="text-xs text-muted-foreground">
            Reminders will fire {displayWindows.length === 1 ? "once" : `${displayWindows.length} times`}:{" "}
            {displayWindows.map((d, i) => (
              <span key={d}>
                <span className="font-medium text-foreground">{d}</span> day{d === 1 ? "" : "s"} before
                {i < displayWindows.length - 1 ? ", " : ""}
              </span>
            ))}
            .
          </p>
        )}
      </div>

      {serverError && (
        <p role="alert" className="text-sm text-destructive">
          {serverError}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-primary">
          {saved}
        </p>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button type="submit" disabled={!canSubmit}>
          {pending ? "Saving…" : "Save schedule"}
        </Button>
      </div>
    </form>
  )
}

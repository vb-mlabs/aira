"use client"

import { useState, useTransition } from "react"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { AppSetting } from "@aira/validators/app_settings"

const SETTING_KEYS = [
  "homepage_about_title",
  "homepage_about_body",
  "homepage_stat_businesses",
  "homepage_stat_users",
] as const

type SettingKey = (typeof SETTING_KEYS)[number]

interface HomepageCmsFormProps {
  settings: AppSetting[]
}

export function HomepageCmsForm({ settings }: HomepageCmsFormProps) {
  const initialValues = Object.fromEntries(
    SETTING_KEYS.map((k) => [k, settings.find((s) => s.key === k)?.value ?? ""]),
  ) as Record<SettingKey, string>

  const [values, setValues] = useState(initialValues)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function set(key: SettingKey, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(null)
    setError(null)
    startTransition(async () => {
      try {
        for (const key of SETTING_KEYS) {
          if (values[key] !== initialValues[key]) {
            await apiClient.patch("/api/v1/admin/app-settings", {
              key,
              value: values[key],
            })
          }
        }
        setSaved("Settings saved.")
      } catch {
        setError("Failed to save. Please try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-1.5">
        <Label htmlFor="cms-title">About title</Label>
        <Input
          id="cms-title"
          value={values.homepage_about_title}
          onChange={(e) => set("homepage_about_title", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cms-body">About body</Label>
        <textarea
          id="cms-body"
          value={values.homepage_about_body}
          onChange={(e) => set("homepage_about_body", e.target.value)}
          rows={4}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cms-biz-count">Active businesses count</Label>
        <p className="text-xs text-muted-foreground">
          Leave as <code>auto</code> to show the live count.
        </p>
        <Input
          id="cms-biz-count"
          value={values.homepage_stat_businesses}
          onChange={(e) => set("homepage_stat_businesses", e.target.value)}
          placeholder="auto"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="cms-user-count">Community members count</Label>
        <p className="text-xs text-muted-foreground">
          Leave as <code>auto</code> to show the live count.
        </p>
        <Input
          id="cms-user-count"
          value={values.homepage_stat_users}
          onChange={(e) => set("homepage_stat_users", e.target.value)}
          placeholder="auto"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {saved && <p className="text-sm text-success">{saved}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  )
}

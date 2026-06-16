"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { City } from "@aira/validators/cities"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface CityFormProps {
  city?: City
}

export function CityForm({ city }: CityFormProps) {
  const router = useRouter()
  const isEdit = Boolean(city)

  const [name, setName] = useState(city?.name ?? "")
  const [slug, setSlug] = useState(city?.slug ?? "")
  const [active, setActive] = useState<boolean>(city?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (!isEdit) setSlug(slugify(val))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    startTransition(async () => {
      try {
        if (isEdit && city) {
          await apiClient.patch(`/api/v1/admin/cities/${city.id}`, {
            id: city.id,
            name,
            slug,
            active,
          })
        } else {
          await apiClient.post("/api/v1/admin/cities", { name, slug, active })
        }
        router.push("/admin/settings/cities")
        router.refresh()
      } catch {
        setError("Failed to save. Please try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="city-name">Name</Label>
        <Input
          id="city-name"
          value={name}
          onChange={handleNameChange}
          placeholder="e.g. Atlanta"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="city-slug">Slug</Label>
        <Input
          id="city-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. atlanta"
          required
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="city-active"
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 rounded border border-input"
        />
        <Label htmlFor="city-active">Active</Label>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create city"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/settings/cities")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

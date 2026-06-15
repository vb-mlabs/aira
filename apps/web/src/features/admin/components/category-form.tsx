"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import type { Category } from "@aira/validators/categories"

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

interface CategoryFormProps {
  category?: Category
  roots: Category[]
  cityId?: string
}

export function CategoryForm({
  category,
  roots,
  cityId = "city-atlanta",
}: CategoryFormProps) {
  const router = useRouter()
  const isEdit = Boolean(category)

  const [name, setName] = useState(category?.name ?? "")
  const [slug, setSlug] = useState(category?.slug ?? "")
  const [parentId, setParentId] = useState<string>(category?.parent_id ?? "")
  const [active, setActive] = useState<boolean>(category?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const [affectedCount, setAffectedCount] = useState<number | null>(null)

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
        if (isEdit && category) {
          await apiClient.patch(`/api/v1/admin/categories/${category.id}`, {
            id: category.id,
            name,
            slug,
            parent_id: parentId || null,
            active,
          })
        } else {
          await apiClient.post("/api/v1/admin/categories", {
            city_id: cityId,
            name,
            slug: slug || undefined,
            parent_id: parentId || null,
          })
        }
        router.push("/admin/settings/categories")
        router.refresh()
      } catch {
        setError("Failed to save. Please try again.")
      }
    })
  }

  async function openDeactivate() {
    if (!category) return
    try {
      const result = await apiClient.post<{ category: Category; affected_businesses: number }>(
        `/api/v1/admin/categories/${category.id}/deactivate`,
        { id: category.id },
      )
      setAffectedCount(result.affected_businesses ?? 0)
    } catch {
      setAffectedCount(0)
    }
    setDeactivateOpen(true)
  }

  function confirmDeactivate() {
    setDeactivateOpen(false)
    router.push("/admin/settings/categories")
    router.refresh()
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="cat-name">Name</Label>
          <Input
            id="cat-name"
            value={name}
            onChange={handleNameChange}
            placeholder="e.g. Restaurants"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-slug">Slug</Label>
          <Input
            id="cat-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. restaurants"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-parent">Parent category</Label>
          <select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">None (root category)</option>
            {roots
              .filter((r) => !category || r.id !== category.id)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="cat-active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="cat-active">Active</Label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isEdit ? "Save changes" : "Create category"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin/settings/categories")}
          >
            Cancel
          </Button>
          {isEdit && category?.active && (
            <Button
              type="button"
              variant="destructive"
              className="ml-auto"
              onClick={openDeactivate}
            >
              Deactivate
            </Button>
          )}
        </div>
      </form>

      <AlertDialog.Root open={deactivateOpen} onOpenChange={setDeactivateOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
          <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(420px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
            <AlertDialog.Title className="font-display text-xl text-foreground">
              Deactivate {category?.name}?
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
              This category will be hidden from public pages.
              {affectedCount !== null && affectedCount > 0 && (
                <> {affectedCount} business{affectedCount !== 1 ? "es" : ""} currently use this category slug.</>
              )}
            </AlertDialog.Description>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDeactivateOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={confirmDeactivate}
              >
                Deactivate
              </Button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  )
}

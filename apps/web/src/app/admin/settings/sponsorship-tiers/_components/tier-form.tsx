"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { ApiError } from "@aira/api"
import {
  DISPLAY_SLOTS,
  DISPLAY_SLOT_LABELS,
  type DisplaySlot,
  type SponsorshipTier,
} from "@aira/validators/sponsorship-tiers"

interface TierFormProps {
  tier?: SponsorshipTier
}

export function TierForm({ tier }: TierFormProps) {
  const router = useRouter()
  const isEdit = Boolean(tier)

  const [name, setName] = useState(tier?.name ?? "")
  const [priority, setPriority] = useState(tier ? String(tier.priority) : "")
  const [displaySlot, setDisplaySlot] = useState<DisplaySlot>(
    tier?.display_slot ?? "regular",
  )
  const [active, setActive] = useState(tier?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const priorityNum = parseInt(priority, 10)
    if (isNaN(priorityNum) || priorityNum < 1) {
      setError("Priority must be a positive integer.")
      return
    }

    startTransition(async () => {
      try {
        if (isEdit && tier) {
          await apiClient.patch(`/api/v1/admin/sponsorship-tiers/${tier.id}`, {
            id: tier.id,
            name,
            priority: priorityNum,
            display_slot: displaySlot,
            active,
          })
        } else {
          await apiClient.post("/api/v1/admin/sponsorship-tiers", {
            name,
            priority: priorityNum,
            display_slot: displaySlot,
          })
        }
        router.push("/admin/settings/sponsorship-tiers")
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError && err.code === "sponsorship_tier.priority_taken") {
          setError(err.message)
        } else {
          setError("Failed to save. Please try again.")
        }
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pb-5">
      <div className="space-y-1.5">
        <Label htmlFor="tier-name">Name</Label>
        <Input
          id="tier-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Gold"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tier-priority">Priority</Label>
        <Input
          id="tier-priority"
          type="number"
          min={1}
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          placeholder="e.g. 1"
          required
        />
        <p className="text-xs text-muted-foreground">Lower number = better position (1 is highest).</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="tier-slot">Display slot</Label>
        <select
          id="tier-slot"
          value={displaySlot}
          onChange={(e) => setDisplaySlot(e.target.value as DisplaySlot)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
        >
          {DISPLAY_SLOTS.map((s) => (
            <option key={s} value={s}>
              {DISPLAY_SLOT_LABELS[s]}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Top / Mid tiers appear inside the Sponsored section on listing pages
          (Top styling first, Mid second). Regular sends the sponsored business
          into the Regular section — priority still applies within.
        </p>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="tier-active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="tier-active">Active</Label>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create tier"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/settings/sponsorship-tiers")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

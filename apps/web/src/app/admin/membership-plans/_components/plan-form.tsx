"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import type { MembershipPlan } from "@aira/validators/membership-plans"

interface PlanFormProps {
  plan?: MembershipPlan
}

export function PlanForm({ plan }: PlanFormProps) {
  const router = useRouter()
  const isEdit = Boolean(plan)

  const [name, setName] = useState(plan?.name ?? "")
  const [description, setDescription] = useState(plan?.description ?? "")
  const [priceDollars, setPriceDollars] = useState(
    plan ? String((plan.price_cents / 100).toFixed(2)) : ""
  )
  const [durationMonths, setDurationMonths] = useState(
    plan ? String(plan.duration_months) : "12"
  )
  const [active, setActive] = useState(plan?.active ?? true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const price_cents = Math.round(parseFloat(priceDollars) * 100)
    const duration_months = parseInt(durationMonths, 10)

    if (isNaN(price_cents) || price_cents < 0) {
      setError("Enter a valid price.")
      return
    }
    if (isNaN(duration_months) || duration_months < 1) {
      setError("Duration must be at least 1 month.")
      return
    }

    startTransition(async () => {
      try {
        if (isEdit && plan) {
          await apiClient.patch(`/api/v1/admin/membership-plans/${plan.id}`, {
            id: plan.id,
            name,
            description: description || null,
            price_cents,
            duration_months,
            active,
          })
        } else {
          await apiClient.post("/api/v1/admin/membership-plans", {
            name,
            description: description || null,
            price_cents,
            duration_months,
          })
        }
        router.push("/admin/membership-plans")
        router.refresh()
      } catch {
        setError("Failed to save. Please try again.")
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="plan-name">Name</Label>
        <Input
          id="plan-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Starter"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="plan-description">Description</Label>
        <Input
          id="plan-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="plan-price">Price (USD)</Label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">
              $
            </span>
            <Input
              id="plan-price"
              value={priceDollars}
              onChange={(e) => setPriceDollars(e.target.value)}
              placeholder="0.00"
              className="pl-7"
              required
              inputMode="decimal"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="plan-duration">Duration (months)</Label>
          <Input
            id="plan-duration"
            type="number"
            min={1}
            value={durationMonths}
            onChange={(e) => setDurationMonths(e.target.value)}
            required
          />
        </div>
      </div>

      {isEdit && (
        <div className="flex items-center gap-2">
          <input
            id="plan-active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="size-4 rounded border border-input"
          />
          <Label htmlFor="plan-active">Active</Label>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create plan"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/membership-plans")}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

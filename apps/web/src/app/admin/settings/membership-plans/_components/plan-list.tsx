"use client"

// Client-side table for the admin membership-plans list. Owns the
// row-click + details-modal state so the parent page.tsx can stay a
// thin Server Component that fetches the plans list. Rendered by
// /admin/settings/membership-plans/page.tsx.

import { useState } from "react"
import { AdminBadge } from "@/features/admin"
import { PlanDetailsModal } from "@/features/admin/components/plan-details-modal"
import type { MembershipPlan } from "@aira/validators/membership-plans"

interface PlanListProps {
  plans: MembershipPlan[]
}

export function PlanList({ plans }: PlanListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openPlan = openId ? plans.find((p) => p.id === openId) ?? null : null

  function handleRowKey(
    e: React.KeyboardEvent<HTMLTableRowElement>,
    id: string,
  ) {
    // Enter / Space open the modal to match mouse-click semantics for
    // keyboard users. Every other admin table in the app relies on the
    // native <a>/<button> semantic for keyboardability — this table
    // uses <tr role="button"> so we wire the two activation keys
    // ourselves. Escape is handled by the base-ui Dialog itself.
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setOpenId(id)
    }
  }

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Price</th>
              <th className="px-4 py-3 text-left font-semibold">Duration</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {plans.map((plan) => (
              <tr
                key={plan.id}
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${plan.name}`}
                onClick={() => setOpenId(plan.id)}
                onKeyDown={(e) => handleRowKey(e, plan.id)}
                className="cursor-pointer transition-colors hover:bg-muted/20 focus-visible:bg-muted/30 focus-visible:outline-none"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {plan.name}
                  </span>
                  {plan.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {plan.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">
                  ${(plan.price_cents / 100).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {plan.duration_months}{" "}
                  {plan.duration_months === 1 ? "month" : "months"}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge
                    variant={plan.active ? "active" : "inactive"}
                    label={plan.active ? "Active" : "Inactive"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PlanDetailsModal plan={openPlan} onClose={() => setOpenId(null)} />
    </>
  )
}

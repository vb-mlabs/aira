"use client"

// Client-side table for the admin sponsorship-tiers list. Owns the
// row-click + details-modal state so the parent page.tsx can stay a
// thin Server Component that fetches tiers + renders the warning
// banner and helper paragraph. Mirror of admin/settings/membership-
// plans/_components/plan-list.tsx.

import { useState } from "react"
import { AdminBadge } from "@/features/admin"
import { TierDetailsModal } from "@/features/admin/components/tier-details-modal"
import {
  DISPLAY_SLOT_LABELS,
  type SponsorshipTierListItem,
} from "@aira/validators/sponsorship-tiers"

interface TierListProps {
  tiers: SponsorshipTierListItem[]
}

export function TierList({ tiers }: TierListProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openTier = openId ? tiers.find((t) => t.id === openId) ?? null : null

  function handleRowKey(
    e: React.KeyboardEvent<HTMLTableRowElement>,
    id: string,
  ) {
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
              <th className="px-4 py-3 text-left font-semibold">Priority</th>
              <th className="px-4 py-3 text-left font-semibold">Slot</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tiers.map((tier) => (
              <tr
                key={tier.id}
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${tier.name}`}
                onClick={() => setOpenId(tier.id)}
                onKeyDown={(e) => handleRowKey(e, tier.id)}
                className="cursor-pointer transition-colors hover:bg-muted/20 focus-visible:bg-muted/30 focus-visible:outline-none"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-foreground">
                    {tier.name}
                  </span>
                </td>
                <td className="px-4 py-3 tabular-nums text-muted-foreground">
                  {tier.priority}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {DISPLAY_SLOT_LABELS[tier.display_slot]}
                </td>
                <td className="px-4 py-3">
                  <AdminBadge
                    variant={tier.active ? "active" : "inactive"}
                    label={tier.active ? "Active" : "Inactive"}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TierDetailsModal tier={openTier} onClose={() => setOpenId(null)} />
    </>
  )
}

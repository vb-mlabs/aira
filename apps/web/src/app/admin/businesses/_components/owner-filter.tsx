"use client"

// Owner filter on /admin/businesses. Three states: any (default), has,
// none. URL-driven (?owner=has|none) so links to the filtered view are
// shareable. Mirrors the structure of renewing-filter.tsx for
// consistency.

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@aira/ui-web/utils"

const OPTIONS = [
  { label: "Has owner", value: "has" },
  { label: "No owner", value: "none" },
]

export function OwnerFilter() {
  const router = useRouter()
  const sp = useSearchParams()
  const current = sp.get("owner") ?? ""

  function set(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) {
      params.set("owner", value)
    } else {
      params.delete("owner")
    }
    router.push(`/admin/businesses?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Owner:</span>
      <button
        type="button"
        onClick={() => set("")}
        className={cn(
          "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
          !current
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-card text-foreground hover:border-primary/60",
        )}
      >
        Any
      </button>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => set(opt.value)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            current === opt.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-foreground hover:border-primary/60",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

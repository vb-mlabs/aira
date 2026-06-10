"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { cn } from "@aira/ui-web/utils"

const OPTIONS = [
  { label: "7 days", value: "7" },
  { label: "14 days", value: "14" },
  { label: "30 days", value: "30" },
]

export function RenewingFilter() {
  const router = useRouter()
  const sp = useSearchParams()
  const current = sp.get("renewing") ?? ""

  function set(value: string) {
    const params = new URLSearchParams(sp.toString())
    if (value) {
      params.set("renewing", value)
    } else {
      params.delete("renewing")
    }
    router.push(`/admin/businesses?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Renewing in:</span>
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
        All
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

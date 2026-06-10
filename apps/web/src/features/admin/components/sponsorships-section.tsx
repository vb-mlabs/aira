"use client"

import { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Ban, X } from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { cn } from "@aira/ui-web/utils"
import type { Sponsorship } from "@aira/validators/sponsorships"
import type { SponsorshipTier } from "@aira/validators/sponsorship-tiers"
import type { Category } from "@aira/validators/categories"

interface SponsorshipsSectionProps {
  businessId: string
}

type SponsorshipStatus = "scheduled" | "active" | "expired" | "cancelled"

const STATUS_STYLES: Record<SponsorshipStatus, string> = {
  scheduled: "bg-info/15 text-info",
  active: "bg-success/15 text-success",
  expired: "bg-muted text-muted-foreground",
  cancelled: "bg-muted text-muted-foreground line-through",
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function toISODatetime(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

export function SponsorshipsSection({ businessId }: SponsorshipsSectionProps) {
  const router = useRouter()
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchSponsorships() {
    try {
      const res = await apiClient.get<{ items: Sponsorship[] }>(
        `/api/v1/admin/businesses/${businessId}/sponsorships`,
        { query: { business_id: businessId } },
      )
      setSponsorships(res.data?.items ?? [])
    } catch {
      // leave empty
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSponsorships() }, [businessId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel(spId: string) {
    if (!confirm("Cancel this sponsorship?")) return
    setError(null)
    setCancellingId(spId)
    try {
      // Path params [id]=businessId, [spId]=spId are sufficient — no query needed.
      await apiClient.delete(
        `/api/v1/admin/businesses/${businessId}/sponsorships/${spId}`,
      )
      await fetchSponsorships()
      router.refresh()
    } catch {
      setError("Failed to cancel sponsorship.")
    } finally {
      setCancellingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Sponsorships</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      </header>

      <div className="px-6 py-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : sponsorships.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sponsorships yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Category</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sponsorships.map((sp) => (
                  <tr key={sp.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLES[sp.status as SponsorshipStatus] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {sp.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                      {sp.category_id.slice(0, 12)}…
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {sp.tier_id ? sp.tier_id.slice(0, 8) + "…" : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      ${(sp.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(sp.start_date)} – {formatDate(sp.end_date)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {sp.status !== "cancelled" && sp.status !== "expired" && (
                        <button
                          type="button"
                          onClick={() => handleCancel(sp.id)}
                          disabled={cancellingId === sp.id}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label="Cancel sponsorship"
                        >
                          <Ban className="size-3.5" aria-hidden />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </div>

      <AddSponsorshipDialog
        businessId={businessId}
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) fetchSponsorships()
        }}
      />
    </section>
  )
}

interface AddSponsorshipDialogProps {
  businessId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

function tierLabel(t: SponsorshipTier): string {
  const base = `${t.name} (priority ${t.priority})`
  if (t.max_slots == null) return base
  if (t.slots_used != null && t.slots_used >= t.max_slots) {
    return `${base} — Full (${t.slots_used}/${t.max_slots})`
  }
  if (t.slots_used != null) {
    return `${base} (${t.slots_used}/${t.max_slots} slots)`
  }
  return base
}

function AddSponsorshipDialog({ businessId, open, onOpenChange }: AddSponsorshipDialogProps) {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [baseTiers, setBaseTiers] = useState<SponsorshipTier[]>([])
  const [annotatedTiers, setAnnotatedTiers] = useState<SponsorshipTier[]>([])
  const [categoryId, setCategoryId] = useState("")
  const [tierId, setTierId] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState("")
  const [amountDollars, setAmountDollars] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Load categories + base tiers (no slot annotation) when dialog opens
  useEffect(() => {
    if (!open) return
    Promise.all([
      apiClient.get<{ tree: Array<{ root: Category; children: Category[] }> }>("/api/v1/categories?tree=1"),
      apiClient.get<{ items: SponsorshipTier[] }>("/api/v1/admin/sponsorship-tiers?includeInactive=false"),
    ])
      .then(([catRes, tierRes]) => {
        const flat: Category[] = []
        for (const node of catRes.data?.tree ?? []) {
          flat.push(node.root, ...node.children)
        }
        setCategories(flat)
        const tiers = tierRes.data?.items ?? []
        setBaseTiers(tiers)
        setAnnotatedTiers(tiers)
      })
      .catch(() => {})
  }, [open])

  // Re-fetch tiers with slot info when category is selected
  useEffect(() => {
    if (!categoryId) {
      setAnnotatedTiers(baseTiers)
      return
    }
    apiClient
      .get<{ items: SponsorshipTier[] }>(
        `/api/v1/admin/sponsorship-tiers?includeInactive=false&category_id=${encodeURIComponent(categoryId)}`,
      )
      .then((res) => setAnnotatedTiers(res.data?.items ?? baseTiers))
      .catch(() => setAnnotatedTiers(baseTiers))
  }, [categoryId]) // eslint-disable-line react-hooks/exhaustive-deps

  function resetForm() {
    setCategoryId("")
    setTierId("")
    setAnnotatedTiers(baseTiers)
    setStartDate(new Date().toISOString().slice(0, 10))
    setEndDate("")
    setAmountDollars("")
    setNotes("")
    setError(null)
  }

  function handleClose(v: boolean) {
    if (!v) resetForm()
    onOpenChange(v)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!categoryId) {
      setError("Select a category.")
      return
    }
    const amount_cents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(amount_cents) || amount_cents < 0) {
      setError("Enter a valid amount.")
      return
    }
    if (!endDate) {
      setError("End date is required.")
      return
    }

    startTransition(async () => {
      try {
        await apiClient.post(
          `/api/v1/admin/businesses/${businessId}/sponsorships`,
          {
            business_id: businessId,
            category_id: categoryId,
            tier_id: tierId || null,
            start_date: toISODatetime(startDate),
            end_date: toISODatetime(endDate),
            amount_cents,
            notes: notes.trim() || null,
          },
        )
        router.refresh()
        handleClose(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save.")
      }
    })
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,94vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-5">
            <Dialog.Title className="font-display text-xl text-foreground">
              Add sponsorship
            </Dialog.Title>
            <Dialog.Close
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="sp-category">Category</Label>
              <select
                id="sp-category"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                required
              >
                <option value="">— Select category —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-tier">Tier</Label>
              <select
                id="sp-tier"
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="">— No tier —</option>
                {annotatedTiers.map((t) => {
                  const isFull = t.max_slots != null && t.slots_used != null && t.slots_used >= t.max_slots
                  return (
                    <option key={t.id} value={t.id} disabled={isFull}>
                      {tierLabel(t)}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sp-start">Start date</Label>
                <Input
                  id="sp-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sp-end">End date</Label>
                <Input
                  id="sp-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-amount">Amount (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">$</span>
                <Input
                  id="sp-amount"
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                  inputMode="decimal"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sp-notes">Notes</Label>
              <textarea
                id="sp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Add sponsorship"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Plus,
  Ban,
  X,
  Pencil,
  Upload,
  Loader2,
  AlertTriangle,
} from "lucide-react"
import { useDropzone } from "react-dropzone"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { cn } from "@aira/ui-web/utils"
import type { SponsorshipListItem } from "@aira/validators/sponsorships"
import type { SponsorshipTier } from "@aira/validators/sponsorship-tiers"

interface SponsorshipsSectionProps {
  businessId: string
  /**
   * Names of the categories this business is currently listed in (primary
   * + extras). Under the per-business sponsorship model, an active
   * sponsorship features the business on every one of these listing pages.
   * Shown as a read-only helper line inside the Add-Sponsorship dialog so
   * admins see the effective placement without having to pick a category.
   */
  businessCategoryNames: string[]
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

function toDateInputValue(iso: string): string {
  return iso.slice(0, 10)
}

function toISODatetime(dateStr: string): string {
  return `${dateStr}T00:00:00.000Z`
}

export function SponsorshipsSection({
  businessId,
  businessCategoryNames,
}: SponsorshipsSectionProps) {
  const router = useRouter()
  const [sponsorships, setSponsorships] = useState<SponsorshipListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  // Non-null when the dialog is being opened for Edit rather than Add.
  // Clearing this on close is what flips the dialog back to Add mode
  // next time it opens.
  const [editingSp, setEditingSp] = useState<SponsorshipListItem | null>(null)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchSponsorships() {
    try {
      const res = await apiClient.get<{ items: SponsorshipListItem[] }>(
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

  // fetchSponsorships calls setState transitively (setLoading, setSponsorships,
  // setError). React 19's set-state-in-effect rule flags the transitive
  // call site even though this is a standard "fetch on prop change" pattern.
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchSponsorships() }, [businessId])

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

  function openAdd() {
    setEditingSp(null)
    setOpen(true)
  }

  function openEdit(sp: SponsorshipListItem) {
    setEditingSp(sp)
    setOpen(true)
  }

  // A business may only carry ONE non-terminal sponsorship at a time —
  // authoritative check lives in the create service; this local flag
  // just disables the Add button so admins don't hit the 409 mid-modal.
  const hasLiveSponsorship = sponsorships.some(
    (sp) => sp.status === "active" || sp.status === "scheduled",
  )

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Sponsorships</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={openAdd}
          disabled={hasLiveSponsorship}
          title={
            hasLiveSponsorship
              ? "Cancel the active or scheduled sponsorship before adding a new one."
              : undefined
          }
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
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tier</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Evidence</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sponsorships.map((sp) => {
                  const editable = sp.status === "scheduled" || sp.status === "active"
                  return (
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
                      <td className="px-3 py-2 text-foreground">
                        {sp.tier_name ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 tabular-nums">
                        ${(sp.amount_cents / 100).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {formatDate(sp.start_date)} – {formatDate(sp.end_date)}
                      </td>
                      <td className="px-3 py-2">
                        <EvidenceCell
                          sp={sp}
                          businessId={businessId}
                          onUploaded={fetchSponsorships}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {editable && (
                            <button
                              type="button"
                              onClick={() => openEdit(sp)}
                              className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                              aria-label="Edit sponsorship"
                            >
                              <Pencil className="size-3.5" aria-hidden />
                            </button>
                          )}
                          {editable && (
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
                        </div>
                      </td>
                    </tr>
                  )
                })}
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

      <SponsorshipDialog
        businessId={businessId}
        businessCategoryNames={businessCategoryNames}
        open={open}
        sponsorship={editingSp}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setEditingSp(null)
            fetchSponsorships()
          }
        }}
      />
    </section>
  )
}

// ── Evidence cell ────────────────────────────────────────────────────────────

interface EvidenceCellProps {
  sp: SponsorshipListItem
  businessId: string
  onUploaded: () => void
}

function EvidenceCell({ sp, businessId, onUploaded }: EvidenceCellProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback(
    async (accepted: File[]) => {
      const file = accepted[0]
      if (!file) return
      setError(null)
      setUploading(true)
      try {
        const form = new FormData()
        form.append("file", file)
        const res = await fetch(
          `/api/v1/admin/businesses/${businessId}/sponsorships/${sp.id}/evidence`,
          { method: "POST", body: form },
        )
        if (!res.ok) {
          const payload = (await res.json().catch(() => null)) as
            | { error?: { message?: string } }
            | null
          throw new Error(payload?.error?.message ?? "Upload failed.")
        }
        onUploaded()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed.")
      } finally {
        setUploading(false)
      }
    },
    [businessId, sp.id, onUploaded],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "application/pdf": [],
    },
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="flex flex-col gap-1">
      {sp.payment_evidence_url ? (
        <a
          href={sp.payment_evidence_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-primary hover:underline"
        >
          View
        </a>
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            "inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-dashed border-input px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted/40",
            isDragActive && "border-primary bg-primary/5 text-primary",
            uploading && "cursor-wait opacity-70",
          )}
          aria-label="Upload payment evidence"
        >
          <input {...getInputProps()} />
          {uploading ? (
            <>
              <Loader2 className="size-3 animate-spin" aria-hidden />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="size-3" aria-hidden />
              {isDragActive ? "Drop file" : "Upload"}
            </>
          )}
        </div>
      )}
      {error ? (
        <span
          className="inline-flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertTriangle className="size-3" aria-hidden />
          {error}
        </span>
      ) : null}
    </div>
  )
}

// ── Dialog (Add + Edit) ──────────────────────────────────────────────────────

interface SponsorshipDialogProps {
  businessId: string
  businessCategoryNames: string[]
  open: boolean
  /** When provided, the dialog opens in Edit mode: fields pre-fill from
   *  this row, submit PATCHes instead of POSTs, amount renders read-only.
   *  Null = Add mode. */
  sponsorship: SponsorshipListItem | null
  onOpenChange: (open: boolean) => void
}

function tierLabel(t: SponsorshipTier): string {
  return `${t.name} (priority ${t.priority})`
}

function SponsorshipDialog({
  businessId,
  businessCategoryNames,
  open,
  sponsorship,
  onOpenChange,
}: SponsorshipDialogProps) {
  const router = useRouter()
  const isEdit = sponsorship !== null
  const [tiers, setTiers] = useState<SponsorshipTier[]>([])
  const [tierId, setTierId] = useState("")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState("")
  const [amountDollars, setAmountDollars] = useState("")
  const [notes, setNotes] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Load tiers + seed form state whenever the dialog opens (either
  // mode) or the target row swaps. Wrapping the setState fan-out in a
  // named function keeps React 19's set-state-in-effect rule happy —
  // the rule fires on inline synchronous setState calls, not on a
  // function invocation. Mirrors the SponsorshipsSection.fetchSponsorships
  // pattern above.
  function loadAndSeed() {
    apiClient
      .get<{ items: SponsorshipTier[] }>("/api/v1/admin/sponsorship-tiers?includeInactive=false")
      .then((r) => setTiers(r.data?.items ?? []))
      .catch(() => {})
    if (sponsorship) {
      setTierId(sponsorship.tier_id ?? "")
      setStartDate(toDateInputValue(sponsorship.start_date))
      setEndDate(toDateInputValue(sponsorship.end_date))
      setAmountDollars((sponsorship.amount_cents / 100).toFixed(2))
      setNotes(sponsorship.notes ?? "")
    } else {
      setTierId("")
      setStartDate(new Date().toISOString().slice(0, 10))
      setEndDate("")
      setAmountDollars("")
      setNotes("")
    }
    setEvidenceFile(null)
    setError(null)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { if (open) loadAndSeed() }, [open, sponsorship?.id])

  const onDrop = useCallback((accepted: File[]) => {
    setEvidenceFile(accepted[0] ?? null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "application/pdf": [],
    },
    maxFiles: 1,
    disabled: uploading || pending,
  })

  function handleClose(v: boolean) {
    onOpenChange(v)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!tierId) {
      setError("Select a tier.")
      return
    }

    if (!endDate) {
      setError("End date is required.")
      return
    }

    const amount_cents = Math.round(parseFloat(amountDollars) * 100)
    if (isNaN(amount_cents) || amount_cents < 0) {
      setError("Enter a valid amount.")
      return
    }

    startTransition(async () => {
      setUploading(false)
      try {
        let targetId: string
        if (isEdit && sponsorship) {
          await apiClient.patch(
            `/api/v1/admin/businesses/${businessId}/sponsorships/${sponsorship.id}`,
            {
              id: sponsorship.id,
              tier_id: tierId,
              start_date: toISODatetime(startDate),
              end_date: toISODatetime(endDate),
              amount_cents,
              notes: notes.trim() || null,
            },
          )
          targetId = sponsorship.id
        } else {
          const res = await apiClient.post<{ sponsorship: SponsorshipListItem }>(
            `/api/v1/admin/businesses/${businessId}/sponsorships`,
            {
              business_id: businessId,
              tier_id: tierId,
              start_date: toISODatetime(startDate),
              end_date: toISODatetime(endDate),
              amount_cents,
              notes: notes.trim() || null,
            },
          )
          if (!res.sponsorship?.id) {
            throw new Error("Failed to create sponsorship.")
          }
          targetId = res.sponsorship.id
        }

        // Evidence upload (Add + Edit): POST to /evidence overwrites
        // payment_evidence_url on the sponsorship. Skipped when no new
        // file was picked, so hitting Save without touching the dropzone
        // leaves existing evidence intact.
        if (evidenceFile) {
          setUploading(true)
          const form = new FormData()
          form.append("file", evidenceFile)
          const evRes = await fetch(
            `/api/v1/admin/businesses/${businessId}/sponsorships/${targetId}/evidence`,
            { method: "POST", body: form },
          )
          if (!evRes.ok) {
            const payload = await evRes.json().catch(() => null)
            throw new Error(payload?.error?.message ?? "Evidence upload failed.")
          }
          setUploading(false)
        }

        router.refresh()
        handleClose(false)
      } catch (err) {
        setUploading(false)
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
              {isEdit ? "Edit sponsorship" : "Add sponsorship"}
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
              <Label htmlFor="sp-tier">Tier</Label>
              <select
                id="sp-tier"
                value={tierId}
                onChange={(e) => setTierId(e.target.value)}
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                {/* Disabled placeholder — a tier is required. The `required`
                    attribute on <select> treats an empty <option value="">
                    as invalid, which is exactly what we want. */}
                <option value="" disabled>
                  Select a tier…
                </option>
                {tiers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {tierLabel(t)}
                  </option>
                ))}
              </select>
              {businessCategoryNames.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Will feature on:{" "}
                  <span className="text-foreground">
                    {businessCategoryNames.join(", ")}
                  </span>
                </p>
              ) : (
                <p className="text-xs text-warning">
                  This business is in 0 categories — the sponsorship will not
                  display anywhere until you add one.
                </p>
              )}
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

            <div className="space-y-1.5">
              <Label>Payment evidence</Label>
              {isEdit && sponsorship?.payment_evidence_url && !evidenceFile ? (
                <p className="text-xs text-muted-foreground">
                  Current:{" "}
                  <a
                    href={sponsorship.payment_evidence_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    View file
                  </a>
                  . Drop a new one below to replace it.
                </p>
              ) : null}
              <div
                {...getRootProps()}
                className={cn(
                  "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-sm transition-colors",
                  isDragActive
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
                  (uploading || pending) && "pointer-events-none opacity-60",
                )}
              >
                <input {...getInputProps()} />
                {evidenceFile ? (
                  <span className="font-medium text-foreground">{evidenceFile.name}</span>
                ) : (
                  <>
                    <Upload className="size-5" aria-hidden />
                    <span>
                      {isDragActive
                        ? "Drop to attach"
                        : isEdit && sponsorship?.payment_evidence_url
                          ? "Drop file or click to replace"
                          : "Drop file or click to browse"}
                    </span>
                    <span className="text-xs">JPEG, PNG, WebP or PDF · max 5 MB · optional</span>
                  </>
                )}
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={pending || uploading}>
                {uploading
                  ? "Uploading…"
                  : pending
                    ? "Saving…"
                    : isEdit
                      ? "Save changes"
                      : "Add sponsorship"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={pending || uploading}
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

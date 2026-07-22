"use client"

import { useState, useEffect, useTransition, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import {
  Plus,
  Trash2,
  Upload,
  Loader2,
  X,
  AlertTriangle,
  Pencil,
} from "lucide-react"
import { Dialog } from "@base-ui/react/dialog"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { apiClient } from "@/lib/api-client"
import { cn } from "@aira/ui-web/utils"
import type { BusinessSubscription } from "@aira/validators/business-subscriptions"
import type { MembershipPlan } from "@aira/validators/membership-plans"
import {
  deriveDisplayStatus,
  type DisplayStatus,
} from "./subscription-display-status"

interface SubscriptionsSectionProps {
  businessId: string
}

type PaymentStatus = "paid" | "pending" | "overdue"

const STATUS_STYLES: Record<DisplayStatus, string> = {
  paid: "bg-success/15 text-success",
  pending: "bg-warning/15 text-warning",
  overdue: "bg-destructive/15 text-destructive",
  expired: "bg-muted text-muted-foreground",
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

function addMonthsToDate(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T00:00:00.000Z")
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

export function SubscriptionsSection({ businessId }: SubscriptionsSectionProps) {
  const router = useRouter()
  const [subs, setSubs] = useState<BusinessSubscription[]>([])
  // Plan lookup map keyed by plan_id. Used to render the per-row plan name
  // + tier chip — without this the table only shows a truncated plan_id
  // UUID, which doesn't tell support staff what placement the customer
  // is paying for.
  const [planById, setPlanById] = useState<Map<string, MembershipPlan>>(new Map())
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  // Non-null when the dialog is being opened for Edit rather than Add.
  // Clearing this on close flips the dialog back to Add mode next open.
  const [editingSub, setEditingSub] = useState<BusinessSubscription | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchSubs() {
    try {
      const res = await apiClient.get<{ items: BusinessSubscription[] }>(
        `/api/v1/admin/businesses/${businessId}/subscriptions`,
        { query: { business_id: businessId } },
      )
      setSubs(res.data?.items ?? [])
    } catch {
      // leave empty
    } finally {
      setLoading(false)
    }
  }

  async function fetchPlans() {
    try {
      const res = await apiClient.get<{ items: MembershipPlan[] }>(
        "/api/v1/admin/membership-plans?includeInactive=true",
      )
      const map = new Map<string, MembershipPlan>()
      for (const p of res.data?.items ?? []) map.set(p.id, p)
      setPlanById(map)
    } catch {
      // leave empty; rows fall back to "—" for tier
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { fetchSubs(); fetchPlans() }, [businessId])

  async function handleDelete(subId: string) {
    if (!confirm("Delete this subscription? This action is permanent.")) return
    setError(null)
    setDeletingId(subId)
    try {
      // Path params [id]=businessId, [subId]=subId are sufficient — no query needed.
      await apiClient.delete(
        `/api/v1/admin/businesses/${businessId}/subscriptions/${subId}`,
      )
      await fetchSubs()
      router.refresh()
    } catch {
      setError("Failed to delete subscription.")
    } finally {
      setDeletingId(null)
    }
  }

  function openAdd() {
    setEditingSub(null)
    setOpen(true)
  }

  function openEdit(sub: BusinessSubscription) {
    setEditingSub(sub)
    setOpen(true)
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-6 py-4">
        <h2 className="text-base font-semibold">Subscriptions</h2>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={openAdd}
        >
          <Plus className="size-3.5" aria-hidden />
          Add
        </Button>
      </header>

      <div className="px-6 py-5">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet.</p>
        ) : (
          <div className="overflow-hidden rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Plan</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Period</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Evidence</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subs.map((sub) => {
                  // Superseded rows (end_date before the newest row's
                  // start_date) render as "Expired" regardless of stored
                  // payment_status — the DB still holds the last known state.
                  const displayStatus = deriveDisplayStatus(sub, subs)
                  return (
                  <tr key={sub.id} className="hover:bg-muted/20">
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                          STATUS_STYLES[displayStatus] ??
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {displayStatus}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {sub.plan_id
                        ? planById.get(sub.plan_id)?.name ??
                          sub.plan_id.slice(0, 8) + "…"
                        : "—"}
                    </td>
                    <td className="px-3 py-2 tabular-nums">
                      ${(sub.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {formatDate(sub.start_date)} – {formatDate(sub.end_date)}
                    </td>
                    <td className="px-3 py-2">
                      <EvidenceCell
                        sub={sub}
                        businessId={businessId}
                        onUploaded={fetchSubs}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(sub)}
                          className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          aria-label="Edit subscription"
                        >
                          <Pencil className="size-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(sub.id)}
                          disabled={deletingId === sub.id}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                          aria-label="Delete subscription"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </button>
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

      <SubscriptionDialog
        businessId={businessId}
        open={open}
        subscription={editingSub}
        planById={planById}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) {
            setEditingSub(null)
            fetchSubs()
          }
        }}
      />
    </section>
  )
}

// ── Evidence cell ────────────────────────────────────────────────────────────

interface EvidenceCellProps {
  sub: BusinessSubscription
  businessId: string
  onUploaded: () => void
}

function EvidenceCell({ sub, businessId, onUploaded }: EvidenceCellProps) {
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
          `/api/v1/admin/businesses/${businessId}/subscriptions/${sub.id}/evidence`,
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
    [businessId, sub.id, onUploaded],
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

  if (sub.payment_evidence_url) {
    return (
      <a
        href={sub.payment_evidence_url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-primary hover:underline"
      >
        View
      </a>
    )
  }

  return (
    <div className="flex flex-col gap-1">
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

interface SubscriptionDialogProps {
  businessId: string
  open: boolean
  /** When provided, the dialog opens in Edit mode: fields pre-fill from
   *  this row, submit PATCHes instead of POSTs, plan renders locked, and
   *  evidence upload is skipped (post-hoc upload lives in the row cell).
   *  Null = Add mode. */
  subscription: BusinessSubscription | null
  /** Plan lookup used for read-only display of the locked plan name in
   *  Edit mode. Passed down rather than re-fetched. */
  planById: Map<string, MembershipPlan>
  onOpenChange: (open: boolean) => void
}

function SubscriptionDialog({
  businessId,
  open,
  subscription,
  planById,
  onOpenChange,
}: SubscriptionDialogProps) {
  const router = useRouter()
  const isEdit = subscription !== null
  const [plans, setPlans] = useState<MembershipPlan[]>([])
  const [planId, setPlanId] = useState("")
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid")
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [endDate, setEndDate] = useState("")
  const [amountDollars, setAmountDollars] = useState("")
  const [notes, setNotes] = useState("")
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Load plans + seed form state whenever the dialog opens (either mode)
  // or the target row swaps. Wrapping the setState fan-out in a named
  // function keeps React 19's set-state-in-effect rule happy — same
  // pattern as sponsorships-section.tsx's loadAndSeed.
  function loadAndSeed() {
    apiClient
      .get<{ items: MembershipPlan[] }>("/api/v1/admin/membership-plans?includeInactive=false")
      .then((r) => setPlans(r.data?.items ?? []))
      .catch(() => {})
    if (subscription) {
      setPlanId(subscription.plan_id ?? "")
      setPaymentStatus(subscription.payment_status as PaymentStatus)
      setStartDate(toDateInputValue(subscription.start_date))
      setEndDate(toDateInputValue(subscription.end_date))
      setAmountDollars((subscription.amount_cents / 100).toFixed(2))
      setNotes(subscription.notes ?? "")
    } else {
      setPlanId("")
      setPaymentStatus("paid")
      setStartDate(new Date().toISOString().slice(0, 10))
      setEndDate("")
      setAmountDollars("")
      setNotes("")
    }
    setEvidenceFile(null)
    setError(null)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps, react-hooks/set-state-in-effect
  useEffect(() => { if (open) loadAndSeed() }, [open, subscription?.id])

  function handlePlanChange(id: string) {
    setPlanId(id)
    const plan = plans.find((p) => p.id === id)
    if (plan) {
      setAmountDollars((plan.price_cents / 100).toFixed(2))
      setEndDate(addMonthsToDate(startDate, plan.duration_months))
    }
  }

  function handleStartDateChange(val: string) {
    setStartDate(val)
    // Auto-shift end_date from plan duration is Add-mode convenience.
    // In Edit mode the admin may be extending a lapsed subscription
    // (moving start earlier while keeping end); auto-shift would fight
    // that intent.
    if (isEdit) return
    const plan = plans.find((p) => p.id === planId)
    if (plan) {
      setEndDate(addMonthsToDate(val, plan.duration_months))
    }
  }

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
      setUploading(false)
      try {
        if (isEdit && subscription) {
          // Edit: PATCH the editable fields. plan_id is schema-locked;
          // evidence upload is a row-level flow (post-hoc dropzone), not
          // part of the Edit submit.
          await apiClient.patch(
            `/api/v1/admin/businesses/${businessId}/subscriptions/${subscription.id}`,
            {
              id: subscription.id,
              payment_status: paymentStatus,
              start_date: toISODatetime(startDate),
              end_date: toISODatetime(endDate),
              amount_cents,
              notes: notes.trim() || null,
            },
          )
        } else {
          const res = await apiClient.post<{ subscription: BusinessSubscription }>(
            `/api/v1/admin/businesses/${businessId}/subscriptions`,
            {
              business_id: businessId,
              plan_id: planId || null,
              payment_status: paymentStatus,
              start_date: toISODatetime(startDate),
              end_date: toISODatetime(endDate),
              amount_cents,
              notes: notes.trim() || null,
            },
          )

          if (evidenceFile && res.subscription?.id) {
            setUploading(true)
            const form = new FormData()
            form.append("file", evidenceFile)
            const evRes = await fetch(
              `/api/v1/admin/businesses/${businessId}/subscriptions/${res.subscription.id}/evidence`,
              { method: "POST", body: form },
            )
            if (!evRes.ok) {
              const payload = await evRes.json().catch(() => null)
              throw new Error(payload?.error?.message ?? "Evidence upload failed.")
            }
            setUploading(false)
          }
        }

        router.refresh()
        handleClose(false)
      } catch (err) {
        setUploading(false)
        setError(err instanceof Error ? err.message : "Failed to save.")
      }
    })
  }

  const lockedPlanName = subscription?.plan_id
    ? planById.get(subscription.plan_id)?.name ?? subscription.plan_id
    : null

  return (
    <Dialog.Root open={open} onOpenChange={handleClose}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(540px,94vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-6 py-5">
            <Dialog.Title className="font-display text-xl text-foreground">
              {isEdit ? "Edit subscription" : "Add subscription"}
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
              <Label htmlFor="sub-plan">Plan</Label>
              {isEdit ? (
                <p
                  id="sub-plan"
                  className="text-sm text-muted-foreground"
                >
                  Plan: <span className="text-foreground">{lockedPlanName ?? "— (no plan)"}</span>{" "}
                  <span className="text-xs">(locked)</span>
                </p>
              ) : (
                <select
                  id="sub-plan"
                  value={planId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                >
                  <option value="">— Custom (no plan) —</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · ${(p.price_cents / 100).toFixed(2)} / {p.duration_months}mo
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-status">Payment status</Label>
              <select
                id="sub-status"
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
              >
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="sub-start">Start date</Label>
                <Input
                  id="sub-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-end">End date</Label>
                <Input
                  id="sub-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sub-amount">Amount (USD)</Label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground text-sm">$</span>
                <Input
                  id="sub-amount"
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
              <Label htmlFor="sub-notes">Notes</Label>
              <textarea
                id="sub-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes"
                className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
              />
            </div>

            {!isEdit && (
              <div className="space-y-1.5">
                <Label>Payment evidence</Label>
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
                      <span>{isDragActive ? "Drop to attach" : "Drop file or click to browse"}</span>
                      <span className="text-xs">JPEG, PNG, WebP or PDF · max 5 MB · optional</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={pending || uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Uploading…
                  </>
                ) : pending ? (
                  "Saving…"
                ) : isEdit ? (
                  "Save changes"
                ) : (
                  "Add subscription"
                )}
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

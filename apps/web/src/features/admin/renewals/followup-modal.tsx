"use client"

// F23′ — record-one-followup modal.
//
// Mirrors features/admin/community/post-detail-modal.tsx exactly:
// base-ui Dialog.Root with controlled `open` state (no Trigger render
// wrapper — that races onOpenChange per the 2026-06-09 lesson). Lazy-
// fetches recent attempt history on open via useEffect. Submits the
// chosen outcome to POST /api/v1/admin/renewals/[id]/followups, then
// calls router.refresh() so the queue re-fetches without a full
// navigation.
//
// "paid" outcome: after successful save, swaps the footer to a
// "Record payment →" link to /admin/businesses/[business_id] before
// auto-closing on the user's click.

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { ExternalLink, X } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import {
  FOLLOWUP_NOTE_MAX,
  FOLLOWUP_SCHEDULE_DAYS_MAX,
  FOLLOWUP_SCHEDULE_DAYS_MIN,
  type FollowupHistoryRow,
  type FollowupOutcome,
  type FollowupQueueRow,
} from "@aira/validators/subscription-followups"
import { OutcomeRadioGroup } from "./outcome-radio-group"

interface FollowupModalProps {
  row: FollowupQueueRow
  open: boolean
  onClose: () => void
}

interface CreateResponse {
  id: string
}

const OUTCOME_LABEL: Record<FollowupOutcome, string> = {
  called: "Called",
  voicemail: "Voicemail",
  no_answer: "No answer",
  refused: "Refused",
  paid: "Marked paid",
  reschedule: "Rescheduled",
}

export function FollowupModal({ row, open, onClose }: FollowupModalProps) {
  const router = useRouter()
  const [outcome, setOutcome] = useState<FollowupOutcome>("voicemail")
  const [note, setNote] = useState("")
  const [scheduleDays, setScheduleDays] = useState<number>(7)
  const [error, setError] = useState<string | null>(null)
  const [savedPaid, setSavedPaid] = useState(false)
  const [pending, startTransition] = useTransition()

  const [history, setHistory] = useState<FollowupHistoryRow[] | null>(null)
  const [historyError, setHistoryError] = useState<string | null>(null)

  // Lazy-fetch the history list on mount. Form-reset and history-reset
  // effects aren't needed: the parent unmounts the modal on close
  // (`{detailRow && <FollowupModal />}`), so every mount starts with
  // pristine useState initial values.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiClient.get<{ items: FollowupHistoryRow[] }>(
          `/api/v1/admin/renewals/${encodeURIComponent(row.subscription_id)}/followups`,
        )
        if (!cancelled) setHistory(res.data?.items ?? [])
      } catch (err) {
        if (!cancelled) {
          setHistoryError(
            err instanceof ApiError
              ? err.message
              : "Couldn't load history.",
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [row.subscription_id])

  function handleOpenChange(next: boolean) {
    if (!next) onClose()
  }

  const noteRequired = outcome === "called"
  const noteTrimmed = note.trim()
  const noteValid = noteRequired ? noteTrimmed.length > 0 : true
  const scheduleValid =
    outcome !== "reschedule" ||
    (Number.isFinite(scheduleDays) &&
      scheduleDays >= FOLLOWUP_SCHEDULE_DAYS_MIN &&
      scheduleDays <= FOLLOWUP_SCHEDULE_DAYS_MAX)
  const canSave = !pending && noteValid && scheduleValid

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    setError(null)
    startTransition(async () => {
      try {
        const body: {
          subscriptionId: string
          outcome: FollowupOutcome
          note?: string
          scheduleDays?: number
        } = {
          subscriptionId: row.subscription_id,
          outcome,
        }
        if (noteTrimmed.length > 0) body.note = noteTrimmed
        if (outcome === "reschedule") body.scheduleDays = scheduleDays

        await apiClient.post<CreateResponse>(
          `/api/v1/admin/renewals/${encodeURIComponent(row.subscription_id)}/followups`,
          body,
        )

        if (outcome === "paid") {
          // Hold the modal open so the admin can click through to record
          // the actual payment via the existing form.
          setSavedPaid(true)
          router.refresh()
          return
        }

        onClose()
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message)
          return
        }
        throw err
      }
    })
  }

  const overdue = row.days_remaining < 0

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(720px,94vw)] max-h-[92svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-4">
            <div className="min-w-0">
              <Dialog.Title className="font-display text-lg text-foreground">
                {row.business_name}
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-muted-foreground">
                {row.plan_name ?? "No plan on record"} ·{" "}
                <span
                  className={overdue ? "font-bold text-destructive" : ""}
                  suppressHydrationWarning
                >
                  {overdueLabel(row.days_remaining)}
                </span>
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>

          <div className="grid grid-cols-1 gap-6 overflow-y-auto px-6 py-5 sm:grid-cols-[1fr_1.2fr]">
            {/* Left: subscription detail + history */}
            <section className="space-y-4">
              <dl className="grid grid-cols-2 gap-3 rounded-md bg-background/40 px-4 py-3 text-xs">
                <Cell label="Phone" value={row.contact_phone ?? "—"} />
                <Cell label="WhatsApp" value={row.contact_whatsapp ?? "—"} />
                <Cell
                  label="Status"
                  value={row.payment_status.toUpperCase()}
                />
                <Cell
                  label="End date"
                  value={formatDate(row.end_date)}
                />
              </dl>

              <section>
                <h3 className="text-sm font-medium">Recent attempts</h3>
                {historyError && (
                  <p
                    role="alert"
                    className="mt-2 text-xs text-destructive"
                  >
                    {historyError}
                  </p>
                )}
                {history === null ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Loading…
                  </p>
                ) : history.length === 0 ? (
                  <p className="mt-2 text-xs italic text-muted-foreground">
                    No attempts yet.
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {history.slice(0, 5).map((r) => (
                      <li
                        key={r.id}
                        className="rounded-md bg-background/40 px-3 py-2 text-xs"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="font-medium">
                            {OUTCOME_LABEL[r.outcome]}
                          </span>
                          <span
                            className="text-muted-foreground"
                            suppressHydrationWarning
                          >
                            · {formatDateTime(r.created_at)}
                          </span>
                        </div>
                        {r.note && (
                          <p className="mt-1 text-foreground/85">{r.note}</p>
                        )}
                        {r.scheduled_next && (
                          <p
                            className="mt-1 text-muted-foreground"
                            suppressHydrationWarning
                          >
                            Reschedule → {formatDate(r.scheduled_next)}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </section>

            {/* Right: outcome form */}
            <form onSubmit={onSubmit} className="space-y-4">
              {savedPaid ? (
                <div className="rounded-md bg-success/10 px-4 py-3 text-sm">
                  <p className="font-medium text-success-foreground">
                    Marked as paid.
                  </p>
                  <p className="mt-1 text-xs text-foreground/80">
                    Record the actual payment to keep the subscription log
                    accurate.
                  </p>
                  <Link
                    href={`/admin/businesses/${row.business_id}`}
                    className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    onClick={() => onClose()}
                  >
                    Record payment
                    <ExternalLink className="size-3.5" aria-hidden />
                  </Link>
                </div>
              ) : (
                <>
                  <OutcomeRadioGroup
                    value={outcome}
                    onChange={setOutcome}
                    disabled={pending}
                  />

                  <div className="space-y-1">
                    <Label htmlFor="followup-note" className="text-xs">
                      Note
                      {noteRequired ? (
                        <span className="ml-1 text-destructive">required</span>
                      ) : (
                        <span className="ml-1 text-muted-foreground">
                          optional
                        </span>
                      )}
                    </Label>
                    <textarea
                      id="followup-note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      maxLength={FOLLOWUP_NOTE_MAX}
                      disabled={pending}
                      className={cn(
                        "block w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs",
                        "placeholder:text-muted-foreground",
                        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
                      )}
                      placeholder={
                        outcome === "called"
                          ? "What did you discuss?"
                          : "Anything to remember for next time?"
                      }
                    />
                  </div>

                  {outcome === "reschedule" && (
                    <div className="space-y-1">
                      <Label
                        htmlFor="followup-schedule-days"
                        className="text-xs"
                      >
                        Call back in (days)
                      </Label>
                      <Input
                        id="followup-schedule-days"
                        type="number"
                        min={FOLLOWUP_SCHEDULE_DAYS_MIN}
                        max={FOLLOWUP_SCHEDULE_DAYS_MAX}
                        value={scheduleDays}
                        onChange={(e) =>
                          setScheduleDays(Number(e.target.value))
                        }
                        disabled={pending}
                        className="max-w-[140px]"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Drops from the queue until this date passes.
                      </p>
                    </div>
                  )}

                  {error && (
                    <p
                      role="alert"
                      className="text-sm text-destructive"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onClose}
                      disabled={pending}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!canSave}
                      className="bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]"
                    >
                      {pending ? "Saving…" : "Save outcome"}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  )
}

function overdueLabel(daysRemaining: number): string {
  if (daysRemaining < 0) return `OVERDUE ${Math.abs(daysRemaining)}d`
  if (daysRemaining === 0) return "expires today"
  if (daysRemaining === 1) return "expires tomorrow"
  return `expires in ${daysRemaining} days`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()}`
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  const hh = String(d.getUTCHours()).padStart(2, "0")
  const min = String(d.getUTCMinutes()).padStart(2, "0")
  return `${mm}/${dd}/${d.getUTCFullYear()} ${hh}:${min} UTC`
}

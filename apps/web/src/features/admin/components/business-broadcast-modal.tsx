"use client"

// Notify business owners — three-step modal: compose+audience → confirm → sent.
// Submit POSTs /api/v1/admin/businesses/broadcast with the chosen
// audience target. While the audience picker is open, a debounced call
// to /admin/businesses/broadcast/preview keeps the recipient count
// visible in real time so admins know the scope before sending.

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Send, X } from "lucide-react"
import { ApiError } from "@aira/api"
import type { BroadcastTarget } from "@aira/validators"
import { apiClient } from "@/lib/api-client"

const TITLE_MAX = 120
const MESSAGE_MAX = 2000
const PREVIEW_DEBOUNCE_MS = 400

interface BroadcastResponse {
  ok: true
  recipient_count: number
  devices_attempted: number
  devices_completed: number
  devices_pending: number
}

interface PreviewResponse {
  count: number
}

interface CityRow {
  id: string
  name: string
}
interface CategoryRow {
  id: string
  name: string
  level: number
}
interface BusinessRow {
  id: string
  name: string
}

export function BusinessBroadcastButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Send className="size-4" aria-hidden />
        Notify business owners
      </button>
      <BroadcastModal open={open} onOpenChange={setOpen} />
    </>
  )
}

interface BroadcastModalProps {
  open: boolean
  onOpenChange: (next: boolean) => void
}

type Step = "compose" | "confirm" | "sent"
type AudienceKind = BroadcastTarget["kind"]

function BroadcastModal({ open, onOpenChange }: BroadcastModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("compose")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audienceKind, setAudienceKind] = useState<AudienceKind>(
    "all_linked_owners",
  )
  const [cityId, setCityId] = useState<string>("")
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [businessIds, setBusinessIds] = useState<string[]>([])

  const [cities, setCities] = useState<CityRow[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)

  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const [result, setResult] = useState<BroadcastResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Load picker options once when the modal first opens. Cheap admin
  // queries, fine to refetch per modal session.
  useEffect(() => {
    if (!open || optionsLoaded) return
    let cancelled = false
    void (async () => {
      try {
        const [citiesRes, treeRes, businessRes] = await Promise.all([
          apiClient.get<{ cities: CityRow[] }>(
            "/api/v1/admin/cities-for-broadcast",
          ),
          apiClient.get<{
            tree: Array<{ root: CategoryRow; children: CategoryRow[] }>
          }>("/api/v1/categories?tree=1"),
          apiClient.get<{ items: BusinessRow[] }>("/api/v1/admin/businesses"),
        ])
        if (cancelled) return
        if (citiesRes.data) setCities(citiesRes.data.cities)
        if (treeRes.data) {
          setCategories(
            treeRes.data.tree.flatMap((node) => [node.root, ...node.children]),
          )
        }
        if (businessRes.data) setBusinesses(businessRes.data.items)
        setOptionsLoaded(true)
      } catch {
        // Silent — the picker just stays empty; admins can retry by
        // reopening the modal.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, optionsLoaded])

  const target = useMemo<BroadcastTarget | null>(() => {
    switch (audienceKind) {
      case "all_linked_owners":
        return { kind: "all_linked_owners" }
      case "by_city":
        return cityId ? { kind: "by_city", city_id: cityId } : null
      case "by_categories":
        return categoryIds.length > 0
          ? { kind: "by_categories", category_ids: categoryIds }
          : null
      case "by_businesses":
        return businessIds.length > 0
          ? { kind: "by_businesses", business_ids: businessIds }
          : null
    }
  }, [audienceKind, cityId, categoryIds, businessIds])

  // Debounced count preview. Target changes (radio flip, city pick,
  // checkbox tick) drive a fresh call. Empty target → no call, count
  // shown as 0 (Send stays disabled).
  const previewSeqRef = useRef(0)
  useEffect(() => {
    if (!open) return
    if (target === null) {
      // Reset preview state when target clears. React 19's
      // set-state-in-effect rule flags this, but the alternative
      // (derived state) doesn't work here because the reset is
      // conditional on a deeply-nested input change, not a single
      // render-time computation. Two setStates batch into one render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreviewCount(0)
      setPreviewLoading(false)
      return
    }
    setPreviewLoading(true)
    const seq = previewSeqRef.current + 1
    previewSeqRef.current = seq
    const handle = setTimeout(async () => {
      try {
        const res = await apiClient.post<PreviewResponse>(
          "/api/v1/admin/businesses/broadcast/preview",
          { target },
        )
        if (seq !== previewSeqRef.current) return
        setPreviewCount(res.count)
      } catch {
        if (seq !== previewSeqRef.current) return
        setPreviewCount(null)
      } finally {
        if (seq === previewSeqRef.current) setPreviewLoading(false)
      }
    }, PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(handle)
  }, [open, target])

  function reset() {
    setStep("compose")
    setTitle("")
    setMessage("")
    setAudienceKind("all_linked_owners")
    setCityId("")
    setCategoryIds([])
    setBusinessIds([])
    setPreviewCount(null)
    setResult(null)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function toggle(setter: (next: string[]) => void, list: string[], id: string) {
    setter(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  function submit() {
    if (target === null) return
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.post<BroadcastResponse>(
          "/api/v1/admin/businesses/broadcast",
          { title: title.trim(), message: message.trim(), target },
        )
        setResult(res)
        setStep("sent")
        router.refresh()
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not send broadcast.",
        )
      }
    })
  }

  const titleRemaining = TITLE_MAX - title.length
  const messageRemaining = MESSAGE_MAX - message.length
  const composeValid =
    title.trim().length > 0 &&
    message.trim().length > 0 &&
    target !== null &&
    (previewCount ?? 0) > 0

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <Dialog.Popup className="fixed left-1/2 top-1/2 z-50 flex w-[min(640px,92vw)] max-h-[90svh] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-card shadow-[var(--shadow-card-hover)]">
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div>
              <Dialog.Title className="font-display text-xl text-foreground">
                {step === "sent"
                  ? "Broadcast sent"
                  : step === "confirm"
                    ? "Confirm broadcast"
                    : "Notify business owners"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {step === "sent"
                  ? "Recipients will see this in their notifications inbox and on registered devices."
                  : step === "confirm"
                    ? "Review the message before it goes out."
                    : "Pick an audience and craft the announcement."}
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              aria-label="Close"
            >
              <X className="size-4" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="overflow-y-auto px-6 py-5">
            {step === "compose" && (
              <div className="space-y-5">
                <div>
                  <label
                    htmlFor="broadcast-title"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Title
                  </label>
                  <input
                    id="broadcast-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder="Short headline (shown in the bell)"
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleRemaining} chars left
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="broadcast-message"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Message
                  </label>
                  <textarea
                    id="broadcast-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    maxLength={MESSAGE_MAX}
                    rows={5}
                    placeholder="What do you want to say?"
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {messageRemaining} chars left
                  </p>
                </div>

                <fieldset className="space-y-3">
                  <legend className="text-xs font-semibold text-foreground">
                    Audience
                  </legend>
                  <AudienceRadio
                    value="all_linked_owners"
                    checked={audienceKind === "all_linked_owners"}
                    onChange={setAudienceKind}
                    label="All linked owners"
                  />
                  <AudienceRadio
                    value="by_city"
                    checked={audienceKind === "by_city"}
                    onChange={setAudienceKind}
                    label="By city"
                  />
                  {audienceKind === "by_city" && (
                    <select
                      value={cityId}
                      onChange={(e) => setCityId(e.target.value)}
                      className="ml-6 w-[min(320px,100%)] rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                    >
                      <option value="">Pick a city…</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}

                  <AudienceRadio
                    value="by_categories"
                    checked={audienceKind === "by_categories"}
                    onChange={setAudienceKind}
                    label="By categories"
                  />
                  {audienceKind === "by_categories" && (
                    <div className="ml-6 max-h-40 overflow-y-auto rounded-md border border-border bg-background p-2 text-sm">
                      {categories.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Loading…
                        </p>
                      ) : (
                        categories.map((c) => (
                          <label
                            key={c.id}
                            className="flex items-center gap-2 py-1"
                            style={{ paddingLeft: c.level === 2 ? 16 : 0 }}
                          >
                            <input
                              type="checkbox"
                              checked={categoryIds.includes(c.id)}
                              onChange={() =>
                                toggle(setCategoryIds, categoryIds, c.id)
                              }
                            />
                            <span>{c.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}

                  <AudienceRadio
                    value="by_businesses"
                    checked={audienceKind === "by_businesses"}
                    onChange={setAudienceKind}
                    label="By specific businesses"
                  />
                  {audienceKind === "by_businesses" && (
                    <div className="ml-6 max-h-40 overflow-y-auto rounded-md border border-border bg-background p-2 text-sm">
                      {businesses.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          Loading…
                        </p>
                      ) : (
                        businesses.map((b) => (
                          <label
                            key={b.id}
                            className="flex items-center gap-2 py-1"
                          >
                            <input
                              type="checkbox"
                              checked={businessIds.includes(b.id)}
                              onChange={() =>
                                toggle(setBusinessIds, businessIds, b.id)
                              }
                            />
                            <span>{b.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </fieldset>

                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  {previewLoading
                    ? "Counting…"
                    : previewCount === null
                      ? "Could not preview recipient count."
                      : previewCount === 0
                        ? "0 owners match this audience."
                        : `${previewCount} ${previewCount === 1 ? "owner" : "owners"} match this audience.`}
                </div>
              </div>
            )}
            {step === "confirm" && (
              <div className="space-y-4 text-sm">
                <p className="text-foreground">
                  This will send to{" "}
                  <strong>
                    {previewCount ?? 0}{" "}
                    {previewCount === 1 ? "owner" : "owners"}
                  </strong>{" "}
                  matching the chosen audience. The exact device count + push
                  result appears on the next step.
                </p>
                <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {title.trim()}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {message.trim()}
                  </p>
                </div>
                {error && <p className="text-xs text-destructive">{error}</p>}
              </div>
            )}
            {step === "sent" && result && (
              <div className="space-y-2 text-sm">
                <p className="text-foreground">
                  {result.recipient_count === 0
                    ? "No matching owners — the broadcast was logged but no notifications were sent."
                    : `Sent to ${result.recipient_count} ${
                        result.recipient_count === 1 ? "owner" : "owners"
                      }.`}
                </p>
                {result.devices_attempted > 0 && (
                  <p className="text-muted-foreground">
                    {result.devices_completed}/{result.devices_attempted}{" "}
                    devices contacted
                    {result.devices_pending > 0
                      ? ` (${result.devices_pending} still in flight; receipts arrive in ~15 min).`
                      : "."}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border bg-muted/30 px-6 py-4">
            {step === "compose" && (
              <>
                <Dialog.Close className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  Cancel
                </Dialog.Close>
                <button
                  type="button"
                  onClick={() => setStep("confirm")}
                  disabled={!composeValid}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  Continue
                </button>
              </>
            )}
            {step === "confirm" && (
              <>
                <button
                  type="button"
                  onClick={() => setStep("compose")}
                  disabled={pending}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={submit}
                  disabled={pending}
                  className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
                >
                  {pending ? "Sending…" : "Send broadcast"}
                </button>
              </>
            )}
            {step === "sent" && (
              <Dialog.Close className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
                Done
              </Dialog.Close>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

function AudienceRadio({
  value,
  checked,
  onChange,
  label,
}: {
  value: AudienceKind
  checked: boolean
  onChange: (next: AudienceKind) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="radio"
        name="broadcast-audience"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span>{label}</span>
    </label>
  )
}

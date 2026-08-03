"use client"

// Notify users — three-step modal: compose+audience → confirm → sent.
// Sibling to BusinessBroadcastButton (business-broadcast-modal.tsx),
// scoped to end-users directly (not linked business owners) and with
// a per-platform diagnostic breakdown on the Sent step. Primary use is
// triaging push delivery health: an admin sends an iOS-only test blast
// and reads back per-platform ticket outcomes to split send-side vs
// receive-side failures.
//
// Submit POSTs /api/v1/admin/users/broadcast. While the audience picker
// is open, a debounced call to /admin/users/broadcast/preview keeps the
// user+device count visible in real time so admins know the scope
// before sending.

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { Send, X } from "lucide-react"
import { ApiError } from "@aira/api"
import type {
  UserBroadcastTarget,
  SendUserBroadcastOutput,
  PreviewUserBroadcastOutput,
} from "@aira/validators"
import { apiClient } from "@/lib/api-client"

const TITLE_MAX = 120
const MESSAGE_MAX = 2000
const PREVIEW_DEBOUNCE_MS = 400

type AudienceKind = UserBroadcastTarget["kind"]
type Platform = "ios" | "android"
type Step = "compose" | "confirm" | "sent"

export function UserBroadcastButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Send className="size-4" aria-hidden />
        Notify users
      </button>
      <UserBroadcastModal open={open} onOpenChange={setOpen} />
    </>
  )
}

interface UserBroadcastModalProps {
  open: boolean
  onOpenChange: (next: boolean) => void
}

function UserBroadcastModal({ open, onOpenChange }: UserBroadcastModalProps) {
  const router = useRouter()
  const [step, setStep] = useState<Step>("compose")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [audienceKind, setAudienceKind] = useState<AudienceKind>(
    "all_users_with_device",
  )
  const [platform, setPlatform] = useState<Platform>("ios")

  const [preview, setPreview] = useState<PreviewUserBroadcastOutput | null>(
    null,
  )
  const [previewLoading, setPreviewLoading] = useState(false)

  const [result, setResult] = useState<SendUserBroadcastOutput | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const target = useMemo<UserBroadcastTarget>(() => {
    if (audienceKind === "all_users_with_device") {
      return { kind: "all_users_with_device" }
    }
    return { kind: "by_platform", platform }
  }, [audienceKind, platform])

  // Debounced count preview. Any change to audienceKind or platform
  // refires; sequence check drops responses from stale calls.
  const previewSeqRef = useRef(0)
  useEffect(() => {
    if (!open) return
    // React 19's set-state-in-effect rule flags this, but the
    // alternative (derived state) doesn't apply — the loading flag
    // has to gate a debounced async round-trip, not a render-time
    // computation. Same suppression as business-broadcast-modal.tsx.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreviewLoading(true)
    const seq = previewSeqRef.current + 1
    previewSeqRef.current = seq
    const handle = setTimeout(async () => {
      try {
        const res = await apiClient.post<PreviewUserBroadcastOutput>(
          "/api/v1/admin/users/broadcast/preview",
          { target },
        )
        if (seq !== previewSeqRef.current) return
        setPreview(res)
      } catch {
        if (seq !== previewSeqRef.current) return
        setPreview(null)
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
    setAudienceKind("all_users_with_device")
    setPlatform("ios")
    setPreview(null)
    setResult(null)
    setError(null)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      try {
        const res = await apiClient.post<SendUserBroadcastOutput>(
          "/api/v1/admin/users/broadcast",
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
  const userCount = preview?.user_count ?? 0
  const composeValid =
    title.trim().length > 0 && message.trim().length > 0 && userCount > 0

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
                    : "Notify users"}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">
                {step === "sent"
                  ? "Delivery counters are captured below — use them to triage per-platform push health."
                  : step === "confirm"
                    ? "This will send to real users and cannot be recalled."
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
                    htmlFor="user-broadcast-title"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Title
                  </label>
                  <input
                    id="user-broadcast-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={TITLE_MAX}
                    placeholder="Short headline (shown in the push)"
                    className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {titleRemaining} chars left
                  </p>
                </div>
                <div>
                  <label
                    htmlFor="user-broadcast-message"
                    className="block text-xs font-semibold text-foreground"
                  >
                    Message
                  </label>
                  <textarea
                    id="user-broadcast-message"
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
                    value="all_users_with_device"
                    checked={audienceKind === "all_users_with_device"}
                    onChange={setAudienceKind}
                    label="All users with a registered device"
                  />
                  <AudienceRadio
                    value="by_platform"
                    checked={audienceKind === "by_platform"}
                    onChange={setAudienceKind}
                    label="By platform"
                  />
                  {audienceKind === "by_platform" && (
                    <div className="ml-6 flex items-center gap-3 text-sm">
                      <PlatformRadio
                        value="ios"
                        checked={platform === "ios"}
                        onChange={setPlatform}
                        label="iOS only"
                      />
                      <PlatformRadio
                        value="android"
                        checked={platform === "android"}
                        onChange={setPlatform}
                        label="Android only"
                      />
                    </div>
                  )}
                </fieldset>

                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
                  {previewLoading
                    ? "Counting…"
                    : preview === null
                      ? "Could not preview recipient count."
                      : renderPreviewLine(preview)}
                </div>
              </div>
            )}
            {step === "confirm" && (
              <div className="space-y-4 text-sm">
                <p className="text-foreground">
                  This will send to{" "}
                  <strong>
                    {userCount} {userCount === 1 ? "user" : "users"}
                  </strong>{" "}
                  ({preview?.device_count ?? 0} devices). It cannot be recalled.
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
              <div className="space-y-4 text-sm">
                <p className="text-foreground">
                  {result.recipient_count === 0
                    ? "No matching users — the broadcast was logged but no notifications were sent."
                    : `Sent to ${result.recipient_count} ${
                        result.recipient_count === 1 ? "user" : "users"
                      }.`}
                </p>
                <PerPlatformTable result={result} />
                <ErrorCodeList counts={result.error_code_counts} />
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

function renderPreviewLine(p: PreviewUserBroadcastOutput): string {
  if (p.user_count === 0) return "0 users match this audience."
  return `${p.user_count} ${
    p.user_count === 1 ? "user matches" : "users match"
  } — ${p.by_platform.ios.users} iOS, ${p.by_platform.android.users} Android (${
    p.device_count
  } ${p.device_count === 1 ? "device" : "devices"}).`
}

function PerPlatformTable({ result }: { result: SendUserBroadcastOutput }) {
  const rows: Array<{ label: string; counts: (typeof result.by_platform)["ios"] }> = []
  if (result.by_platform.ios.devices_attempted > 0) {
    rows.push({ label: "iOS", counts: result.by_platform.ios })
  }
  if (result.by_platform.android.devices_attempted > 0) {
    rows.push({ label: "Android", counts: result.by_platform.android })
  }
  if (rows.length === 0) return null
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border bg-muted/30 text-left">
            <th className="px-3 py-1.5 font-semibold text-foreground">Platform</th>
            <th className="px-3 py-1.5 font-semibold text-foreground">Attempted</th>
            <th className="px-3 py-1.5 font-semibold text-foreground">Completed</th>
            <th className="px-3 py-1.5 font-semibold text-foreground">Pending</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-b border-border last:border-b-0">
              <td className="px-3 py-1.5 text-foreground">{r.label}</td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {r.counts.devices_attempted}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {r.counts.devices_completed}
              </td>
              <td className="px-3 py-1.5 text-muted-foreground">
                {r.counts.devices_pending}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorCodeList({ counts }: { counts: Record<string, number> }) {
  const entries = Object.entries(counts)
  if (entries.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">Errors from Expo</p>
      <ul className="mt-1 space-y-0.5 text-muted-foreground">
        {entries.map(([code, n]) => (
          <li key={code}>
            <code className="text-foreground">{code}</code>: {n}
          </li>
        ))}
      </ul>
    </div>
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
        name="user-broadcast-audience"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span>{label}</span>
    </label>
  )
}

function PlatformRadio({
  value,
  checked,
  onChange,
  label,
}: {
  value: Platform
  checked: boolean
  onChange: (next: Platform) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="radio"
        name="user-broadcast-platform"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
      />
      <span>{label}</span>
    </label>
  )
}

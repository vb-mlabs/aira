"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"
import type { AdminUserRow, AdminAuditRow } from "@/features/admin/types"
import { AuditTable } from "./audit-table"

interface UserDetailProps {
  user: AdminUserRow
  audit: AdminAuditRow[]
  /** Currently signed-in admin id — used to disable self-targeted actions. */
  selfId: string
  /** Currently signed-in admin's role. Only "super_admin" sees the
   *  role-change controls; plain admins keep ban/unban/reset. */
  callerRole: string
}

type Feedback = { kind: "ok" | "error"; message: string } | null

interface AdminResult {
  ok: true
  message: string
}

// Single chokepoint for every admin mutation call. Wraps the apiClient call
// + ApiError catch + feedback shape so the per-control handlers can stay
// declarative.
async function runAdminCall(
  call: () => Promise<AdminResult>,
  fallback: string,
): Promise<Feedback> {
  try {
    const result = await call()
    return { kind: "ok", message: result.message ?? "Done." }
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof ApiError ? err.message : fallback,
    }
  }
}

export function UserDetail({
  user,
  audit,
  selfId,
  callerRole,
}: UserDetailProps) {
  const isSelf = user.id === selfId
  const banned = !!user.banned_at
  const canChangeRole = callerRole === "super_admin"

  return (
    <div className="space-y-6">
      <Header user={user} />

      {isSelf && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          You are viewing your own account. Self-targeted admin actions are
          disabled.
        </p>
      )}

      <section
        className={cn(
          "rounded-lg border bg-card",
          banned ? "border-destructive/40" : "border-border",
        )}
      >
        <header
          className={cn(
            "border-b px-6 py-4",
            banned ? "border-destructive/40" : "border-border",
          )}
        >
          <h2 className="text-base font-semibold">Account actions</h2>
        </header>
        <ul className="divide-y divide-border">
          {canChangeRole && (
            <RoleRow user={user} disabled={isSelf} />
          )}
          <BanRow user={user} disabled={isSelf} />
          <ResetRow user={user} />
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Audit log</h2>
        </header>
        <div className="px-6 py-5">
          <AuditTable
            rows={audit}
            emptyMessage="No audit entries reference this user yet."
          />
        </div>
      </section>
    </div>
  )
}

function Header({ user }: { user: AdminUserRow }) {
  return (
    <header>
      <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {user.email}{" "}
        {user.email_verified ? null : (
          <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-[0.65rem] font-semibold text-muted-foreground">
            unverified
          </span>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Joined {new Date(user.created_at).toLocaleDateString()} · id{" "}
        <code className="font-mono">{user.id}</code>
      </p>
    </header>
  )
}

/** One row in the Account-actions list. Label on the left, current value
 *  + optional sub-detail in the middle, action button(s) on the right.
 *  Stacks vertically on narrow viewports. */
function ActionRow({
  label,
  value,
  detail,
  status,
  children,
}: {
  label: string
  value: React.ReactNode
  detail?: React.ReactNode
  /** Optional feedback line shown under the row when an action just resolved. */
  status?: Feedback
  /** Action button(s) on the right. */
  children: React.ReactNode
}) {
  return (
    <li className="px-6 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-0.5 text-sm font-medium text-foreground">{value}</p>
          {detail && (
            <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
          )}
        </div>
        <div className="flex flex-shrink-0 gap-2">{children}</div>
      </div>
      <Status feedback={status ?? null} />
    </li>
  )
}

function RoleRow({
  user,
  disabled,
}: {
  user: AdminUserRow
  disabled: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()
  const isAdmin = user.role === "admin"
  const nextRole: "end_user" | "admin" = isAdmin ? "end_user" : "admin"
  const buttonLabel = isAdmin ? "Demote to user" : "Promote to admin"

  function confirm() {
    startTransition(async () => {
      const result = await runAdminCall(
        () =>
          apiClient.post<AdminResult>(
            `/api/v1/admin/users/${user.id}/role`,
            { role: nextRole },
          ),
        "Could not change role.",
      )
      setFeedback(result)
      if (result?.kind === "ok") {
        setOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <ActionRow label="Role" value={user.role} status={feedback}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {buttonLabel}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`${buttonLabel}?`}
        description={
          isAdmin ? (
            <>
              <span className="font-medium text-foreground">{user.name}</span>{" "}
              will lose admin access immediately and be signed out of any
              active admin sessions.
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{user.name}</span>{" "}
              will gain full admin access — including ban, unban, and password
              reset for every other user.
            </>
          )
        }
        confirmLabel={isAdmin ? "Demote" : "Promote"}
        confirmVariant={isAdmin ? "destructive" : "default"}
        pending={pending}
        onConfirm={confirm}
      />
    </ActionRow>
  )
}

function BanRow({
  user,
  disabled,
}: {
  user: AdminUserRow
  disabled: boolean
}) {
  const router = useRouter()
  const [banOpen, setBanOpen] = useState(false)
  const [unbanOpen, setUnbanOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()
  const banned = !!user.banned_at

  function confirmBan() {
    startTransition(async () => {
      const result = await runAdminCall(
        () =>
          apiClient.post<AdminResult>(
            `/api/v1/admin/users/${user.id}/ban`,
            { reason: reason.trim() || undefined },
          ),
        "Could not ban user.",
      )
      setFeedback(result)
      if (result?.kind === "ok") {
        setReason("")
        setBanOpen(false)
        router.refresh()
      }
    })
  }

  function confirmUnban() {
    startTransition(async () => {
      const result = await runAdminCall(
        () =>
          apiClient.post<AdminResult>(
            `/api/v1/admin/users/${user.id}/unban`,
            {},
          ),
        "Could not unban user.",
      )
      setFeedback(result)
      if (result?.kind === "ok") {
        setUnbanOpen(false)
        router.refresh()
      }
    })
  }

  return (
    <ActionRow
      label="Status"
      value={
        banned ? (
          <span className="text-destructive">Banned</span>
        ) : (
          "Active"
        )
      }
      detail={
        banned ? (
          <>
            {new Date(user.banned_at!).toLocaleString()}
            {user.banned_reason && (
              <>
                {" · "}reason: <em>{user.banned_reason}</em>
              </>
            )}
          </>
        ) : undefined
      }
      status={feedback}
    >
      {banned ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setUnbanOpen(true)}
        >
          Unban
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => setBanOpen(true)}
          disabled={disabled}
        >
          Ban user
        </Button>
      )}

      {/* Ban dialog — description carries the prose, extra slot carries
          the reason input (can't legally nest inside the <p> Description). */}
      <ConfirmDialog
        open={banOpen}
        onOpenChange={setBanOpen}
        title="Ban this user?"
        description={
          <>
            Banning <span className="font-medium text-foreground">{user.name}</span>{" "}
            revokes all existing sessions and prevents future sign-ins.
          </>
        }
        extra={
          <div className="space-y-1.5">
            <Label htmlFor="ban-reason">Reason (optional)</Label>
            <Input
              id="ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              placeholder="Visible only to admins"
            />
          </div>
        }
        confirmLabel="Ban user"
        confirmVariant="destructive"
        pending={pending}
        onConfirm={confirmBan}
      />

      <ConfirmDialog
        open={unbanOpen}
        onOpenChange={setUnbanOpen}
        title="Unban this user?"
        description={
          <>
            <span className="font-medium text-foreground">{user.name}</span>{" "}
            will be able to sign in again. The original ban reason stays in
            the audit log.
          </>
        }
        confirmLabel="Unban"
        confirmVariant="default"
        pending={pending}
        onConfirm={confirmUnban}
      />
    </ActionRow>
  )
}

function ResetRow({ user }: { user: AdminUserRow }) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const result = await runAdminCall(
        () =>
          apiClient.post<AdminResult>(
            `/api/v1/admin/users/${user.id}/reset-password`,
            {},
          ),
        "Could not send reset email.",
      )
      setFeedback(result)
      if (result?.kind === "ok") setOpen(false)
    })
  }

  return (
    <ActionRow
      label="Password"
      value={<span className="text-muted-foreground">Send reset email</span>}
      status={feedback}
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        Send reset
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Send password reset email?"
        description={
          <>
            A password reset link will be sent to{" "}
            <span className="font-medium text-foreground">{user.email}</span>.
            The link expires after a short window.
          </>
        }
        confirmLabel="Send email"
        confirmVariant="default"
        pending={pending}
        onConfirm={confirm}
      />
    </ActionRow>
  )
}

/** Shared modal wrapper used by all four admin actions on this page.
 *  Mirrors the @base-ui/react/alert-dialog pattern used by community
 *  delete-confirm-dialog.tsx (backdrop + popup + footer).
 *
 *  `description` is the prose explanation rendered inside the
 *  Description (an underlying <p>). `extra` is for additional content
 *  that can't legally nest inside a <p> — e.g. form inputs for ban
 *  reason — and is rendered as a sibling. */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  extra,
  confirmLabel,
  confirmVariant,
  pending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (next: boolean) => void
  title: string
  description: React.ReactNode
  extra?: React.ReactNode
  confirmLabel: string
  confirmVariant: "default" | "destructive"
  pending: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-sm" />
        <AlertDialog.Popup className="fixed left-1/2 top-1/2 z-50 w-[min(440px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-card p-6 shadow-[var(--shadow-card-hover)]">
          <AlertDialog.Title className="font-display text-xl text-foreground">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {description}
          </AlertDialog.Description>
          {extra && <div className="mt-3">{extra}</div>}
          <div className="mt-5 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={confirmVariant}
              size="sm"
              onClick={onConfirm}
              disabled={pending}
            >
              {pending ? "Working…" : confirmLabel}
            </Button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}

function Status({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p
      className={cn(
        "mt-2 text-sm",
        feedback.kind === "ok" ? "text-muted-foreground" : "text-destructive",
      )}
      role={feedback.kind === "error" ? "alert" : undefined}
    >
      {feedback.message}
    </p>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"
import { cn } from "@mlabs/ui-web/utils"
import type { AdminUserRow, AdminAuditRow } from "@/features/admin/types"
import {
  banUser,
  changeRole,
  sendAdminNotification,
  sendPasswordResetTo,
  unbanUser,
} from "@/features/admin/server/actions"
import { AuditTable } from "./audit-table"

interface UserDetailProps {
  user: AdminUserRow
  audit: AdminAuditRow[]
  /** Currently signed-in admin id — used to disable self-targeted actions. */
  selfId: string
}

type Feedback = { kind: "ok" | "error"; message: string } | null

export function UserDetail({ user, audit, selfId }: UserDetailProps) {
  const isSelf = user.id === selfId
  const banned = !!user.banned_at

  return (
    <div className="space-y-6">
      <Header user={user} />

      {isSelf && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          You are viewing your own account. Self-targeted admin actions are
          disabled.
        </p>
      )}

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Role</h2>
        </header>
        <div className="px-6 py-5">
          <RoleControls user={user} disabled={isSelf} />
        </div>
      </section>

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
          <h2 className="text-base font-semibold">
            {banned ? "Banned" : "Ban"}
          </h2>
        </header>
        <div className="px-6 py-5">
          <BanControls user={user} disabled={isSelf} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Password reset</h2>
        </header>
        <div className="px-6 py-5">
          <ResetControls user={user} />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <header className="border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold">Send a notification</h2>
        </header>
        <div className="px-6 py-5">
          <NotifyForm user={user} />
        </div>
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

function RoleControls({
  user,
  disabled,
}: {
  user: AdminUserRow
  disabled: boolean
}) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  function setRole(role: "user" | "admin") {
    startTransition(async () => {
      const res = await changeRole({ targetId: user.id, role })
      setFeedback(
        res.ok
          ? { kind: "ok", message: res.message ?? "Saved." }
          : { kind: "error", message: res.error },
      )
      if (res.ok) router.refresh()
    })
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Current role: <strong>{user.role}</strong>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={user.role === "user" ? "default" : "outline"}
          onClick={() => setRole("user")}
          disabled={pending || disabled || user.role === "user"}
        >
          Set as user
        </Button>
        <Button
          type="button"
          variant={user.role === "admin" ? "default" : "outline"}
          onClick={() => setRole("admin")}
          disabled={pending || disabled || user.role === "admin"}
        >
          Set as admin
        </Button>
      </div>
      <Status feedback={feedback} />
    </div>
  )
}

function BanControls({
  user,
  disabled,
}: {
  user: AdminUserRow
  disabled: boolean
}) {
  const router = useRouter()
  const [reason, setReason] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()
  const banned = !!user.banned_at

  function ban() {
    startTransition(async () => {
      const res = await banUser({
        targetId: user.id,
        reason: reason.trim() || undefined,
      })
      setFeedback(
        res.ok
          ? { kind: "ok", message: res.message ?? "Banned." }
          : { kind: "error", message: res.error },
      )
      if (res.ok) {
        setReason("")
        router.refresh()
      }
    })
  }

  function unban() {
    startTransition(async () => {
      const res = await unbanUser({ targetId: user.id })
      setFeedback(
        res.ok
          ? { kind: "ok", message: res.message ?? "Unbanned." }
          : { kind: "error", message: res.error },
      )
      if (res.ok) router.refresh()
    })
  }

  if (banned) {
    return (
      <div className="space-y-3">
        <p className="text-sm">
          Banned {new Date(user.banned_at!).toLocaleString()}.
          {user.banned_reason && (
            <>
              {" "}
              Reason: <em>{user.banned_reason}</em>.
            </>
          )}
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={unban}
          disabled={pending}
        >
          {pending ? "Unbanning…" : "Unban"}
        </Button>
        <Status feedback={feedback} />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Banning revokes all existing sessions and prevents future sign-ins.
      </p>
      <Label htmlFor="ban-reason">Reason (optional)</Label>
      <Input
        id="ban-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        placeholder="Visible only to admins"
      />
      <Button
        type="button"
        variant="destructive"
        onClick={ban}
        disabled={pending || disabled}
      >
        {pending ? "Banning…" : "Ban user"}
      </Button>
      <Status feedback={feedback} />
    </div>
  )
}

function ResetControls({ user }: { user: AdminUserRow }) {
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Sends a password reset email to {user.email}.
      </p>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          startTransition(async () => {
            const res = await sendPasswordResetTo({ targetId: user.id })
            setFeedback(
              res.ok
                ? { kind: "ok", message: res.message ?? "Sent." }
                : { kind: "error", message: res.error },
            )
          })
        }
        disabled={pending}
      >
        {pending ? "Sending…" : "Send reset email"}
      </Button>
      <Status feedback={feedback} />
    </div>
  )
}

function NotifyForm({ user }: { user: AdminUserRow }) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [href, setHref] = useState("")
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        startTransition(async () => {
          const res = await sendAdminNotification({
            targetId: user.id,
            title: title.trim(),
            message: message.trim(),
            href: href.trim() || undefined,
          })
          setFeedback(
            res.ok
              ? { kind: "ok", message: res.message ?? "Sent." }
              : { kind: "error", message: res.error },
          )
          if (res.ok) {
            setTitle("")
            setMessage("")
            setHref("")
            router.refresh()
          }
        })
      }}
      className="space-y-3"
    >
      <div className="space-y-1.5">
        <Label htmlFor="notif-title">Title</Label>
        <Input
          id="notif-title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notif-message">Message</Label>
        <Input
          id="notif-message"
          required
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="notif-href">Link (optional)</Label>
        <Input
          id="notif-href"
          placeholder="/settings"
          value={href}
          onChange={(e) => setHref(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send notification"}
      </Button>
      <Status feedback={feedback} />
    </form>
  )
}

function Status({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null
  return (
    <p
      className={
        feedback.kind === "ok"
          ? "text-sm text-muted-foreground"
          : "text-sm text-destructive"
      }
      role={feedback.kind === "error" ? "alert" : undefined}
    >
      {feedback.message}
    </p>
  )
}

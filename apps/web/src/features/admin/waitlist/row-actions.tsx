"use client"

// Per-row Copy + Delete affordances for the waitlist tables. Pure
// client component — owns the dialog open state, the pending state
// for delete, and the transient "Copied" feedback for copy. The
// parent table passes the row data and is responsible for keeping its
// own list in sync — we call router.refresh() after a successful
// delete so the RSC page re-fetches.
//
// 404 from the delete endpoint is treated as "already gone": we
// surface a soft notice and refresh, so two admins deleting the same
// row don't see a hard error.

import { useState } from "react"
import { Copy, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@aira/ui-web/button"
import { ApiError } from "@aira/api"
import { apiClient } from "@/lib/api-client"
import type { WaitlistAdminListItem } from "@aira/validators"
import { DeleteWaitlistDialog } from "./delete-waitlist-dialog"

interface RowActionsProps {
  row: WaitlistAdminListItem
  /** Set when the parent table wants the phone Copy button rendered
   *  (business tab only). */
  showCopyPhone?: boolean
}

type CopyKey = "email" | "phone"

export function RowActions({ row, showCopyPhone = false }: RowActionsProps) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null)

  async function handleCopy(key: CopyKey, value: string) {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Insecure context fallback. Keeps the affordance working on
      // a non-HTTPS dev URL (rare for admins, but harmless).
      const ta = document.createElement("textarea")
      ta.value = value
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } finally {
        document.body.removeChild(ta)
      }
    }
    setCopiedKey(key)
    window.setTimeout(() => setCopiedKey(null), 1200)
  }

  async function handleDelete() {
    setPending(true)
    setError(null)
    try {
      await apiClient.delete(`/api/v1/admin/waitlist/${row.id}`)
      setConfirmOpen(false)
      router.refresh()
    } catch (err) {
      // 404 = the row's already gone (another admin deleted it, or
      // the table is showing a stale snapshot). Treat it as success
      // visually — close the dialog and refresh.
      if (err instanceof ApiError && err.status === 404) {
        setConfirmOpen(false)
        router.refresh()
      } else {
        setError(
          err instanceof ApiError ? err.message : "Could not delete entry.",
        )
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="inline-flex items-center justify-end gap-1.5">
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Copy email for ${row.email}`}
        title={copiedKey === "email" ? "Copied!" : "Copy email"}
        onClick={() => handleCopy("email", row.email)}
      >
        <Copy />
      </Button>
      {showCopyPhone && row.phone && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`Copy phone for ${row.email}`}
          title={copiedKey === "phone" ? "Copied!" : "Copy phone"}
          onClick={() => handleCopy("phone", row.phone!)}
        >
          <Copy className="text-muted-foreground" />
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Delete entry for ${row.email}`}
        title="Delete"
        onClick={() => setConfirmOpen(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
      <DeleteWaitlistDialog
        open={confirmOpen}
        onOpenChange={(next) => {
          if (!pending) setConfirmOpen(next)
        }}
        email={row.email}
        pending={pending}
        onConfirm={handleDelete}
      />
    </div>
  )
}

"use client"

// Thread view. Three pieces of state to keep coherent:
//
//   1. `messages` — the running list of confirmed messages from the server.
//   2. `pending`  — messages the user just sent that haven't been ack'd
//                   (optimistic UI). Each has a client-only id and a
//                   status: "sending" | "failed".
//   3. cursor for the polling loop — the latest server message we've seen.
//
// When a poll returns new messages, we append them to `messages` and
// dedupe any pending row that the same body now appears confirmed for (the
// server echoes our own send back through the poll). When a send succeeds,
// we don't add to `messages` ourselves — the next poll will pick it up, and
// we drop the pending row at that point.

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { cn } from "@mlabs/ui-web/utils"
import type { MessageRow } from "@/features/messages/types"
import { MAX_BODY_CHARS } from "@/features/messages/types"

const THREAD_POLL_MS = 2_000

interface ThreadProps {
  conversationId: string
  meId: string
  otherUser: { id: string; name: string; image: string | null } | null
  initialMessages: MessageRow[]
}

interface PendingMessage {
  client_id: string
  body: string
  status: "sending" | "failed"
}

export function Thread({
  conversationId,
  meId,
  otherUser,
  initialMessages,
}: ThreadProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<MessageRow[]>(initialMessages)
  const [pending, setPending] = useState<PendingMessage[]>([])
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const cursorRef = useRef<string | null>(makeCursor(initialMessages))
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mark the conversation read on mount. Also runs whenever new messages
  // arrive while the thread is in view — keeps the bell + inbox in sync.
  const messageCount = messages.length
  useEffect(() => {
    void fetch(`/api/v1/messages/conversations/${conversationId}/read`, {
      method: "POST",
    })
  }, [conversationId, messageCount])

  // Polling loop — own implementation rather than usePolledFetch because
  // we maintain a cursor that mutates per response, not a URL that mutates.
  useEffect(() => {
    let active = true
    let inFlight = false

    async function poll() {
      if (inFlight) return
      if (document.visibilityState !== "visible") return
      inFlight = true
      try {
        const params = new URLSearchParams()
        if (cursorRef.current) params.set("after", cursorRef.current)
        const res = await fetch(
          `/api/v1/messages/conversations/${conversationId}/messages?${params.toString()}`,
          { cache: "no-store" },
        )
        if (!res.ok) return
        const body = (await res.json()) as { items: MessageRow[] }
        if (!active || body.items.length === 0) return
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const fresh = body.items.filter((m) => !seen.has(m.id))
          if (fresh.length === 0) return prev
          const next = [...prev, ...fresh]
          cursorRef.current = makeCursor(next)
          return next
        })
        // Drop pending messages whose body now appears in the confirmed
        // list (the server echoed our own send back). Imperfect dedup —
        // if a user sends two identical bodies, only one drops here, but
        // both ARE in `messages` already, so visually no duplication.
        setPending((prev) =>
          prev.filter(
            (p) =>
              p.status === "failed" ||
              !body.items.some(
                (m) => m.sender_id === meId && m.body === p.body,
              ),
          ),
        )
      } catch {
        // swallow; next tick retries
      } finally {
        inFlight = false
      }
    }

    void poll()
    const id = setInterval(poll, THREAD_POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      active = false
      clearInterval(id)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [conversationId, meId])

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, pending.length])

  async function sendOne(body: string, clientId: string) {
    setSending(true)
    try {
      const res = await fetch(
        `/api/v1/messages/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ body }),
        },
      )
      if (!res.ok) {
        setPending((prev) =>
          prev.map((p) =>
            p.client_id === clientId ? { ...p, status: "failed" } : p,
          ),
        )
        return
      }
      // Refresh router so the inbox + bell pick up the new state on
      // navigating back. Confirmed message will land via the polling loop.
      router.refresh()
    } catch {
      setPending((prev) =>
        prev.map((p) =>
          p.client_id === clientId ? { ...p, status: "failed" } : p,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body) return
    const clientId = `pending-${Date.now()}-${Math.random()}`
    setPending((prev) => [
      ...prev,
      { client_id: clientId, body, status: "sending" },
    ])
    setDraft("")
    void sendOne(body, clientId)
  }

  function retryPending(p: PendingMessage) {
    setPending((prev) =>
      prev.map((x) =>
        x.client_id === p.client_id ? { ...x, status: "sending" } : x,
      ),
    )
    void sendOne(p.body, p.client_id)
  }

  function deletePending(p: PendingMessage) {
    setPending((prev) => prev.filter((x) => x.client_id !== p.client_id))
  }

  return (
    <div className="flex h-[70vh] flex-col">
      <header className="flex items-center gap-3 border-b border-border pb-3">
        <h1 className="text-lg font-semibold tracking-tight">
          {otherUser?.name ?? "Conversation"}
        </h1>
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {messages.length === 0 && pending.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hello.
          </p>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} mine={m.sender_id === meId} message={m} />
        ))}
        {pending.map((p) => (
          <PendingBubble
            key={p.client_id}
            pending={p}
            onRetry={() => retryPending(p)}
            onDelete={() => deletePending(p)}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-border pt-3"
      >
        <Input
          aria-label="Message"
          placeholder="Type a message"
          value={draft}
          maxLength={MAX_BODY_CHARS}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}

function MessageBubble({
  mine,
  message,
}: {
  mine: boolean
  message: MessageRow
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        mine ? "items-end" : "items-start",
      )}
    >
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
          mine
            ? "rounded-br-sm bg-primary text-primary-foreground"
            : "rounded-bl-sm bg-muted text-foreground",
        )}
      >
        {message.body}
      </div>
      {!mine && (
        <p className="px-2 text-[0.65rem] text-muted-foreground">
          {message.sender_name}
        </p>
      )}
    </div>
  )
}

function PendingBubble({
  pending,
  onRetry,
  onDelete,
}: {
  pending: PendingMessage
  onRetry: () => void
  onDelete: () => void
}) {
  const failed = pending.status === "failed"
  return (
    <div className="flex flex-col items-end gap-0.5">
      <div
        className={cn(
          "max-w-[75%] rounded-2xl rounded-br-sm px-3 py-2 text-sm",
          failed
            ? "border border-destructive/40 bg-destructive/5 text-foreground"
            : "bg-primary/60 text-primary-foreground",
        )}
      >
        {pending.body}
      </div>
      <p className="px-2 text-[0.65rem] text-muted-foreground">
        {failed ? (
          <>
            <span className="text-destructive">Failed</span>{" · "}
            <button
              type="button"
              onClick={onRetry}
              className="underline hover:text-foreground"
            >
              Retry
            </button>{" · "}
            <button
              type="button"
              onClick={onDelete}
              className="underline hover:text-foreground"
            >
              Delete
            </button>
          </>
        ) : (
          "Sending…"
        )}
      </p>
    </div>
  )
}

function makeCursor(items: MessageRow[]): string | null {
  if (items.length === 0) return null
  const last = items[items.length - 1]!
  const json = JSON.stringify({ created_at: last.created_at, id: last.id })
  // Browser-safe base64url: ASCII-only payload (ISO timestamp + UUID), so
  // btoa is fine; swap to URL-safe alphabet and strip padding.
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"

// Form to start a DM by email. Hits POST /api/v1/messages/conversations which
// resolves the email → user, blocks self-DM and unverified/anonymized
// targets, and (race-safely) opens-or-creates the 1:1 row before
// returning its id. We then navigate to /messages/[id].
export function NewConversationForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setError(null)
        startTransition(async () => {
          const res = await fetch("/api/v1/messages/conversations", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ otherEmail: email.trim() }),
          })
          if (!res.ok) {
            const body = await res
              .json()
              .catch(() => ({ error: "Could not open conversation." }))
            setError(body.error ?? "Could not open conversation.")
            return
          }
          const { id } = (await res.json()) as { id: string }
          setEmail("")
          router.push(`/messages/${id}`)
        })
      }}
      className="space-y-2"
    >
      <Label htmlFor="dm-email">Start a new DM</Label>
      <div className="flex gap-2">
        <Input
          id="dm-email"
          type="email"
          placeholder="them@example.com"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={pending || !email.trim()}>
          {pending ? "Opening…" : "DM"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}

"use client"

import { useState, useTransition } from "react"
import { Button } from "@mlabs/ui-web/button"
import { Input } from "@mlabs/ui-web/input"
import { Label } from "@mlabs/ui-web/label"
import { SectionCard } from "./section-card"
import { AvatarUploader } from "@/features/avatar/components/avatar-uploader"
import {
  updateName,
  requestEmailChange,
} from "@/features/profile/server/actions"

interface AccountSectionProps {
  user: {
    id: string
    name: string
    email: string
    image: string | null
    emailVerified: boolean
  }
}

export function AccountSection({ user }: AccountSectionProps) {
  return (
    <SectionCard
      title="Account"
      description="How you appear in the app and how we reach you."
    >
      <div className="space-y-6">
        <AvatarUploader currentUrl={user.image} userName={user.name} />
        <NameForm currentName={user.name} />
        <EmailForm currentEmail={user.email} verified={user.emailVerified} />
      </div>
    </SectionCard>
  )
}

function NameForm({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName)
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null)
  const [pending, startTransition] = useTransition()
  const dirty = name.trim() !== currentName.trim()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await updateName(formData)
          setFeedback(
            res.ok
              ? { kind: "ok", message: res.message ?? "Saved." }
              : { kind: "error", message: res.error },
          )
        })
      }}
      className="space-y-2"
    >
      <Label htmlFor="name">Display name</Label>
      <div className="flex gap-2">
        <Input
          id="name"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="flex-1"
        />
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {feedback && (
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
      )}
    </form>
  )
}

function EmailForm({
  currentEmail,
  verified,
}: {
  currentEmail: string
  verified: boolean
}) {
  const [email, setEmail] = useState(currentEmail)
  const [feedback, setFeedback] = useState<
    { kind: "ok" | "error"; message: string } | null
  >(null)
  const [pending, startTransition] = useTransition()
  const dirty = email.trim().toLowerCase() !== currentEmail.toLowerCase()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const res = await requestEmailChange(formData)
          setFeedback(
            res.ok
              ? { kind: "ok", message: res.message ?? "Confirmation sent." }
              : { kind: "error", message: res.error },
          )
        })
      }}
      className="space-y-2"
    >
      <div className="flex items-center justify-between">
        <Label htmlFor="email">Email</Label>
        {!verified && (
          <span className="text-xs text-muted-foreground">Unverified</span>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={!dirty || pending}>
          {pending ? "Sending…" : "Change email"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Changing your email sends a confirmation link to your current address.
        The change completes only after you click it.
      </p>
      {feedback && (
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
      )}
    </form>
  )
}

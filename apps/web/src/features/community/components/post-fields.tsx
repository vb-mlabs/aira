"use client"

// Shared field rows for the Post-on-AIRA create + edit forms. Owns no
// submit state — parents drive value + onChange + show error/banner
// content. Keeps the visual rhythm in one place so create + edit can't
// drift apart.

import { Input } from "@aira/ui-web/input"
import { Label } from "@aira/ui-web/label"
import { cn } from "@aira/ui-web/utils"

export const TITLE_MAX = 120
export const BODY_MAX = 1000
export const PHONE_MAX = 30

interface PostFieldsProps {
  idPrefix: string
  title: string
  body: string
  phone: string
  email: string
  onTitle: (v: string) => void
  onBody: (v: string) => void
  onPhone: (v: string) => void
  onEmail: (v: string) => void
  /** Renders a yellow banner above the fields warning that saving will
   *  send the post back for re-moderation. Drawn by PostEditForm when
   *  the source row is approved. */
  showApprovedWarning?: boolean
  autoFocusTitle?: boolean
}

export function PostFields({
  idPrefix,
  title,
  body,
  phone,
  email,
  onTitle,
  onBody,
  onPhone,
  onEmail,
  showApprovedWarning = false,
  autoFocusTitle = false,
}: PostFieldsProps) {
  return (
    <>
      {showApprovedWarning && (
        <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          Saving these changes sends the post back for moderation — it
          will be hidden from the board until a moderator approves it
          again.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-title`}>Title</Label>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          maxLength={TITLE_MAX}
          placeholder="Room for rent in Sandy Springs, weekend tutoring, looking for a paediatrician…"
          autoFocus={autoFocusTitle}
          required
        />
        <p className="text-xs text-muted-foreground">
          {title.length} / {TITLE_MAX}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-body`}>Description (optional)</Label>
        <textarea
          id={`${idPrefix}-body`}
          value={body}
          onChange={(e) => onBody(e.target.value)}
          maxLength={BODY_MAX}
          rows={4}
          className={cn(
            // Match the <Input> primitive: rounded-2xl + transparent bg
            // + border-input + same focus ring so this body field and
            // the title/phone/email rows feel like the same control set.
            "block w-full min-w-0 rounded-2xl border border-input bg-transparent px-3 py-2 text-sm transition-colors",
            "placeholder:text-muted-foreground md:text-sm dark:border-input/30",
            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:border-ring",
          )}
          placeholder="Any extra detail neighbours should know — price, availability, what you're looking for…"
        />
        <p className="text-xs text-muted-foreground">
          {body.length} / {BODY_MAX}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-phone`}>Phone (optional)</Label>
          <Input
            id={`${idPrefix}-phone`}
            type="tel"
            value={phone}
            onChange={(e) => onPhone(e.target.value)}
            maxLength={PHONE_MAX}
            placeholder="(404) 555-0100"
          />
          <p className="text-xs text-muted-foreground">
            Visible to other signed-in members.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`}>Email (optional)</Label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => onEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <p className="text-xs text-muted-foreground">
            Visible to other signed-in members.
          </p>
        </div>
      </div>
    </>
  )
}

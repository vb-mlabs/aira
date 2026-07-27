"use client"

// F23′ — radio group for the follow-up modal.
//
// Six options laid out as a 2-column grid. Each option carries a short
// helper line so the admin understands the downstream behaviour without
// hovering. Disabled-while-pending is up to the parent.

import { cn } from "@aira/ui-web/utils"
import type { FollowupOutcome } from "@aira/validators/subscription-followups"

interface OutcomeRadioGroupProps {
  value: FollowupOutcome
  onChange: (next: FollowupOutcome) => void
  disabled?: boolean
}

interface Option {
  value: FollowupOutcome
  label: string
  hint: string
}

// Labels carry the queue-visibility consequence in parens so admins
// see what's about to happen before they click. Hints keep their
// primary-explanation role. voicemail and no_answer leave the row
// visible in the default queue view, so no suffix needed on those.
// See .mstack/reviews/2026-07-27-renewals-visibility.md for the copy
// pass rationale.
const OPTIONS: readonly Option[] = [
  {
    value: "called",
    label: "Called (hides for 7 days)",
    hint: "Got through. Note below is required.",
  },
  {
    value: "voicemail",
    label: "Voicemail",
    hint: "Left a message.",
  },
  {
    value: "no_answer",
    label: "No answer",
    hint: "No pickup, no voicemail.",
  },
  {
    value: "refused",
    label: "Refused (removes from queue)",
    hint: "Owner declined to renew.",
  },
  {
    value: "paid",
    label: "Marked paid (removes from queue)",
    hint: "Go record the payment after saving.",
  },
  {
    value: "reschedule",
    label: "Reschedule (hides for N days)",
    hint: "Call back in N days.",
  },
] as const

export function OutcomeRadioGroup({
  value,
  onChange,
  disabled = false,
}: OutcomeRadioGroupProps) {
  return (
    <fieldset
      disabled={disabled}
      className="grid grid-cols-1 gap-2 sm:grid-cols-2"
    >
      <legend className="mb-1 text-sm font-medium">Outcome</legend>
      {OPTIONS.map((option) => {
        const active = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-md border bg-background px-3 py-2 transition-colors",
              active
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name="followup-outcome"
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              disabled={disabled}
              className="mt-0.5 size-4 accent-primary"
            />
            <span className="flex-1">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.hint}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}

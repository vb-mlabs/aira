// ErrorState — what the user sees when something failed. Friendly title +
// actionable retry, with technical detail collapsed (so it's available for
// devs/screenshots without cluttering the page).
// Per Design Principle 1: error states are user experiences, not afterthoughts.

"use client"

import { AlertCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@mlabs/ui-web/button"

interface ErrorStateProps {
  title?: string
  description?: string
  /** Called when the user clicks "Try again". If absent, no retry button. */
  retry?: () => void | Promise<void>
  /** Technical detail (stack trace, error message). Hidden by default. */
  detail?: string
}

export function ErrorState({
  title = "Something went wrong",
  description = "We couldn't load this. Try again?",
  retry,
  detail,
}: ErrorStateProps) {
  const [showDetail, setShowDetail] = useState(false)
  const [retrying, setRetrying] = useState(false)

  async function onRetry() {
    if (!retry) return
    setRetrying(true)
    try {
      await retry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <div
        aria-hidden
        className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive"
      >
        <AlertCircle className="size-6" />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {retry && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Trying…" : "Try again"}
        </Button>
      )}
      {detail && (
        <div className="mt-4 max-w-md w-full">
          <button
            type="button"
            onClick={() => setShowDetail((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {showDetail ? "Hide details" : "Show details"}
          </button>
          {showDetail && (
            <pre className="mt-2 overflow-auto rounded-md bg-muted p-3 text-left text-xs">
              {detail}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}

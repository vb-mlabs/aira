"use client"

// Optimistic favorite toggle. Hidden entirely for anonymous callers.
//
// The whole-card overlay on BusinessCard uses an absolutely-positioned
// `::after` to make every cell clickable; this button sits at `z-10` so
// its own click wins over the navigation overlay (same pattern as
// SocialLinks). Single-click toggles favorited ↔ unfavorited and fires
// the matching mutation. On network failure the local state reverts and
// a small red dot signals the failure until the next successful click —
// no global toast, no notification bell.

import { useState } from "react"
import { Heart } from "lucide-react"
import { ApiError } from "@aira/api"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"

interface FavoriteButtonProps {
  businessId: string
  isFavorited: boolean
  isSignedIn: boolean
  /** Optional sizing override. Default fits a card's right-column stack;
   *  the detail-page header passes `lg` to match the rating-row scale. */
  size?: "sm" | "lg"
}

export function FavoriteButton({
  businessId,
  isFavorited,
  isSignedIn,
  size = "sm",
}: FavoriteButtonProps) {
  // Decision locked: anonymous users see no heart at all.
  if (!isSignedIn) return null

  return <FavoriteButtonInner businessId={businessId} initial={isFavorited} size={size} />
}

function FavoriteButtonInner({
  businessId,
  initial,
  size,
}: {
  businessId: string
  initial: boolean
  size: "sm" | "lg"
}) {
  const [favorited, setFavorited] = useState(initial)
  const [error, setError] = useState(false)
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (pending) return
    const next = !favorited
    setFavorited(next)
    setError(false)
    setPending(true)
    try {
      if (next) {
        await apiClient.post("/api/v1/favorites", {
          business_id: businessId,
        })
      } else {
        await apiClient.delete(`/api/v1/favorites/${businessId}`)
      }
    } catch (err) {
      // Optimistic state revert + visible failure cue. Errors that surface
      // here are real — auth drops to 401, the API runs in 5xx — so
      // bothering the user with a one-pixel indicator is the right
      // friction level (not a toast).
      setFavorited(!next)
      setError(true)
      // ApiError is the expected failure shape from defineOperation; log
      // anything else to the console so dev still has a breadcrumb.
      if (!(err instanceof ApiError)) {
        console.error("favorite mutation failed", err)
      }
    } finally {
      setPending(false)
    }
  }

  const iconSize = size === "lg" ? "size-6 md:size-7" : "size-5"
  const buttonSize =
    size === "lg" ? "size-9 md:size-10" : "size-8"

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from favorites" : "Favorite this listing"}
      className={cn(
        "relative z-10 inline-flex flex-shrink-0 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        favorited
          ? "text-destructive hover:text-destructive/80"
          : "text-muted-foreground hover:text-foreground",
        buttonSize,
      )}
    >
      <Heart
        aria-hidden
        className={iconSize}
        fill={favorited ? "currentColor" : "none"}
        strokeWidth={2}
      />
      {error && (
        <span
          aria-hidden
          title="Couldn't update favorite. Try again."
          className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-destructive"
        />
      )}
    </button>
  )
}

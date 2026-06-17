"use client"

// "I'm interested" toggle button. Calls POST / DELETE
// /api/v1/community/posts/[id]/interests. Disabled for the post author
// (parent decides) and for unauthed visitors (parent renders a link to
// /login instead). On 409 (already interested) we flip the local state
// to active so the UI matches the server.

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Heart, HeartHandshake } from "lucide-react"
import { ApiError } from "@aira/api"
import { Button } from "@aira/ui-web/button"
import { cn } from "@aira/ui-web/utils"
import { apiClient } from "@/lib/api-client"

interface InterestButtonProps {
  postId: string
  /** Has the current session already shown interest? Drives the toggle. */
  initialActive: boolean
  /** Used by parent to show the live count next to the button. */
  initialCount: number
  /** Render the count alongside the button so the parent doesn't have to. */
  showCount?: boolean
}

interface MutationResult {
  ok: true
  interest_count: number
}

export function InterestButton({
  postId,
  initialActive,
  initialCount,
  showCount = true,
}: InterestButtonProps) {
  const router = useRouter()
  const [active, setActive] = useState(initialActive)
  const [count, setCount] = useState(initialCount)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    startTransition(async () => {
      const path = `/api/v1/community/posts/${encodeURIComponent(postId)}/interests`
      try {
        if (active) {
          // DELETE doesn't return a parsed body via apiClient.delete; we
          // know the count drops by exactly one when our row goes away
          // (other inserts will reconcile on router.refresh below).
          await apiClient.delete(path)
          setActive(false)
          setCount((c) => Math.max(0, c - 1))
        } else {
          const res = await apiClient.post<MutationResult>(path, {})
          setActive(true)
          setCount(res.interest_count)
        }
        router.refresh()
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.code === "community.already_interested") {
            setActive(true)
          } else {
            setError(err.message)
          }
        } else {
          throw err
        }
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant={active ? "secondary" : "default"}
        onClick={onClick}
        disabled={pending}
        className={cn(
          "rounded-full px-5",
          !active &&
            "bg-[image:var(--gradient-primary)] shadow-[var(--shadow-primary-glow)]",
        )}
      >
        {active ? (
          <>
            <HeartHandshake aria-hidden />
            Interested
          </>
        ) : (
          <>
            <Heart aria-hidden />
            I&rsquo;m interested
          </>
        )}
      </Button>
      {showCount && (
        <span className="text-sm text-muted-foreground">
          {count === 0
            ? "Be the first to show interest"
            : count === 1
              ? "1 neighbour is interested"
              : `${count} neighbours are interested`}
        </span>
      )}
      {error && (
        <p role="alert" className="basis-full text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

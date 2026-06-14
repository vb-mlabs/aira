// Editorial card for a single community post. Server-renderable — the
// "I can help" interaction lives in <InterestButton/> (client). Drops the
// button when the viewer is the post author; otherwise hands current-state
// + count to the button.

import Link from "next/link"
import type { PostRow } from "../types"
import { InterestButton } from "./interest-button"

interface PostCardProps {
  post: PostRow
  /** Current session user id, when known. Used to suppress "I can help"
   *  on a post the viewer authored. */
  currentUserId?: string | null
  /** Whether the current session has already offered to help on this post.
   *  Defaults to false; the parent passes the truthful value when it has
   *  pre-fetched interests data. */
  alreadyHelped?: boolean
  /** When true, wraps the title in a link to the detail page. The card on
   *  the detail page itself sets this to false (no self-link). */
  linkToDetail?: boolean
}

export function PostCard({
  post,
  currentUserId = null,
  alreadyHelped = false,
  linkToDetail = true,
}: PostCardProps) {
  const isAuthor = currentUserId !== null && currentUserId === post.user_id

  const title = linkToDetail ? (
    <Link
      href={`/community/${post.id}`}
      className="font-display text-2xl leading-snug text-foreground hover:underline md:text-[28px]"
    >
      {post.title}
    </Link>
  ) : (
    <h2 className="font-display text-2xl leading-snug text-foreground md:text-[28px]">
      {post.title}
    </h2>
  )

  return (
    <article className="rounded-xl bg-card px-6 py-6 shadow-[var(--shadow-card)] sm:px-8 sm:py-7">
      <header className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-bold text-primary"
        >
          {initialsOf(post.author_name)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-foreground">
            {post.author_name}
          </p>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {relativeTime(post.created_at)}
          </p>
        </div>
        <StatusPill status={post.status} />
      </header>

      <div className="mt-5">{title}</div>
      {post.body && (
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/85">
          {post.body}
        </p>
      )}

      <footer className="mt-6">
        {isAuthor ? (
          <p className="text-sm text-muted-foreground">
            {post.interest_count === 0
              ? "No one has offered help yet."
              : post.interest_count === 1
                ? "1 neighbour has offered to help."
                : `${post.interest_count} neighbours have offered to help.`}
          </p>
        ) : (
          <InterestButton
            postId={post.id}
            initialActive={alreadyHelped}
            initialCount={post.interest_count}
          />
        )}
      </footer>
    </article>
  )
}

function StatusPill({ status }: { status: PostRow["status"] }) {
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary">
        <span aria-hidden className="size-1.5 rounded-full bg-primary" />
        Open
      </span>
    )
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
        Closed
      </span>
    )
  }
  if (status === "pending") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-[11px] font-medium text-warning-foreground">
        Pending review
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-[11px] font-medium text-destructive">
      Not approved
    </span>
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const initials = parts.map((p) => p[0]?.toUpperCase() ?? "").join("")
  return initials || "?"
}

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const m = Math.floor(ms / 60_000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  if (d < 30) return `${Math.floor(d / 7)}w ago`
  return new Date(iso).toLocaleDateString()
}

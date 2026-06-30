# Run log: Mobile parity (P2a) — Community board

**2026-06-29** — Pre-flight: working tree had plan + review + learnings from the same session. Committed as `e760f2d chore(mstack): mobile parity P2a plan + review`. Tree now clean. Starting task loop.

**T1** (`5a66907`) — Built features/community/{api,hooks}.ts. Pause-If trigger fired: needed to verify CreateCommentInputSchema field name (id vs post_id) and ListCommentsOutputSchema return shape. Resolved by reading validator — `id` is the post id in BOTH the URL and the body (matches web's apiClient.post call), and ListCommentsOutput is `{ items: CommentThreadNode[] }`. Wrote wrappers + 5 hooks (usePosts useInfiniteQuery, usePost, useComments, useCreatePost, useCreateComment — invalidate-only at this point).

**T2** (`f3ef186`) — Deleted post.tsx placeholder via `git rm`. Added post/ directory: _layout.tsx (Stack with paper-cream header), index.tsx (board screen). Built PostCard with BusinessCard chrome standard (no border + soft shadow). Companion helpers: relative-time.ts and initials.ts inlined per review open question (first mobile consumer). Header "+ New Post" plus icon pushes /post/new even though the route doesn't exist yet (T3 fills it).

**T3** (`8553efc`) — Composer screen at post/new.tsx with 4 fields (title/body/phone/email), KeyboardAvoidingView for iOS, inline error from ApiError.message, footer caption explaining the moderation gate. router.replace on success so back goes to the board.

**T4** (`ba6a9ef`) — Detail screen + 3 supporting components shipped in one commit:
- PostStatusBanner branches on 4 statuses (pending muted, expired muted, rejected destructive-tinted, approved → null)
- ContactReveal: phone + email rows tappable to tel:/mailto:, returns null when both empty
- ReportButton (mailto:supportEmail with templated subject/body) — Apple Guideline 1.2 minimum bar
- Detail screen composes title + meta + banner + body + ContactReveal + ReportButton + (T5 slot)

**T5** (`589d893`) — Threaded comments. Upgraded useCreateComment from invalidate-only (T1) to full optimistic-append: onMutate snapshots cache, constructs temp comment from useMe() identity, appends to items[] (top-level) or to parent.replies[] (reply with parent_id). onError rolls back. onSettled invalidates. Built CommentThread (oldest-first below the pinned-top composer, reply toggle per comment with inline compact composer, per-comment ReportButton, moderator tombstone for hidden rows) and CommentComposer (multi-line Input + Submit; compact variant for replies). Mounted on detail screen below the post ReportButton.

**2026-06-29** — All 5 tasks complete. Typecheck + lint clean throughout. Writing report.

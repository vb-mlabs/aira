import {
  pgEnum,
  pgTable,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core"
import { type AnyPgColumn } from "drizzle-orm/pg-core"
import { user } from "./auth"
import { communityPost } from "./community-post"

// Discussion thread on each community post. v1 supports 1 level of
// replies — parent_id either is null (top-level) or points at a
// top-level comment. The 1-level cap is enforced in the service layer
// (Vitest cover); no Postgres trigger.
//
// status:
//   visible  — default; renders normally on the public thread.
//   hidden   — admin moderated; renders as a tombstone "Comment removed
//              by moderator" with no author attribution. Body stays in
//              the DB for audit but is never projected to the wire.
//
// Cascade behaviour: deleting a post cascades to its comments; deleting
// a top-level comment cascades to its replies (matches Reddit's
// "deleted by author" semantics).

export const postCommentStatusEnum = pgEnum("post_comment_status", [
  "visible",
  "hidden",
])

export const postComment = pgTable(
  "post_comment",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    post_id: text("post_id")
      .notNull()
      .references(() => communityPost.id, { onDelete: "cascade" }),
    /** Null for top-level comments; references another row in this
     *  table for replies. Replies under a hidden parent still render
     *  normally; deletion of the parent cascades through. */
    parent_id: text("parent_id").references((): AnyPgColumn => postComment.id, {
      onDelete: "cascade",
    }),
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    status: postCommentStatusEnum("status").notNull().default("visible"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("post_comment_post_idx").on(table.post_id, table.created_at),
    index("post_comment_user_idx").on(table.user_id),
  ],
)

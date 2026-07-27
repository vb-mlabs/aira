import "server-only"

// F20 v3 — community post comments operations.
//
// Read endpoint is `permission: "user"` (the board itself is gated, so
// non-signed-in visitors never see comments). The write endpoints all
// gate at "user"; the service does the author-or-admin check for
// delete by inspecting the boolean we pass through.
//
// Notification fan-out lives here (not in the service) so the create
// call stays focused on persistence + the audit row. Best-effort:
// failures don't roll back the comment (mirrors addInterestOp's email
// pattern).

import { community as communityService } from "@aira/services"
import {
  createNotification,
  sendPushToUser,
} from "@aira/services/notifications"
import { env } from "@/config/env"
import { logger } from "@/lib/logger"
import {
  AdminModerateCommentInputSchema,
  AdminModerateCommentOutputSchema,
  CreateCommentInputSchema,
  CreateCommentOutputSchema,
  DeleteCommentInputSchema,
  DeleteCommentOutputSchema,
  ListCommentsInputSchema,
  ListCommentsOutputSchema,
} from "@aira/validators/community"
import { defineOperation } from "./index"

/** Cap on the body_preview shipped in the notification body. The bell
 *  drop-down has a 2-line clip; 140 chars matches the comment composer
 *  preview length. */
const BODY_PREVIEW_MAX = 140

function clip(s: string, max: number): string {
  if (s.length <= max) return s
  return `${s.slice(0, max - 1)}…`
}

export const listCommunityCommentsOp = defineOperation({
  name: "community.listComments",
  input: ListCommentsInputSchema,
  output: ListCommentsOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) => {
    const viewerIsAdmin =
      ctx.user.role === "admin" || ctx.user.role === "super_admin"
    return communityService.listComments(db, ctx, {
      post_id: input.id,
      viewerIsAdmin,
    })
  },
})

export const createCommunityCommentOp = defineOperation({
  name: "community.createComment",
  input: CreateCommentInputSchema,
  output: CreateCommentOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) => {
    const result = await communityService.createComment(db, ctx, {
      post_id: input.id,
      body: input.body,
      parent_id: input.parent_id,
    })

    // Notify the post author (top-level) or parent commenter (reply).
    // Skip when the commenter is the recipient. A reply where parent
    // author === post author still only fires ONE notification (the
    // parent-commenter branch wins) so the same person doesn't get
    // double-pinged.
    //
    // Two-stage fan-out:
    //   1. createNotification writes the always-authoritative in-app
    //      row (bell icon / notifications tab). Never rolled back.
    //   2. sendPushToUser fires the mobile push using that row's id
    //      as the tap-through target. Push is a delivery accelerant
    //      on top of the in-app row — a push failure MUST NOT
    //      surface to the user; both push AND in-app failure are
    //      swallowed by the same try/catch below.
    try {
      const isReply = result.parent_author_id !== null
      const recipientId = isReply
        ? result.parent_author_id!
        : result.post_author_id
      if (recipientId !== ctx.userId) {
        const commenterName = result.comment.user_name ?? "Someone"
        const bodyPreview = clip(result.comment.body ?? "", BODY_PREVIEW_MAX)
        const inApp = await createNotification(db, ctx, {
          userId: recipientId,
          body: {
            kind: "post_comment",
            post_id: result.comment.post_id,
            post_title: result.post_title,
            commenter_id: ctx.userId,
            commenter_name: commenterName,
            body_preview: bodyPreview,
            is_reply: isReply,
          },
        })
        // Push copy locked in review 2026-07-27:
        //   Title tells you WHAT happened at a glance without needing
        //   to unlock; body carries the who + preview.
        await sendPushToUser(
          db,
          recipientId,
          {
            title: isReply
              ? "New reply to your comment"
              : "New comment on your post",
            body: `${commenterName}: ${bodyPreview}`,
            data: {
              kind: "post_comment",
              notification_id: inApp.id,
              post_id: result.comment.post_id,
              is_reply: isReply,
            },
            notification_id: inApp.id,
          },
          { expoAccessToken: env.EXPO_ACCESS_TOKEN },
        )
      }
    } catch (err) {
      logger.error("comment notify failed", {
        kind: "notification.post_comment",
        comment_id: result.comment.id,
        message: String(err),
      })
    }

    return { comment: result.comment }
  },
})

export const deleteCommunityCommentOp = defineOperation({
  name: "community.deleteComment",
  input: DeleteCommentInputSchema,
  output: DeleteCommentOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) => {
    const viewerIsAdmin =
      ctx.user.role === "admin" || ctx.user.role === "super_admin"
    return communityService.deleteComment(db, ctx, {
      id: input.id,
      isAdmin: viewerIsAdmin,
    })
  },
})

export const adminModerateCommunityCommentOp = defineOperation({
  name: "community.adminModerateComment",
  input: AdminModerateCommentInputSchema,
  output: AdminModerateCommentOutputSchema,
  permission: "admin",
  handler: async (db, ctx, input) =>
    communityService.moderateComment(db, ctx, {
      id: input.id,
      action: input.action,
    }),
})

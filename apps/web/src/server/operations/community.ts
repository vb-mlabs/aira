import "server-only"

// F20 Community Requests Board — operations.
//
// Read endpoints (list, getById) require an authed user — they sit behind
// the (app) auth shell on web and the bearer flow on mobile. Mutations and
// listInterests use the same "user" permission; the per-operation
// authorisation (MAX_ACTIVE_POSTS_PER_USER cap, self-interest block,
// author-only respondents) lives inside @aira/services/community.

import { community as communityService } from "@aira/services"
import { sendNotificationEmail, buildAppLinkUrl } from "@/lib/email"
import { logger } from "@/lib/logger"
import {
  AddInterestInputSchema,
  AdminListInterestsInputSchema,
  AdminListPostsInputSchema,
  AdminListPostsOutputSchema,
  AdminModeratePostInputSchema,
  AdminModeratePostOutputSchema,
  CreatePostInputSchema,
  CreatePostOutputSchema,
  DeletePostInputSchema,
  DeletePostOutputSchema,
  EditMyPostInputSchema,
  EditPostInputSchema,
  EditPostOutputSchema,
  MyPostLimitsInputSchema,
  MyPostLimitsOutputSchema,
  MyPostsListInputSchema,
  MyPostsListOutputSchema,
  GetPostInputSchema,
  GetPostOutputSchema,
  InterestMutationOutputSchema,
  ListInterestsInputSchema,
  ListInterestsOutputSchema,
  ListPostsInputSchema,
  ListPostsOutputSchema,
  RemoveInterestInputSchema,
} from "@aira/validators/community"
import { defineOperation } from "./index"

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const ADMIN_DEFAULT_PAGE_SIZE = 25

export const listCommunityPostsOp = defineOperation({
  name: "community.list",
  input: ListPostsInputSchema,
  output: ListPostsOutputSchema,
  permission: "user",
  handler: async (db, _ctx, input) => {
    const page = input.page ?? DEFAULT_PAGE
    const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE
    return communityService.listPosts(db, _ctx, {
      q: input.q,
      page,
      pageSize,
    })
  },
})

export const getCommunityPostOp = defineOperation({
  name: "community.getById",
  input: GetPostInputSchema,
  output: GetPostOutputSchema,
  permission: "user",
  handler: async (db, ctx, { id }) => communityService.getPost(db, ctx, { id }),
})

export const createCommunityPostOp = defineOperation({
  name: "community.create",
  input: CreatePostInputSchema,
  output: CreatePostOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) =>
    communityService.createPost(db, ctx, input),
})

export const addInterestOp = defineOperation({
  name: "community.addInterest",
  input: AddInterestInputSchema,
  output: InterestMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) => {
    const result = await communityService.addInterest(db, ctx, input)

    // After the interest commits, email the post author if they haven't
    // opted out. Best-effort — addInterest already returned success, so
    // any failure here is logged with PII-stripped meta (no body / no
    // responder message) and swallowed.
    try {
      const author = await communityService.getPostAuthorForEmail(db, input.id)
      if (author && author.email_on_post_interest) {
        // Don't notify yourself — addInterest's own guard already
        // rejects self-interest, but defence in depth.
        if (author.user_id !== ctx.userId) {
          const bodyText = input.message
            ? `${author.post_title}\n\n${input.message}`
            : author.post_title
          try {
            await sendNotificationEmail({
              to: author.email,
              title: "Someone responded to your post",
              body: bodyText,
              ctaLabel: "View response",
              ctaUrl: buildAppLinkUrl(`/community/${input.id}`),
            })
          } catch (err) {
            logger.error("email send failed", {
              kind: "email.post_interest",
              recipient_user_id: author.user_id,
              message: String(err),
            })
          }
        }
      }
    } catch (err) {
      logger.error("email recipient lookup failed", {
        kind: "email.post_interest",
        message: String(err),
      })
    }

    return result
  },
})

export const removeInterestOp = defineOperation({
  name: "community.removeInterest",
  input: RemoveInterestInputSchema,
  output: InterestMutationOutputSchema,
  permission: "user",
  handler: async (db, ctx, { id }) =>
    communityService.removeInterest(db, ctx, { id }),
})

export const listInterestsOp = defineOperation({
  name: "community.listInterests",
  input: ListInterestsInputSchema,
  output: ListInterestsOutputSchema,
  permission: "user",
  handler: async (db, ctx, { id }) =>
    communityService.listInterests(db, ctx, { id }),
})

// ─── Admin operations ───────────────────────────────────────────────────────

export const adminListCommunityPostsOp = defineOperation({
  name: "community.adminList",
  input: AdminListPostsInputSchema,
  output: AdminListPostsOutputSchema,
  permission: "admin",
  handler: async (db, ctx, input) => {
    const page = input.page ?? DEFAULT_PAGE
    const pageSize = input.pageSize ?? ADMIN_DEFAULT_PAGE_SIZE
    return communityService.adminListPosts(db, ctx, {
      status: input.status,
      page,
      pageSize,
    })
  },
})

export const adminModerateCommunityPostOp = defineOperation({
  name: "community.adminModerate",
  input: AdminModeratePostInputSchema,
  output: AdminModeratePostOutputSchema,
  permission: "admin",
  handler: async (db, ctx, input) => {
    if (input.action === "approve") {
      return communityService.approvePost(db, ctx, { id: input.id })
    }
    return communityService.rejectPost(db, ctx, {
      id: input.id,
      rejected_reason: input.rejected_reason,
    })
  },
})

// ─── F20 v2 — admin edit/delete + admin-only respondent visibility ─────────

export const editCommunityPostOp = defineOperation({
  name: "community.adminEdit",
  input: EditPostInputSchema,
  output: EditPostOutputSchema,
  permission: "admin",
  handler: async (db, ctx, input) =>
    communityService.editPost(db, ctx, {
      id: input.id,
      title: input.title,
      body: input.body,
      phone: input.phone,
      email: input.email,
    }),
})

export const deleteCommunityPostOp = defineOperation({
  name: "community.adminDelete",
  input: DeletePostInputSchema,
  output: DeletePostOutputSchema,
  permission: "admin",
  handler: async (db, ctx, { id }) =>
    communityService.deletePost(db, ctx, { id }),
})

export const adminListInterestsOp = defineOperation({
  name: "community.adminListInterests",
  input: AdminListInterestsInputSchema,
  output: ListInterestsOutputSchema,
  permission: "admin",
  handler: async (db, ctx, { id }) =>
    communityService.adminListInterests(db, ctx, { id }),
})

// ─── F20 v3 — author-side post management ──────────────────────────────────

export const listMyCommunityPostsOp = defineOperation({
  name: "community.listMyPosts",
  input: MyPostsListInputSchema,
  output: MyPostsListOutputSchema,
  permission: "user",
  handler: async (db, ctx) => communityService.listMyPosts(db, ctx),
})

/** Caller's active-post count vs. the per-user cap. Cheap enough for
 *  both the web board's RSC fetch and the mobile board's on-mount
 *  TanStack Query — one indexed COUNT(*) via community_post_user_idx.
 *  Consumers use `remaining === 0` to render the cap-reached CTA
 *  state before the user opens the composer. */
export const getMyCommunityPostLimitsOp = defineOperation({
  name: "community.getMyPostLimits",
  input: MyPostLimitsInputSchema,
  output: MyPostLimitsOutputSchema,
  permission: "user",
  handler: async (db, ctx) => communityService.getMyPostLimits(db, ctx),
})

export const editMyCommunityPostOp = defineOperation({
  name: "community.editMy",
  input: EditMyPostInputSchema,
  // Re-uses EditPostOutputSchema — same `{ post: AdminPostRowSchema }`
  // shape, since the author sees rejected_reason on their own row.
  output: EditPostOutputSchema,
  permission: "user",
  handler: async (db, ctx, input) =>
    communityService.editMyPost(db, ctx, {
      id: input.id,
      title: input.title,
      body: input.body,
      phone: input.phone,
      email: input.email,
    }),
})

export const deleteMyCommunityPostOp = defineOperation({
  name: "community.deleteMy",
  input: DeletePostInputSchema,
  output: DeletePostOutputSchema,
  permission: "user",
  handler: async (db, ctx, { id }) =>
    communityService.deleteMyPost(db, ctx, { id }),
})

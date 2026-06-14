import "server-only"

// F20 Community Requests Board — operations.
//
// Read endpoints (list, getById) require an authed user — they sit behind
// the (app) auth shell on web and the bearer flow on mobile. Mutations and
// listInterests use the same "user" permission; the per-operation
// authorisation (1-active-post limit, self-interest block, author-only
// respondents) lives inside @aira/services/community.

import { community as communityService } from "@aira/services"
import {
  AddInterestInputSchema,
  AdminListPostsInputSchema,
  AdminListPostsOutputSchema,
  AdminModeratePostInputSchema,
  AdminModeratePostOutputSchema,
  CreatePostInputSchema,
  CreatePostOutputSchema,
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
  handler: async (db, ctx, input) =>
    communityService.addInterest(db, ctx, input),
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

// Community Requests Board (F20) — public surface.
//
// Operations under apps/web/src/server/operations/community.ts wrap these
// into REST endpoints at /api/v1/community/* and /api/v1/admin/community/*.

export {
  listPosts,
  getPost,
  createPost,
  approvePost,
  rejectPost,
  addInterest,
  removeInterest,
  listInterests,
  expirePosts,
  adminListPosts,
  getAdminPostStatusCounts,
  editPost,
  deletePost,
  adminListInterests,
  getPostAuthorForEmail,
  listMyPosts,
  editMyPost,
  deleteMyPost,
} from "./service"

export type {
  ListPostsArgs,
  ListPostsResult,
  GetPostResult,
  CreatePostArgs,
  AddInterestArgs,
  AdminListPostsArgs,
  PostAuthorEmailRecipient,
} from "./service"

// Mobile community API — thin wrappers around the shared /api/v1/community/*
// surface used by the web app. Output shapes echo ListPostsOutputSchema /
// GetPostOutputSchema / CreatePostOutputSchema / ListCommentsOutputSchema /
// CreateCommentOutputSchema from @aira/validators; the route handler
// validates with Zod at the server boundary, so we don't re-parse here.

import { apiDelete, apiGet, apiPatch, apiPost } from "../../lib/api/client";
import type {
  AdminPostRow,
  CreateCommentInput,
  CreatePostInput,
  EditMyPostInput,
  GetPostOutput,
  ListCommentsOutput,
  ListPostsInput,
  ListPostsOutput,
  MyPostLimitsOutput,
  PostRow,
  CommentRow,
} from "@aira/validators";
import { MAX_ACTIVE_POSTS_PER_USER } from "@aira/validators/community";

/** GET /api/v1/community/posts — paginated board. Non-admin callers see only
 *  approved posts (service-side filter). */
export async function listCommunityPosts(
  input: ListPostsInput,
): Promise<ListPostsOutput> {
  const query: Record<string, string | number | boolean | undefined> = {
    q: input.q,
    page: input.page,
    pageSize: input.pageSize,
  };
  const res = await apiGet<ListPostsOutput>("/api/v1/community/posts", {
    query,
  });
  return res.data ?? { items: [], total: 0, page: 1, pageSize: 10 };
}

/** GET /api/v1/community/posts/{id} — single post for detail. Returns
 *  null when the post is rejected/pending and the viewer isn't the
 *  author (service guards via is_author check). */
export async function getCommunityPost(
  id: string,
): Promise<GetPostOutput | null> {
  try {
    const res = await apiGet<GetPostOutput>(
      `/api/v1/community/posts/${encodeURIComponent(id)}`,
    );
    return res.data ?? null;
  } catch {
    return null;
  }
}

/** POST /api/v1/community/posts — create a post. Server-set status is
 *  pending; admin moderation flips it to approved before it appears on
 *  the public board. The author's own pending posts are visible via
 *  getCommunityPost (is_author check). */
export async function createCommunityPost(
  input: CreatePostInput,
): Promise<{ post: PostRow }> {
  return apiPost<{ post: PostRow }>("/api/v1/community/posts", input);
}

/** GET /api/v1/community/posts/{id}/comments — 1-level threaded comments
 *  for a post. Mirrors web's CommentThreadNode[] shape (each row carries
 *  its own replies array). */
export async function listCommunityComments(
  postId: string,
): Promise<ListCommentsOutput> {
  const res = await apiGet<ListCommentsOutput>(
    `/api/v1/community/posts/${encodeURIComponent(postId)}/comments`,
    { query: { id: postId } },
  );
  return res.data ?? { items: [] };
}

/** POST /api/v1/community/posts/{id}/comments — create a comment or
 *  reply. parent_id present = reply (1 level cap, server-enforced).
 *  The wire shape echoes web: `id` is the post id (matches the route
 *  segment) and lives in both the URL + the body. */
export async function createCommunityComment(
  input: CreateCommentInput,
): Promise<{ comment: CommentRow }> {
  return apiPost<{ comment: CommentRow }>(
    `/api/v1/community/posts/${encodeURIComponent(input.id)}/comments`,
    input,
  );
}

/** GET /api/v1/community/my-posts — author's own posts regardless of
 *  status. Returns the AdminPostRow shape (with rejected_reason +
 *  user_id + admin fields) since the author sees their own
 *  rejection reasons. Powers /account/posts on mobile. */
export async function listMyCommunityPosts(): Promise<{ items: AdminPostRow[] }> {
  const res = await apiGet<{ items: AdminPostRow[] }>(
    "/api/v1/community/my-posts",
  );
  return res.data ?? { items: [] };
}

/** PATCH /api/v1/community/posts/{id} — author edits own post. Approved
 *  posts revert to pending status server-side (F20 v2 review decision).
 *  Caller should always send body as a string or undefined — NEVER null
 *  (null clears the body; we don't want that).
 *  Returns the AdminPostRow shape (matches the wire output schema
 *  EditPostOutputSchema). */
export async function editMyCommunityPost(
  input: EditMyPostInput,
): Promise<{ post: AdminPostRow }> {
  const { id, ...patch } = input;
  return apiPatch<{ post: AdminPostRow }>(
    `/api/v1/community/posts/${encodeURIComponent(id)}`,
    patch,
  );
}

/** DELETE /api/v1/community/posts/{id} — author deletes own post.
 *  Cascades through post_interest + community_comment on the server. */
export async function deleteMyCommunityPost(id: string): Promise<void> {
  await apiDelete(`/api/v1/community/posts/${encodeURIComponent(id)}`);
}

/** GET /api/v1/community/posts/limits — caller's active post count +
 *  MAX_ACTIVE_POSTS_PER_USER + remaining. Drives the composer's
 *  proactive cap-reached UX on the board CTA and the new-post screen.
 *  Reactive fallback: if the fetch fails, default to full remaining so
 *  createPost's 409 remains the source of truth. */
export async function getMyPostLimits(): Promise<MyPostLimitsOutput> {
  const res = await apiGet<MyPostLimitsOutput>(
    "/api/v1/community/posts/limits",
  );
  return (
    res.data ?? {
      active: 0,
      max: MAX_ACTIVE_POSTS_PER_USER,
      remaining: MAX_ACTIVE_POSTS_PER_USER,
    }
  );
}

// Mobile community API — thin wrappers around the shared /api/v1/community/*
// surface used by the web app. Output shapes echo ListPostsOutputSchema /
// GetPostOutputSchema / CreatePostOutputSchema / ListCommentsOutputSchema /
// CreateCommentOutputSchema from @aira/validators; the route handler
// validates with Zod at the server boundary, so we don't re-parse here.

import { apiGet, apiPost } from "../../lib/api/client";
import type {
  CreateCommentInput,
  CreatePostInput,
  GetPostOutput,
  ListCommentsOutput,
  ListPostsInput,
  ListPostsOutput,
  PostRow,
  CommentRow,
} from "@aira/validators";

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

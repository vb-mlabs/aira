// F20 Community Requests Board — shared shape between web RSC, web Client
// Components, mobile, and the /api/v1/community + /api/v1/admin/community
// route handlers.

import { z } from "zod";

export const COMMUNITY_POST_STATUSES = [
  "pending",
  "approved",
  "expired",
  "rejected",
] as const;
export type CommunityPostStatus = (typeof COMMUNITY_POST_STATUSES)[number];
export const CommunityPostStatusSchema = z.enum(COMMUNITY_POST_STATUSES);

/** Public row — what end users see on the board and detail page. Excludes
 *  rejected_reason and the raw user_id (the post author's display name is
 *  exposed via `author_name`). Rejected posts are never returned through the
 *  public endpoints, so consumers can safely treat status as approved or
 *  expired. */
export const PostRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  status: CommunityPostStatusSchema,
  /** Author user.id — included so client components can recognise "this is
   *  the viewer's own post" without an extra round-trip. The author name is
   *  already publicly visible, so the id is no more sensitive. */
  user_id: z.string(),
  author_name: z.string(),
  interest_count: z.number().int().nonnegative(),
  /** ISO 8601, null when the post is pending (no expiry set yet). */
  expires_at: z.string().nullable(),
  /** ISO 8601 */
  created_at: z.string(),
});
export type PostRow = z.infer<typeof PostRowSchema>;

/** Admin row — full visibility. Includes the user_id (so the admin queue
 *  can link to the author profile) and rejected_reason. */
export const AdminPostRowSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string().nullable(),
  status: CommunityPostStatusSchema,
  user_id: z.string(),
  author_name: z.string(),
  author_email: z.string().nullable(),
  rejected_reason: z.string().nullable(),
  interest_count: z.number().int().nonnegative(),
  expires_at: z.string().nullable(),
  approved_at: z.string().nullable(),
  created_at: z.string(),
});
export type AdminPostRow = z.infer<typeof AdminPostRowSchema>;

/** What a responder typed (or didn't) when they tapped "I can help".
 *  Returned only to the post author. */
export const InterestRowSchema = z.object({
  id: z.string(),
  responder_id: z.string(),
  responder_name: z.string(),
  message: z.string().nullable(),
  created_at: z.string(),
});
export type InterestRow = z.infer<typeof InterestRowSchema>;

// ─── List posts (public board) ──────────────────────────────────────────────

export const ListPostsInputSchema = z
  .object({
    /** Free-text search applied to title + body via ILIKE. */
    q: z.string().trim().max(100).optional(),
    /** 1-indexed page. Defaults to 1 in the op handler. */
    page: z.coerce.number().int().min(1).optional(),
    /** Defaults to 10 in the op handler. */
    pageSize: z.coerce.number().int().min(1).max(50).optional(),
  })
  .strict();
export type ListPostsInput = z.infer<typeof ListPostsInputSchema>;

export const ListPostsOutputSchema = z.object({
  items: z.array(PostRowSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type ListPostsOutput = z.infer<typeof ListPostsOutputSchema>;

// ─── Create post ────────────────────────────────────────────────────────────

export const CreatePostInputSchema = z
  .object({
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().max(1000).optional(),
  })
  .strict();
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const CreatePostOutputSchema = z.object({
  post: PostRowSchema,
});
export type CreatePostOutput = z.infer<typeof CreatePostOutputSchema>;

// ─── Get post (detail) ──────────────────────────────────────────────────────

export const GetPostInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type GetPostInput = z.infer<typeof GetPostInputSchema>;

export const GetPostOutputSchema = z.object({
  post: PostRowSchema.nullable(),
  /** True when the requesting session owns this post; the detail page uses
   *  this to decide whether to fetch /interests. */
  is_author: z.boolean(),
});
export type GetPostOutput = z.infer<typeof GetPostOutputSchema>;

// ─── Interests ──────────────────────────────────────────────────────────────

export const AddInterestInputSchema = z
  .object({
    id: z.string().min(1),
    message: z.string().trim().max(300).optional(),
  })
  .strict();
export type AddInterestInput = z.infer<typeof AddInterestInputSchema>;

export const RemoveInterestInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type RemoveInterestInput = z.infer<typeof RemoveInterestInputSchema>;

export const InterestMutationOutputSchema = z.object({
  ok: z.literal(true),
  /** Current interest_count on the post after the mutation. */
  interest_count: z.number().int().nonnegative(),
});
export type InterestMutationOutput = z.infer<typeof InterestMutationOutputSchema>;

export const ListInterestsInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type ListInterestsInput = z.infer<typeof ListInterestsInputSchema>;

export const ListInterestsOutputSchema = z.object({
  items: z.array(InterestRowSchema),
});
export type ListInterestsOutput = z.infer<typeof ListInterestsOutputSchema>;

// ─── Admin moderation ───────────────────────────────────────────────────────

export const AdminListPostsInputSchema = z
  .object({
    status: CommunityPostStatusSchema.optional(),
    page: z.coerce.number().int().min(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
export type AdminListPostsInput = z.infer<typeof AdminListPostsInputSchema>;

export const AdminListPostsOutputSchema = z.object({
  items: z.array(AdminPostRowSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});
export type AdminListPostsOutput = z.infer<typeof AdminListPostsOutputSchema>;

export const AdminModeratePostInputSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(["approve", "reject"]),
    /** Required only when action === "reject"; ignored on approve. */
    rejected_reason: z.string().trim().max(500).optional(),
  })
  .strict();
export type AdminModeratePostInput = z.infer<typeof AdminModeratePostInputSchema>;

export const AdminModeratePostOutputSchema = z.object({
  post: AdminPostRowSchema,
});
export type AdminModeratePostOutput = z.infer<typeof AdminModeratePostOutputSchema>;

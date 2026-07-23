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

/** Shared length bounds. CreatePostInputSchema and EditPostInputSchema both
 *  read from here so the rules can't drift. */
export const COMMUNITY_POST_TITLE_MAX = 120;
export const COMMUNITY_POST_BODY_MAX = 1000;

/** Per-user cap on ACTIVE posts (status = 'pending' OR 'approved'). Rejected
 *  and expired posts don't count. Server-enforced in
 *  packages/services/src/community/service.ts's createPost; the two clients
 *  fetch getMyCommunityPostLimitsOp to render a proactive cap-reached state
 *  on the composer CTA (see review 2026-07-22-post-cap-3-active). */
export const MAX_ACTIVE_POSTS_PER_USER = 3;

/** Canonical reached-cap caption. Exported here so web + mobile can't drift
 *  on wording. Users can't manually expire a post — the only lever is
 *  delete, so the copy names that lever explicitly. */
export const POST_CAP_REACHED_CAPTION =
  "You've reached 3 active posts. Delete one to add another.";

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
  /** Author profile image URL. Null when the user has not uploaded one;
   *  clients fall back to initials (see @aira/ui-web/avatar). */
  author_image: z.string().nullable(),
  /** Optional contact details surfaced to any signed-in viewer so they can
   *  reach the author directly. Both nullable (post may opt out of either). */
  phone: z.string().nullable(),
  email: z.string().nullable(),
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
  author_image: z.string().nullable(),
  author_email: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
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

/** Lenient phone shape — trimmed string ≤ 30 chars. Matches how
 *  businesses.phone is stored today; intentionally avoids libphonenumber
 *  per the Post-on-AIRA review's locked decision. */
export const COMMUNITY_POST_PHONE_MAX = 30;

export const CreatePostInputSchema = z
  .object({
    title: z.string().trim().min(1).max(COMMUNITY_POST_TITLE_MAX),
    body: z.string().trim().max(COMMUNITY_POST_BODY_MAX).optional(),
    phone: z.string().trim().max(COMMUNITY_POST_PHONE_MAX).optional(),
    email: z.email("Enter a valid email").optional(),
  })
  .strict();
export type CreatePostInput = z.infer<typeof CreatePostInputSchema>;

export const CreatePostOutputSchema = z.object({
  post: PostRowSchema,
});
export type CreatePostOutput = z.infer<typeof CreatePostOutputSchema>;

// ─── My post limits (proactive cap-reached client hint) ────────────────────

/** Signed-in caller's own limits. No inputs — permission gate provides
 *  identity. Empty-object schema keeps the operation surface strict. */
export const MyPostLimitsInputSchema = z.object({}).strict();
export type MyPostLimitsInput = z.infer<typeof MyPostLimitsInputSchema>;

/** { active, max, remaining } — cheap enough to fetch on every board
 *  render. `active` is the count of pending+approved posts owned by the
 *  caller; `max` mirrors MAX_ACTIVE_POSTS_PER_USER; `remaining` is
 *  `max - active`, floored at 0. */
export const MyPostLimitsOutputSchema = z.object({
  active: z.number().int().nonnegative(),
  max: z.number().int().positive(),
  remaining: z.number().int().nonnegative(),
});
export type MyPostLimitsOutput = z.infer<typeof MyPostLimitsOutputSchema>;

// ─── Author-side edit / delete (user owns the row) ─────────────────────────

/** What the author can change via the self-service path. Subset of the
 *  admin EditPostInputSchema — no status, no admin-only fields. The
 *  service rejects edits on expired/rejected rows; an edit on an
 *  approved row reverts status to pending (locked review decision). */
export const EditMyPostInputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(COMMUNITY_POST_TITLE_MAX).optional(),
    body: z.string().trim().max(COMMUNITY_POST_BODY_MAX).nullable().optional(),
    phone: z
      .string()
      .trim()
      .max(COMMUNITY_POST_PHONE_MAX)
      .nullable()
      .optional(),
    email: z
      .union([z.email("Enter a valid email"), z.null()])
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.title !== undefined ||
      v.body !== undefined ||
      v.phone !== undefined ||
      v.email !== undefined,
    { message: "Nothing to update." },
  );
export type EditMyPostInput = z.infer<typeof EditMyPostInputSchema>;

/** Author's own posts, regardless of status. Re-uses AdminPostRowSchema
 *  so the author sees rejected_reason on their own row. */
export const MyPostsListInputSchema = z.object({}).strict();
export type MyPostsListInput = z.infer<typeof MyPostsListInputSchema>;

export const MyPostsListOutputSchema = z.object({
  items: z.array(AdminPostRowSchema),
});
export type MyPostsListOutput = z.infer<typeof MyPostsListOutputSchema>;

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

/** Counts of posts in each status. Surfaced on the admin queue page so the
 *  filter chips can show "Pending (3) · Approved (12) · …" without a second
 *  round-trip. Returned alongside the paginated items on every adminList
 *  call. */
export const StatusCountsSchema = z.object({
  pending: z.number().int().nonnegative(),
  approved: z.number().int().nonnegative(),
  expired: z.number().int().nonnegative(),
  rejected: z.number().int().nonnegative(),
});
export type StatusCounts = z.infer<typeof StatusCountsSchema>;

export const AdminListPostsOutputSchema = z.object({
  items: z.array(AdminPostRowSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  status_counts: StatusCountsSchema,
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

// ─── Admin edit + delete + admin-only interests (F20 v2) ────────────────────

/** Admin can edit the title and/or body of any post regardless of status.
 *  Status is never changed by an edit — keep approve/reject as the only
 *  state-change actions. At least one of title or body must be present;
 *  the .refine() enforces this so the operation surface stays honest.
 *
 *  An explicit `body: null` clears the body. An empty string is rejected
 *  to nudge the admin to use clear-via-empty intentionally (`null` is
 *  unambiguous; `""` looks like a typo). */
export const EditPostInputSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().trim().min(1).max(COMMUNITY_POST_TITLE_MAX).optional(),
    body: z.string().trim().max(COMMUNITY_POST_BODY_MAX).nullable().optional(),
    phone: z
      .string()
      .trim()
      .max(COMMUNITY_POST_PHONE_MAX)
      .nullable()
      .optional(),
    email: z
      .union([z.email("Enter a valid email"), z.null()])
      .optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.title !== undefined ||
      v.body !== undefined ||
      v.phone !== undefined ||
      v.email !== undefined,
    { message: "Nothing to update." },
  );
export type EditPostInput = z.infer<typeof EditPostInputSchema>;

export const EditPostOutputSchema = z.object({
  post: AdminPostRowSchema,
});
export type EditPostOutput = z.infer<typeof EditPostOutputSchema>;

export const DeletePostInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type DeletePostInput = z.infer<typeof DeletePostInputSchema>;

export const DeletePostOutputSchema = z.object({
  ok: z.literal(true),
});
export type DeletePostOutput = z.infer<typeof DeletePostOutputSchema>;

/** Admin-side list of respondents for any post. The public-side
 *  listInterests enforces author-only access; this admin variant bypasses
 *  that guard at the service layer (the operation's `permission: "admin"`
 *  gate is the real ACL). Output shape mirrors ListInterestsOutputSchema. */
export const AdminListInterestsInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type AdminListInterestsInput = z.infer<typeof AdminListInterestsInputSchema>;

// ─── Comments (F20 v3 — thread-style discussion) ────────────────────────────

export const COMMUNITY_COMMENT_BODY_MAX = 1000;

export const CommentStatusSchema = z.enum(["visible", "hidden"]);
export type CommentStatus = z.infer<typeof CommentStatusSchema>;

/** Public wire shape for a single comment. Hidden rows project null
 *  body + null user_id + null user_name (the body never leaves the
 *  service layer for non-admin viewers). */
export const CommentRowSchema = z.object({
  id: z.string(),
  post_id: z.string(),
  parent_id: z.string().nullable(),
  user_id: z.string().nullable(),
  user_name: z.string().nullable(),
  body: z.string().nullable(),
  status: CommentStatusSchema,
  /** ISO 8601 */
  created_at: z.string(),
});
export type CommentRow = z.infer<typeof CommentRowSchema>;

export const CommentThreadNodeSchema = CommentRowSchema.extend({
  replies: z.array(CommentRowSchema),
});
export type CommentThreadNode = z.infer<typeof CommentThreadNodeSchema>;

/** `id` here is the POST id (matches the Next route segment
 *  `/posts/[id]/comments`). The service-layer arg is post_id; the
 *  op handler does the rename. Same convention as AddInterestInputSchema. */
export const ListCommentsInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type ListCommentsInput = z.infer<typeof ListCommentsInputSchema>;

export const ListCommentsOutputSchema = z.object({
  items: z.array(CommentThreadNodeSchema),
});
export type ListCommentsOutput = z.infer<typeof ListCommentsOutputSchema>;

/** `id` here is the POST id (matches the Next route segment). The
 *  op handler renames to post_id for the service call. */
export const CreateCommentInputSchema = z
  .object({
    id: z.string().min(1),
    body: z.string().trim().min(1).max(COMMUNITY_COMMENT_BODY_MAX),
    parent_id: z.string().min(1).optional(),
  })
  .strict();
export type CreateCommentInput = z.infer<typeof CreateCommentInputSchema>;

export const CreateCommentOutputSchema = z.object({
  comment: CommentRowSchema,
});
export type CreateCommentOutput = z.infer<typeof CreateCommentOutputSchema>;

export const DeleteCommentInputSchema = z
  .object({ id: z.string().min(1) })
  .strict();
export type DeleteCommentInput = z.infer<typeof DeleteCommentInputSchema>;

export const DeleteCommentOutputSchema = z.object({
  ok: z.literal(true),
});
export type DeleteCommentOutput = z.infer<typeof DeleteCommentOutputSchema>;

export const AdminModerateCommentInputSchema = z
  .object({
    id: z.string().min(1),
    action: z.enum(["hide", "restore"]),
  })
  .strict();
export type AdminModerateCommentInput = z.infer<typeof AdminModerateCommentInputSchema>;

export const AdminModerateCommentOutputSchema = z.object({
  ok: z.literal(true),
  status: CommentStatusSchema,
});
export type AdminModerateCommentOutput = z.infer<typeof AdminModerateCommentOutputSchema>;

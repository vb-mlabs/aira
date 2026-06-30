// Mobile community hooks — thin TanStack Query wrappers around the
// community API. Cache keys are namespaced ["community", ...] so the
// composer's onSuccess invalidations + the comment optimistic-update
// flow can hit one prefix.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommunityComment,
  createCommunityPost,
  deleteMyCommunityPost,
  editMyCommunityPost,
  getCommunityPost,
  listCommunityComments,
  listCommunityPosts,
  listMyCommunityPosts,
} from "./api";
import { useMe } from "../auth/hooks";
import type {
  CreateCommentInput,
  CreatePostInput,
  EditMyPostInput,
  ListCommentsOutput,
} from "@aira/validators";

const POSTS_PAGE_SIZE = 12;

/** Paginated infinite scroll over the Post on AIRA board. q optional. */
export function usePosts(q?: string) {
  return useInfiniteQuery({
    queryKey: ["community", "posts", q ?? ""],
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      listCommunityPosts({
        q: q?.trim() ? q.trim() : undefined,
        page: pageParam as number,
        pageSize: POSTS_PAGE_SIZE,
      }),
    getNextPageParam: (lastPage) => {
      const seen = lastPage.page * lastPage.pageSize;
      return seen < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
}

/** Single post for the detail screen. Returns null when the service
 *  refuses (non-author + non-public status). */
export function usePost(id: string | undefined) {
  return useQuery({
    queryKey: ["community", "post", id],
    queryFn: () => getCommunityPost(id as string),
    enabled: !!id,
  });
}

/** Comment thread for one post. Returns 1-level CommentThreadNode[]. */
export function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["community", "comments", postId],
    queryFn: () => listCommunityComments(postId as string),
    enabled: !!postId,
  });
}

/** Create a new post — composer submit. Invalidates the board so the
 *  new pending post lands on /account/posts (P2c) cleanly, and the
 *  composer's caller can router.replace to the detail screen which
 *  re-fetches via usePost. */
export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePostInput) => createCommunityPost(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community", "posts"] });
    },
  });
}

/** Create a comment (or reply when parent_id is set). Optimistic: the new
 *  comment is appended to the local cache before the request returns so
 *  the user sees their text immediately; on success we invalidate the
 *  thread to reconcile against the server's authoritative shape, on
 *  error we roll back to the pre-mutate snapshot.
 *
 *  Top-level comments get appended at the END of items (oldest-first
 *  display puts the newest at the bottom). Replies nest under the
 *  parent's `replies` array — the 1-level reply cap is enforced
 *  server-side. */
export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  const me = useMe();
  const queryKey = ["community", "comments", postId] as const;

  return useMutation({
    mutationFn: (input: CreateCommentInput) => createCommunityComment(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListCommentsOutput>(queryKey);

      const temp = {
        id: `temp-${Date.now()}`,
        post_id: postId,
        parent_id: input.parent_id ?? null,
        user_id: me.data?.id ?? null,
        user_name: me.data?.name ?? null,
        body: input.body,
        status: "visible" as const,
        created_at: new Date().toISOString(),
      };

      qc.setQueryData<ListCommentsOutput>(queryKey, (old) => {
        if (!old) return { items: [{ ...temp, replies: [] }] };
        if (input.parent_id) {
          return {
            items: old.items.map((node) =>
              node.id === input.parent_id
                ? { ...node, replies: [...node.replies, temp] }
                : node,
            ),
          };
        }
        return { items: [...old.items, { ...temp, replies: [] }] };
      });

      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey });
    },
  });
}

/** Author's own community posts — drives /account/posts. Includes
 *  pending / rejected / expired rows that the public board op
 *  filters out. */
export function useMyCommunityPosts() {
  return useQuery({
    queryKey: ["community", "my-posts"],
    queryFn: listMyCommunityPosts,
    staleTime: 60_000,
  });
}

/** Edit your own community post. On success invalidates both the
 *  /account/posts list and the public detail cache (in case the user
 *  opens the public view next). Server reverts approved posts to
 *  pending status on any edit — caller's "Edits sent for moderation"
 *  toast carries that expectation. */
export function useEditMyPost(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EditMyPostInput) => editMyCommunityPost(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community", "my-posts"] });
      void qc.invalidateQueries({ queryKey: ["community", "post", postId] });
    },
  });
}

/** Delete your own community post. Cascades through post_interest +
 *  community_comment server-side. Invalidates the my-posts list. */
export function useDeleteMyPost(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deleteMyCommunityPost(postId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["community", "my-posts"] });
      void qc.removeQueries({ queryKey: ["community", "post", postId] });
    },
  });
}

// Mobile community hooks — thin TanStack Query wrappers around the
// community API. Cache keys are namespaced ["community", ...] so the
// composer's onSuccess invalidations + the comment optimistic-update
// flow can hit one prefix.

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createCommunityComment,
  createCommunityPost,
  getCommunityPost,
  listCommunityComments,
  listCommunityPosts,
} from "./api";
import type {
  CreateCommentInput,
  CreatePostInput,
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

/** Create a comment (or reply when parent_id is set). Invalidates the
 *  thread to reconcile after the optimistic append. */
export function useCreateComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCommentInput) => createCommunityComment(input),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: ["community", "comments", postId],
      });
    },
  });
}

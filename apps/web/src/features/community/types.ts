// Re-exports for ergonomic imports inside the community feature folder.
// Components reach for the validators types directly; this file gives them
// a single import line.

export type {
  AdminPostRow,
  CommunityPostStatus,
  InterestRow,
  PostRow,
} from "@aira/validators/community"

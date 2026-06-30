import * as React from "react";
import { Pressable, Text, View } from "react-native";
import type { CommentRow, CommentThreadNode } from "@aira/validators";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useComments } from "../hooks";
import { relativeTime } from "../relative-time";
import { CommentComposer } from "./CommentComposer";
import { ReportButton } from "./ReportButton";

interface CommentThreadProps {
  postId: string;
  /** Locked to post.status === "approved" by the parent — rejected /
   *  expired posts hide the composer entirely and render a muted
   *  "Comments are closed on this post" line instead. */
  acceptsComments: boolean;
}

/** 1-level threaded comments for a community post. Mirrors web's
 *  CommentThreadNode[] shape (each row carries its own `replies`
 *  array). Composer pinned at the TOP per the locked review decision;
 *  oldest comments below, newest at the bottom. */
export function CommentThread({
  postId,
  acceptsComments,
}: CommentThreadProps) {
  const list = useComments(postId);
  const items = list.data?.items ?? [];

  return (
    <View style={{ gap: 16 }}>
      <Text className="text-xs font-semibold uppercase tracking-wider text-mutedForeground">
        Comments
      </Text>

      {acceptsComments ? (
        <CommentComposer postId={postId} />
      ) : (
        <Text className="text-sm text-mutedForeground">
          Comments are closed on this post.
        </Text>
      )}

      {list.isLoading ? (
        <View style={{ gap: 8 }}>
          <Skeleton width="100%" height={48} borderRadius={8} />
          <Skeleton width="100%" height={48} borderRadius={8} />
        </View>
      ) : items.length === 0 ? (
        <Text className="text-sm text-mutedForeground">No comments yet.</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {items.map((node) => (
            <CommentNodeRow
              key={node.id}
              node={node}
              postId={postId}
              acceptsComments={acceptsComments}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface CommentNodeRowProps {
  node: CommentThreadNode;
  postId: string;
  acceptsComments: boolean;
}

/** A top-level comment plus any nested 1-level replies. Reply composer
 *  toggles inline below the row. */
function CommentNodeRow({ node, postId, acceptsComments }: CommentNodeRowProps) {
  const [replyOpen, setReplyOpen] = React.useState(false);

  return (
    <View style={{ gap: 8 }}>
      <CommentRowView node={node} />

      {/* Reply toggle + Report — only when comments are open + this is
          a visible (non-hidden) comment. */}
      {acceptsComments && node.status === "visible" ? (
        <View
          className="flex-row items-center"
          style={{ gap: 12, paddingLeft: 8 }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={replyOpen ? "Cancel reply" : "Reply to comment"}
            onPress={() => setReplyOpen((v) => !v)}
            hitSlop={6}
          >
            <Text className="text-xs font-semibold text-primary">
              {replyOpen ? "Cancel" : "Reply"}
            </Text>
          </Pressable>
          <ReportButton kind="comment" id={node.id} />
        </View>
      ) : null}

      {replyOpen ? (
        <View style={{ paddingLeft: 16 }}>
          <CommentComposer
            postId={postId}
            parentId={node.id}
            onSubmitted={() => setReplyOpen(false)}
            compact
          />
        </View>
      ) : null}

      {/* 1-level reply nesting. Server enforces the cap so we don't
          recurse. */}
      {node.replies.length > 0 ? (
        <View style={{ paddingLeft: 16, gap: 8 }}>
          {node.replies.map((reply) => (
            <View key={reply.id} style={{ gap: 6 }}>
              <CommentRowView node={reply} />
              {acceptsComments && reply.status === "visible" ? (
                <View
                  className="flex-row items-center"
                  style={{ gap: 12, paddingLeft: 8 }}
                >
                  <ReportButton kind="comment" id={reply.id} />
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Single comment row — author + relative time + body. Hidden rows
 *  render the locked moderator tombstone (matches web's behavior). */
function CommentRowView({ node }: { node: CommentRow }) {
  const hidden = node.status === "hidden";
  return (
    <View className="rounded-xl bg-card p-3">
      <Text className="text-xs text-mutedForeground">
        {hidden ? "(comment removed)" : node.user_name ?? "AIRA user"}
        {!hidden ? ` · ${relativeTime(node.created_at)}` : null}
      </Text>
      {!hidden && node.body ? (
        <Text className="mt-1 text-sm leading-snug text-foreground">
          {node.body}
        </Text>
      ) : null}
    </View>
  );
}

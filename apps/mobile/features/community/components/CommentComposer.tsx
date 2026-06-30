import * as React from "react";
import { Text, View } from "react-native";
import { ApiError } from "../../../lib/api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useCreateComment } from "../hooks";

interface CommentComposerProps {
  postId: string;
  /** When set, this composer posts a reply nested under the parent
   *  comment. 1-level cap enforced server-side. */
  parentId?: string;
  /** Called after a successful create (e.g. to collapse a reply
   *  composer back into the thread). */
  onSubmitted?: () => void;
  /** Optional visual variant: inline replies are tighter than the
   *  primary thread composer. */
  compact?: boolean;
}

const COMMENT_MAX = 1000;

/** Inline composer for a new top-level comment OR a reply (when parentId
 *  is set). Optimistic-append wired in useCreateComment — the user sees
 *  their comment immediately. On error, the cache rolls back and an
 *  inline error message renders below the textarea. */
export function CommentComposer({
  postId,
  parentId,
  onSubmitted,
  compact = false,
}: CommentComposerProps) {
  const create = useCreateComment(postId);
  const [body, setBody] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const pending = create.isPending;
  const submitDisabled = pending || body.trim().length === 0;

  async function onSubmit() {
    setError(null);
    const trimmed = body.trim();
    if (trimmed.length === 0) return;
    try {
      await create.mutateAsync({
        id: postId,
        body: trimmed,
        parent_id: parentId,
      });
      setBody("");
      onSubmitted?.();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      setError("Couldn't post comment. Try again.");
    }
  }

  return (
    <View style={{ gap: compact ? 6 : 8 }}>
      <Input
        placeholder={parentId ? "Write a reply…" : "Write a comment…"}
        value={body}
        onChangeText={setBody}
        maxLength={COMMENT_MAX}
        multiline
        numberOfLines={compact ? 2 : 3}
        textAlignVertical="top"
        accessibilityHint={`Optional reply input. Max ${COMMENT_MAX} characters.`}
      />
      {error ? (
        <Text className="text-xs font-semibold text-destructive">
          {error}
        </Text>
      ) : null}
      <View className="flex-row justify-end">
        <Button
          size={compact ? "sm" : "md"}
          onPress={onSubmit}
          disabled={submitDisabled}
          loading={pending}
          accessibilityLabel={parentId ? "Post reply" : "Post comment"}
        >
          {parentId ? "Reply" : "Post comment"}
        </Button>
      </View>
    </View>
  );
}

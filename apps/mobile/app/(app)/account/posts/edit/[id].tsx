import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { ApiError } from "../../../../../lib/api/client";
import { Button } from "../../../../../components/ui/Button";
import { Dialog } from "../../../../../components/ui/Dialog";
import { Input } from "../../../../../components/ui/Input";
import { Skeleton } from "../../../../../components/ui/Skeleton";
import { useToast } from "../../../../../components/ui/Toast";
import { EmptyState } from "../../../../../features/listings/components/EmptyState";
import {
  useDeleteMyPost,
  useEditMyPost,
  usePost,
} from "../../../../../features/community/hooks";

const TITLE_MAX = 120;
const BODY_MAX = 1000;
const PHONE_MAX = 30;

/**
 * /account/posts/edit/[id] — author editor for their own community
 * post. Pre-fills from usePost(id), submits via PATCH. Approved posts
 * revert to pending status server-side on any edit (F20 v2 decision).
 *
 * Delete button at the bottom of the form opens a Dialog confirm →
 * DELETE → navigate back to /account/posts.
 *
 * IMPORTANT: never send body as null. The EditMyPostInputSchema body
 * field is .nullable().optional() — null clears the body, undefined
 * leaves unchanged. Empty input → send undefined.
 */
export default function PostEditScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : undefined;
  const detail = usePost(id);
  const edit = useEditMyPost(id ?? "");
  const del = useDeleteMyPost(id ?? "");
  const toast = useToast();

  const post = detail.data?.post ?? null;

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [primed, setPrimed] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  // Pre-fill the form once when the post lands. Don't keep
  // re-priming on every re-fetch — that would clobber in-progress
  // user edits.
  React.useEffect(() => {
    if (!post || primed) return;
    setTitle(post.title);
    setBody(post.body ?? "");
    setPhone(post.phone ?? "");
    setEmail(post.email ?? "");
    setPrimed(true);
  }, [post, primed]);

  if (!id || (detail.isFetched && !post)) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <Stack.Screen options={{ title: "Not found" }} />
        <EmptyState
          title="Post not found."
          description="It may have been removed or is no longer visible to you."
        />
      </SafeAreaView>
    );
  }

  if (detail.isLoading || !primed) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
        <Stack.Screen options={{ title: "Edit post" }} />
        <View className="mt-4 px-5" style={{ gap: 16 }}>
          <Skeleton width="100%" height={40} borderRadius={8} />
          <Skeleton width="100%" height={120} borderRadius={8} />
          <Skeleton width="100%" height={40} borderRadius={8} />
        </View>
      </SafeAreaView>
    );
  }

  const titleTrimmed = title.trim();
  const submitDisabled = edit.isPending || titleTrimmed.length === 0;

  async function onSubmit() {
    if (!id) return;
    setError(null);
    if (titleTrimmed.length === 0) {
      setError("Please add a short title.");
      return;
    }
    try {
      await edit.mutateAsync({
        id,
        title: titleTrimmed,
        // Always send a string OR undefined — never null. Empty body
        // sends undefined which the server treats as "unchanged"
        // rather than "clear the body".
        body: body.trim() ? body.trim() : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
        email: email.trim() ? email.trim() : undefined,
      });
      toast.show({
        message: "Edits sent for moderation",
        kind: "success",
      });
      router.back();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      toast.show({
        message: "Couldn't save. Try again.",
        kind: "error",
      });
    }
  }

  async function onDelete() {
    if (!id) return;
    try {
      await del.mutateAsync();
      toast.show({ message: "Post deleted", kind: "success" });
      router.back();
    } catch (err) {
      toast.show({
        message: err instanceof Error ? err.message : "Couldn't delete",
        kind: "error",
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "Edit post" }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 20,
            paddingBottom: 32,
            gap: 16,
          }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Labels + placeholders + counters mirror web's PostFields
              (apps/web/src/features/community/components/post-fields.tsx)
              so create + edit feel identical across surfaces. */}
          <View>
            <Input
              label="Title"
              placeholder="Room for rent, weekend tutoring, paediatrician…"
              value={title}
              onChangeText={setTitle}
              maxLength={TITLE_MAX}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            <Text className="mt-1 text-xs text-mutedForeground">
              {title.length} / {TITLE_MAX}
            </Text>
          </View>

          <View>
            <Input
              label="Description (optional)"
              placeholder="Any extra detail neighbours should know — price, availability, what you're looking for…"
              value={body}
              onChangeText={setBody}
              maxLength={BODY_MAX}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <Text className="mt-1 text-xs text-mutedForeground">
              {body.length} / {BODY_MAX}
            </Text>
          </View>

          <Input
            label="Phone (optional)"
            placeholder="(404) 555-0100"
            value={phone}
            onChangeText={setPhone}
            maxLength={PHONE_MAX}
            keyboardType="phone-pad"
            hint="Visible to other signed-in members."
          />

          <Input
            label="Email (optional)"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint="Visible to other signed-in members."
          />

          {error ? (
            <View
              className="rounded-lg px-3 py-2"
              style={{ backgroundColor: "#FBE2E2" }}
            >
              <Text className="text-sm font-semibold text-destructive">
                {error}
              </Text>
            </View>
          ) : null}

          <Button
            fullWidth
            size="lg"
            onPress={onSubmit}
            disabled={submitDisabled}
            loading={edit.isPending}
            accessibilityLabel="Save edits"
          >
            Save
          </Button>

          <Text className="text-center text-xs text-mutedForeground">
            Edits to an approved post revert it to pending for moderator
            review.
          </Text>

          {/* Delete button at the bottom of the form, separated from
              the Save action so a misclick is unlikely. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Delete this post"
            onPress={() => setShowDelete(true)}
            disabled={del.isPending}
            className="mt-8 items-center py-3"
          >
            <Text className="text-sm font-semibold text-destructive">
              Delete post
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete this post?"
        description="This cannot be undone. Comments on this post will be removed too."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />
    </SafeAreaView>
  );
}

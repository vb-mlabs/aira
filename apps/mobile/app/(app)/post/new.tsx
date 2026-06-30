import * as React from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { ApiError } from "../../../lib/api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../components/ui/Toast";
import { useCreatePost } from "../../../features/community/hooks";

const TITLE_MAX = 120;
const BODY_MAX = 1000;
const PHONE_MAX = 30;

/**
 * Composer for a new community post. Mirrors the field set web's
 * post-form.tsx exposes: title (required, ≤120), body (optional, ≤1000),
 * phone (optional, ≤30), email (optional, valid email shape).
 *
 * Submit calls createCommunityPostOp via useCreatePost. On success the
 * server returns the new post (status=pending); router.replace pushes
 * the user onto /post/<new-id> so back navigates to the board, not to
 * an empty composer. The detail screen will render PostStatusBanner
 * showing "Waiting for moderation" since pending posts don't show on
 * the public board until admin approves.
 */
export default function PostComposerScreen() {
  const create = useCreatePost();
  const toast = useToast();

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const pending = create.isPending;
  const titleTrimmed = title.trim();
  const submitDisabled = pending || titleTrimmed.length === 0;

  async function onSubmit() {
    setError(null);
    if (titleTrimmed.length === 0) {
      setError("Please add a short title for your post.");
      return;
    }
    try {
      const { post } = await create.mutateAsync({
        title: titleTrimmed,
        body: body.trim() ? body.trim() : undefined,
        phone: phone.trim() ? phone.trim() : undefined,
        email: email.trim() ? email.trim() : undefined,
      });
      // Replace so back goes to the board, not to the empty composer.
      router.replace(`/post/${post.id}` as never);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        return;
      }
      toast.show({
        message: "Couldn't post. Try again.",
        kind: "error",
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "New post" }} />
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
          <Input
            label="Title"
            placeholder="What are you looking for?"
            value={title}
            onChangeText={setTitle}
            maxLength={TITLE_MAX}
            autoCapitalize="sentences"
            returnKeyType="next"
            accessibilityHint="Required. Max 120 characters."
          />
          <Input
            label="Body"
            placeholder="Add a few details (optional)…"
            value={body}
            onChangeText={setBody}
            maxLength={BODY_MAX}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            accessibilityHint="Optional. Max 1000 characters."
          />
          <Input
            label="Phone (optional)"
            placeholder="+1 404 555 0123"
            value={phone}
            onChangeText={setPhone}
            maxLength={PHONE_MAX}
            keyboardType="phone-pad"
            accessibilityHint="Optional. Shown on your post so people can reach you."
          />
          <Input
            label="Email (optional)"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityHint="Optional. Shown on your post so people can reach you."
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
            loading={pending}
            accessibilityLabel="Post on AIRA"
          >
            Post
          </Button>

          <Text className="text-center text-xs text-mutedForeground">
            Your post will be reviewed before it appears on the board.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

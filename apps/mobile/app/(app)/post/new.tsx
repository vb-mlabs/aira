import * as React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { ApiError } from "../../../lib/api/client";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useToast } from "../../../components/ui/Toast";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { useCreatePost } from "../../../features/community/hooks";

const TITLE_MAX = 120;
const BODY_MAX = 1000;
const PHONE_MAX = 30;

const HELPER_VISIBLE = "Visible to other signed-in members.";

// presentation: "pageSheet" + iOS 15+ sheet detents give the composer
// a proper bottom-sheet feel — slides up from the bottom, snaps to
// medium (~half-height), user can drag up to large or swipe down to
// dismiss. sheetGrabberVisible shows the horizontal grabber pill so
// the drag affordance is discoverable.
//
// headerShown:false is inherited from the post stack layout — the
// composer renders a shared <TopBar /> inside its content area
// instead of relying on the native bar (see nav/TopBar.tsx for why).
//
// History note: an earlier attempt used presentation:"formSheet" with
// the same detent config (commit 1db5b94 → reverted in cccedbd) — on
// iOS formSheet renders as a small centered iPad-style card, which
// isn't a bottom sheet at all. pageSheet is the correct sibling: it
// keeps the full-width bottom-sheet chrome, and the detent config
// controls the height. Android ignores the sheet-* options and falls
// back to a full-screen slide-up modal (react-navigation limitation).
const SCREEN_OPTIONS = {
  presentation: "pageSheet" as const,
  // Fractional detents (native-stack 6.10+): 0.5 = half height, 1.0 =
  // near-full. Sheet opens at index 0 (half) so the user sees enough of
  // the underlying board to feel in-context.
  sheetAllowedDetents: [0.5, 1] as number[],
  sheetInitialDetentIndex: 0,
  sheetGrabberVisible: true,
  sheetCornerRadius: 20,
};

/**
 * Composer for a new community post. Opens as a bottom sheet on iOS
 * (presentation: 'formSheet') and a full-screen modal on Android.
 * Field labels + placeholders + helper text mirror web's PostFields
 * component so the create + edit experience stays visually consistent
 * across surfaces.
 *
 * Submit calls createCommunityPostOp via useCreatePost. On success
 * router.replace pushes the user onto /post/<new-id> so back navigates
 * to the board, not to an empty composer. The detail screen will
 * render PostStatusBanner showing "Waiting for moderation" since
 * pending posts don't show on the public board until admin approves.
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
      <Stack.Screen options={SCREEN_OPTIONS} />
      <TopBar title="New post" left={<BackButton />} />
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
          {/* Title + description placeholders intentionally short on
              mobile — the sheet at 0.5 detent is narrow and the long
              multi-example placeholders inherited from web
              (post-fields.tsx) were getting truncated. Labels above
              already carry the field name; placeholder is a one-line
              prompt. Radha 2026-07-06 UAT. */}
          <View>
            <Input
              label="Title"
              placeholder="e.g. Room for rent"
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
              placeholder="Add more details…"
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
            hint={HELPER_VISIBLE}
          />

          <Input
            label="Email (optional)"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            hint={HELPER_VISIBLE}
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

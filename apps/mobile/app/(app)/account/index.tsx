import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Avatar } from "../../../components/ui/Avatar";
import { Dialog } from "../../../components/ui/Dialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { useMe, useSignOut } from "../../../features/auth/hooks";
import { usePickAndUploadAvatar } from "../../../features/avatar/hooks";
import { useDeleteAccount } from "../../../features/profile/hooks";

/**
 * Account hub — flat row list mirroring web's /account page. Each row
 * routes to a stack screen under apps/mobile/app/(app)/account/. Sign
 * out + Delete account stay at the bottom as destructive rows.
 *
 * The legacy iOS Settings sections (Profile / Notifications / Security /
 * Danger Zone) from pre-P2c got dropped along with their no-op
 * Name/Email/Change-password rows. The "Enable notifications" push-
 * permission re-prompt action moved to /account/privacy-security in T6.
 */

const ICON_COLOR = "#4F653B"; // primary olive
const DESTRUCTIVE_COLOR = "#d40c1a"; // destructive red

interface HubRowProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  label: string;
  onPress: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
}

function HubRow({
  icon,
  label,
  onPress,
  destructive,
  accessibilityHint,
}: HubRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className="flex-row items-center border-b border-border bg-card px-4"
      style={{ minHeight: 60, gap: 14 }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={destructive ? DESTRUCTIVE_COLOR : ICON_COLOR}
      />
      <Text
        className={
          destructive
            ? "flex-1 text-base text-destructive"
            : "flex-1 text-base text-foreground"
        }
      >
        {label}
      </Text>
      <Text className="text-base text-mutedForeground">›</Text>
    </Pressable>
  );
}

export default function AccountScreen() {
  const me = useMe();
  const signOut = useSignOut();
  const uploadAvatar = usePickAndUploadAvatar();
  const deleteAccount = useDeleteAccount();
  const toast = useToast();
  const [showSignOut, setShowSignOut] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Hide the Stack header on the tab landing — matches the pattern
          shipped in P2b. Sub-pages inherit the default Stack header. */}
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Avatar header — preserved byte-for-byte from P2b */}
        <View className="items-center px-6 pt-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
            accessibilityHint="Opens your photo library to pick a new avatar"
            onPress={async () => {
              try {
                const result = await uploadAvatar.mutateAsync();
                if (result) {
                  toast.show({ message: "Avatar updated", kind: "success" });
                }
              } catch (e) {
                toast.show({
                  message:
                    e instanceof Error ? e.message : "Couldn't update avatar",
                  kind: "error",
                });
              }
            }}
            // 88×88 tap target per a11y spec
            style={{
              width: 88,
              height: 88,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {me.isLoading ? (
              <Skeleton width={80} height={80} borderRadius={40} />
            ) : (
              <Avatar
                src={me.data?.image ?? undefined}
                name={me.data?.name}
                userId={me.data?.id}
                size={80}
              />
            )}
          </Pressable>
          {me.isLoading ? (
            <View className="mt-3 items-center" style={{ gap: 6 }}>
              <Skeleton width={140} height={20} />
              <Skeleton width={180} height={16} />
            </View>
          ) : (
            <>
              <Text className="mt-3 text-xl font-semibold text-foreground">
                {me.data?.name ?? ""}
              </Text>
              <Text className="text-base text-mutedForeground">
                {me.data?.email ?? ""}
              </Text>
            </>
          )}
        </View>

        {/* 7 sub-page rows in locked order: Favorites → My Listings →
            My Posts → Notifications → Privacy & Security → Terms →
            About */}
        <View className="mt-6 overflow-hidden">
          <HubRow
            icon="heart-outline"
            label="Favorites"
            accessibilityHint="See businesses you've saved"
            onPress={() => router.push("/account/favorites" as never)}
          />
          <HubRow
            icon="store-outline"
            label="My Listings"
            accessibilityHint="Businesses you manage"
            onPress={() => router.push("/account/listings" as never)}
          />
          <HubRow
            icon="message-text-outline"
            label="My Posts"
            accessibilityHint="Community posts you've authored"
            onPress={() => router.push("/account/posts" as never)}
          />
          <HubRow
            icon="bell-outline"
            label="Notifications"
            accessibilityHint="In-app notifications"
            onPress={() => router.push("/account/notifications" as never)}
          />
          <HubRow
            icon="lock-outline"
            label="Privacy & Security"
            onPress={() =>
              router.push("/account/privacy-security" as never)
            }
          />
          <HubRow
            icon="file-document-outline"
            label="Terms"
            onPress={() => router.push("/account/terms" as never)}
          />
          <HubRow
            icon="information-outline"
            label="About"
            onPress={() => router.push("/account/about" as never)}
          />
        </View>

        {/* Destructive actions at the bottom — preserved from P2b */}
        <View className="mt-6 overflow-hidden">
          <HubRow
            icon="logout"
            label="Sign out"
            onPress={() => setShowSignOut(true)}
            destructive
          />
          <HubRow
            icon="delete-outline"
            label="Delete account"
            onPress={() => setShowDelete(true)}
            destructive
            accessibilityHint="Permanently deletes your account and data"
          />
        </View>
      </ScrollView>

      <Dialog
        open={showSignOut}
        onClose={() => setShowSignOut(false)}
        title="Sign out?"
        description="You'll need to sign in again to continue."
        confirmLabel="Sign out"
        destructive
        onConfirm={async () => {
          await signOut.mutateAsync();
          // useSignOut's onSuccess calls qc.clear(), which flips useMe()
          // to undefined; the (app) gate at _layout.tsx then redirects to
          // /(auth)/welcome. One source of redirection truth.
        }}
      />
      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete account?"
        description="This permanently deletes your account and all data. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          try {
            await deleteAccount.mutateAsync();
            // Same as sign-out: (app) gate handles the redirect to welcome
            // once useMe is invalidated server-side.
          } catch (e) {
            toast.show({
              message:
                e instanceof Error ? e.message : "Couldn't delete account",
              kind: "error",
            });
          }
        }}
      />
    </SafeAreaView>
  );
}

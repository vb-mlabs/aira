import * as React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar } from "../../components/ui/Avatar";
import { Dialog } from "../../components/ui/Dialog";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";
import { useMe, useSignOut } from "../../features/auth/hooks";
import { usePickAndUploadAvatar } from "../../features/avatar/hooks";
import { useDeleteAccount } from "../../features/profile/hooks";

/**
 * Profile screen — iOS Settings pattern. Grouped rows with hairline dividers
 * + uppercase muted section headers. NOT stacked cards (Pass-4 rejection).
 */

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <Text className="mb-2 ml-4 mt-6 text-xs uppercase tracking-wider text-mutedForeground">
      {children}
    </Text>
  );
}

function Row({
  label,
  value,
  onPress,
  destructive,
  accessibilityHint,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  destructive?: boolean;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-border bg-card px-4"
      style={{ minHeight: 60 }}
    >
      <Text
        className={
          destructive
            ? "text-base text-destructive"
            : "text-base text-foreground"
        }
      >
        {label}
      </Text>
      {value ? (
        <Text className="text-base text-mutedForeground" numberOfLines={1}>
          {value}
        </Text>
      ) : (
        <Text className="text-base text-mutedForeground">›</Text>
      )}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const me = useMe();
  const signOut = useSignOut();
  const uploadAvatar = usePickAndUploadAvatar();
  const deleteAccount = useDeleteAccount();
  const toast = useToast();
  const [showSignOut, setShowSignOut] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
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
            style={{ width: 88, height: 88, alignItems: "center", justifyContent: "center" }}
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

        <SectionHeader>Profile</SectionHeader>
        <View className="overflow-hidden">
          <Row
            label="Name"
            value={me.data?.name}
            onPress={() => {
              /* push edit name modal — out of scope v1 */
            }}
          />
          <Row
            label="Email"
            value={me.data?.email}
            onPress={() => {
              /* email change requires verify flow — v2 */
            }}
          />
        </View>

        <SectionHeader>Security</SectionHeader>
        <View className="overflow-hidden">
          <Row
            label="Change password"
            onPress={() => {
              /* nav to change-password — v2 */
            }}
          />
        </View>

        <SectionHeader>Danger Zone</SectionHeader>
        <View className="overflow-hidden">
          <Row
            label="Sign out"
            onPress={() => setShowSignOut(true)}
            destructive
          />
          <Row
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

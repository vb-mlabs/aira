import * as React from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { Avatar } from "../../../components/ui/Avatar";
import { Dialog } from "../../../components/ui/Dialog";
import { Skeleton } from "../../../components/ui/Skeleton";
import { useToast } from "../../../components/ui/Toast";
import { HamburgerButton } from "../../../components/nav/HamburgerButton";
import { TopBar } from "../../../components/nav/TopBar";
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
  /** Last row in a group drops the bottom hairline so the trailing
   *  divider doesn't bleed below the rounded card corner. */
  isLast?: boolean;
}

function HubRow({
  icon,
  label,
  onPress,
  destructive,
  accessibilityHint,
  isLast,
}: HubRowProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      onPress={onPress}
      className={
        isLast
          ? "flex-row items-center bg-card px-4"
          : "flex-row items-center border-b border-border bg-card px-4"
      }
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

  // Cream "Account" header now matches Home/Categories/Post for full
  // top-bar parity across tabs. The avatar block stays as the hero
  // below it. No SafeAreaView — the Stack header owns the top inset
  // and the Tabs bar owns the bottom.
  return (
    <View className="flex-1 bg-background">
      <TopBar title="Account" left={<HamburgerButton />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Avatar header — px-5 unifies gutter with every other tab
            (Home, Categories, Listings) and matches the inset row
            groups below. Avatar circle is centered so the gutter
            shift only affects name/email text width. */}
        <View className="items-center px-5 pt-6">
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

        {/* Sub-page rows in locked order: My Profile → Favorites →
            My Listings → My Posts → Notifications → Safety & Community →
            Privacy & Data → Legal & Policies → Help & Support → About.
            mx-5 mirrors the 20pt gutter every other tab uses (Home,
            Categories, Listings); rounded-xl + overflow-hidden clips the
            inner row borders so the group reads as one card with
            internal hairline dividers.

            Note: the /account/privacy-security and /account/terms routes
            are kept for backwards-compat with existing installs and any
            in-flight push notifications that link to them; the visible
            labels ("Privacy & Data", "Legal & Policies") are what
            users see. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
          <HubRow
            icon="account-outline"
            label="My Profile"
            accessibilityHint="Edit your name, email, and password"
            onPress={() => router.push("/account/profile" as never)}
          />
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
            icon="shield-account-outline"
            label="Safety & Community"
            accessibilityHint="Community standards and how to report content"
            onPress={() =>
              router.push("/account/safety-community" as never)
            }
          />
          <HubRow
            icon="lock-outline"
            label="Privacy & Data"
            accessibilityHint="What we collect and how we use it"
            onPress={() =>
              router.push("/account/privacy-security" as never)
            }
          />
          <HubRow
            icon="file-document-outline"
            label="Legal & Policies"
            accessibilityHint="Terms of service and legal notices"
            onPress={() => router.push("/account/terms" as never)}
          />
          <HubRow
            icon="lifebuoy"
            label="Help & Support"
            accessibilityHint="Get help or contact the team"
            onPress={() => router.push("/account/help-support" as never)}
          />
          <HubRow
            icon="information-outline"
            label="About"
            onPress={() => router.push("/account/about" as never)}
            isLast
          />
        </View>

        {/* Destructive actions at the bottom — same gutter + card
            grouping as the sub-page list above. */}
        <View className="mx-5 mt-6 overflow-hidden rounded-xl">
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
            isLast
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
          // useSignOut's onSettled calls Updates.reloadAsync() — the JS
          // runtime restarts and the cold-boot path at app/index.tsx
          // handles the welcome-screen redirect. The Dialog dismisses
          // effectively instantly because the entire app is about to
          // re-mount.
        }}
      />
      <Dialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete account?"
        description={
          // Multi-paragraph body + external legal link. The link opens
          // the marketing site's deletion policy in the system browser
          // via Linking.openURL (apex-only rule — brand.url from
          // @aira/config, never hand-typed). Kept inline here rather
          // than lifted into a shared component because this is the
          // only rich Dialog body in the app today.
          <>
            <Text className="text-base text-mutedForeground">
              Deleting your account removes your login, profile,
              favorites, posts, comments, and related account data,
              except information we may retain under our Privacy Policy.
            </Text>
            <Text className="text-base text-mutedForeground">
              If your email is linked to an active business listing, you
              will lose access to it. The membership and listing will
              remain active until the membership expires and will be
              removed if not renewed.
            </Text>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Account Deletion Information"
              accessibilityHint="Opens the account deletion policy on our website"
              onPress={() => {
                void Linking.openURL(`${brand.url}/legal#deletion`);
              }}
              className="mt-1 flex-row items-center"
              style={{ gap: 8 }}
            >
              <MaterialCommunityIcons
                name="information-outline"
                size={18}
                color="#4F653B"
              />
              <Text className="flex-1 text-base font-medium text-primary">
                Account Deletion Information
              </Text>
              <MaterialCommunityIcons
                name="open-in-new"
                size={16}
                color="#7A6B4E"
              />
            </Pressable>
          </>
        }
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
    </View>
  );
}

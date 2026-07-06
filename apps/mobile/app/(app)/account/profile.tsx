import * as React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { ApiError } from "@aira/api";
import { Avatar } from "../../../components/ui/Avatar";
import { Button } from "../../../components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/Card";
import { Input } from "../../../components/ui/Input";
import { PasswordInput } from "../../../components/ui/PasswordInput";
import { useToast } from "../../../components/ui/Toast";
import { useMe } from "../../../features/auth/hooks";
import { usePickAndUploadAvatar } from "../../../features/avatar/hooks";
import {
  useChangePassword,
  useRequestEmailChange,
  useUpdateProfile,
} from "../../../features/profile/hooks";

/**
 * /account/profile — one screen with four Cards: Photo, Display name,
 * Email, Password. Mirrors web /profile's shape (AccountSection +
 * SecuritySection) but as a single scrolling screen rather than two
 * pages. Wired to the shared REST surface via the same hooks the rest
 * of the mobile app uses.
 */
export default function ProfileScreen() {
  const me = useMe();
  const email = me.data?.email ?? "";
  const emailVerified = me.data?.emailVerified ?? true;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Stack.Screen options={{ title: "My Profile" }} />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40, gap: 16 }}
      >
        <AvatarCard />
        <NameCard currentName={me.data?.name ?? ""} />
        <EmailCard currentEmail={email} verified={emailVerified} />
        <PasswordCard />
      </ScrollView>
    </SafeAreaView>
  );
}

function AvatarCard() {
  const me = useMe();
  const uploadAvatar = usePickAndUploadAvatar();
  const toast = useToast();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photo</CardTitle>
      </CardHeader>
      <CardContent>
        <View className="flex-row items-center" style={{ gap: 16 }}>
          <Avatar
            src={me.data?.image ?? undefined}
            name={me.data?.name}
            userId={me.data?.id}
            size={64}
          />
          <Button
            variant="secondary"
            size="sm"
            loading={uploadAvatar.isPending}
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
          >
            Change photo
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function NameCard({ currentName }: { currentName: string }) {
  const [name, setName] = React.useState(currentName);
  const updateProfile = useUpdateProfile();
  const toast = useToast();

  // Seed the field once useMe hydrates. currentName comes from the
  // parent and can arrive after mount when the profile fetch resolves.
  React.useEffect(() => {
    setName(currentName);
  }, [currentName]);

  const dirty = name.trim().length > 0 && name.trim() !== currentName;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Display name</CardTitle>
      </CardHeader>
      <CardContent>
        <View style={{ gap: 12 }}>
          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
            placeholder="Your name"
          />
          <Button
            disabled={!dirty}
            loading={updateProfile.isPending}
            onPress={async () => {
              try {
                await updateProfile.mutateAsync({ name: name.trim() });
                toast.show({ message: "Name updated", kind: "success" });
              } catch (e) {
                toast.show({
                  message:
                    e instanceof Error ? e.message : "Couldn't update name",
                  kind: "error",
                });
              }
            }}
          >
            Save
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function EmailCard({
  currentEmail,
  verified,
}: {
  currentEmail: string;
  verified: boolean;
}) {
  const [newEmail, setNewEmail] = React.useState("");
  const request = useRequestEmailChange();
  const toast = useToast();

  const canSubmit = newEmail.trim().length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email</CardTitle>
      </CardHeader>
      <CardContent>
        <View style={{ gap: 12 }}>
          <View>
            <Text className="text-sm text-mutedForeground">Current</Text>
            <View
              className="mt-1 flex-row items-center"
              style={{ gap: 8, flexWrap: "wrap" }}
            >
              <Text className="text-base text-foreground">{currentEmail}</Text>
              {!verified ? (
                <View className="rounded-full bg-destructive px-2 py-0.5">
                  <Text className="text-xs text-primaryForeground">
                    Not verified
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Input
            label="New email"
            value={newEmail}
            onChangeText={setNewEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            placeholder="you@example.com"
          />
          <Button
            disabled={!canSubmit}
            loading={request.isPending}
            onPress={async () => {
              try {
                const result = await request.mutateAsync({
                  email: newEmail.trim(),
                });
                if (result.changed) {
                  toast.show({
                    message: `Check your inbox at ${currentEmail} to confirm the change.`,
                    kind: "success",
                  });
                  setNewEmail("");
                } else {
                  toast.show({
                    message: "That's already your email.",
                    kind: "info",
                  });
                }
              } catch (e) {
                toast.show({
                  message:
                    e instanceof ApiError
                      ? e.message
                      : e instanceof Error
                        ? e.message
                        : "Couldn't send confirmation",
                  kind: "error",
                });
              }
            }}
          >
            Send confirmation
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

function PasswordCard() {
  const [current, setCurrent] = React.useState("");
  const [next, setNext] = React.useState("");
  const [currentError, setCurrentError] = React.useState<string | undefined>();
  const changePassword = useChangePassword();
  const toast = useToast();

  const canSubmit = current.length > 0 && next.length >= 8;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing your password signs you out on all other devices.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <View style={{ gap: 12 }}>
          <PasswordInput
            label="Current password"
            value={current}
            onChangeText={(v) => {
              setCurrent(v);
              if (currentError) setCurrentError(undefined);
            }}
            autoComplete="current-password"
            error={currentError}
          />
          <PasswordInput
            label="New password"
            value={next}
            onChangeText={setNext}
            autoComplete="new-password"
            hint="At least 8 characters."
          />
          <Button
            disabled={!canSubmit}
            loading={changePassword.isPending}
            onPress={async () => {
              setCurrentError(undefined);
              try {
                await changePassword.mutateAsync({
                  currentPassword: current,
                  newPassword: next,
                });
                toast.show({
                  message: "Password changed. Other devices signed out.",
                  kind: "success",
                });
                setCurrent("");
                setNext("");
              } catch (e) {
                // The op intentionally returns a generic message as an
                // enumeration-oracle guard — surface it verbatim inline
                // under Current rather than rewriting the copy here.
                if (e instanceof ApiError) {
                  setCurrentError(e.message);
                } else {
                  toast.show({
                    message:
                      e instanceof Error
                        ? e.message
                        : "Couldn't change password",
                    kind: "error",
                  });
                }
              }
            }}
          >
            Change password
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

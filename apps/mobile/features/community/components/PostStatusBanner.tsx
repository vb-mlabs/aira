import * as React from "react";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { CommunityPostStatus } from "@aira/validators";

interface PostStatusBannerProps {
  status: CommunityPostStatus;
}

/** Muted banner for non-`approved` post statuses on the detail screen.
 *  - pending: author sees their own post + this banner; "Waiting for
 *    moderation" sets expectation.
 *  - expired: any viewer; "This post has expired" with a muted
 *    explainer.
 *  - rejected: only the author can ever see a rejected post (service
 *    is_author check). Destructive-tinted.
 *  - approved: renders nothing — the post is public and live. */
export function PostStatusBanner({ status }: PostStatusBannerProps) {
  if (status === "approved") return null;

  if (status === "pending") {
    return (
      <Banner
        icon="clock-outline"
        iconColor="#735239"
        bg="#E1D6C2"
        title="Waiting for moderation"
        body="Your post will appear on the board after an admin reviews it."
      />
    );
  }

  if (status === "expired") {
    return (
      <Banner
        icon="archive-outline"
        iconColor="#735239"
        bg="#E1D6C2"
        title="This post has expired"
        body="Comments are closed. Start a new post if you still need help."
      />
    );
  }

  // rejected
  return (
    <Banner
      icon="alert-circle-outline"
      iconColor="#D40C1A"
      bg="#FBE2E2"
      title="This post was rejected"
      body="An admin removed this post from the public board."
    />
  );
}

function Banner({
  icon,
  iconColor,
  bg,
  title,
  body,
}: {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  iconColor: string;
  bg: string;
  title: string;
  body: string;
}) {
  return (
    <View
      className="flex-row rounded-xl p-3"
      style={{ gap: 10, backgroundColor: bg }}
    >
      <MaterialCommunityIcons
        name={icon}
        size={20}
        color={iconColor}
        style={{ marginTop: 2 }}
      />
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{title}</Text>
        <Text className="mt-0.5 text-xs text-foreground" style={{ opacity: 0.8 }}>
          {body}
        </Text>
      </View>
    </View>
  );
}

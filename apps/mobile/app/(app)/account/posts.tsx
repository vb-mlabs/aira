import * as React from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Skeleton } from "../../../components/ui/Skeleton";
import { BackButton } from "../../../components/nav/BackButton";
import { TopBar } from "../../../components/nav/TopBar";
import { MyPostRow } from "../../../features/community/components/MyPostRow";
import { useMyCommunityPosts } from "../../../features/community/hooks";

/**
 * /account/posts — author's own community posts (regardless of status).
 * Tap a row to push the editor at /account/posts/edit/<id>.
 *
 * The list includes pending / rejected / expired rows that the public
 * board op (listCommunityPosts) filters out — listMyCommunityPosts
 * returns ALL posts the user has authored. MyPostRow renders the
 * status pill + rejected_reason per row.
 */
export default function MyPostsScreen() {
  const list = useMyCommunityPosts();
  const items = list.data?.items ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar title="My Posts" left={<BackButton />} />
      {list.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={108} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MyPostRow post={item} />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 48,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching}
              onRefresh={() => {
                void list.refetch();
              }}
            />
          }
          ListEmptyComponent={
            <View className="items-center px-6 py-16">
              <Text className="text-center font-display text-lg font-semibold text-foreground">
                You haven&apos;t posted yet.
              </Text>
              <Text className="mt-2 text-center text-sm text-mutedForeground">
                Tap Post on the bottom tab bar to share what you need.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

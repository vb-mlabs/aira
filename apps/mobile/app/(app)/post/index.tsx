import * as React from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { TopBar } from "../../../components/nav/TopBar";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { brand } from "@aira/config";
import { HamburgerButton } from "../../../components/nav/HamburgerButton";
import { Skeleton } from "../../../components/ui/Skeleton";
import { EmptyState } from "../../../features/listings/components/EmptyState";
import { SearchBar } from "../../../features/listings/components/SearchBar";
import { PostCard } from "../../../features/community/components/PostCard";
import { usePosts } from "../../../features/community/hooks";

/**
 * Community / Post on AIRA board. Mirrors web's /community page:
 * SearchBar + infinite scroll over usePosts. Tap row → /post/<id>;
 * header "New Post" button → /post/new.
 */
export default function PostBoardScreen() {
  const [q, setQ] = React.useState("");
  const list = usePosts(q);

  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);

  const onRefresh = React.useCallback(() => {
    void list.refetch();
  }, [list]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar
        title={`Post on ${brand.name}`}
        left={<HamburgerButton />}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="New post"
            onPress={() => {
              router.push("/post/new" as never);
            }}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color="#3D2814"
            />
          </Pressable>
        }
      />

      {/* Search */}
      <View className="px-5 pt-3">
        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="Search community posts…"
        />
      </View>

      {/* List */}
      {list.isLoading ? (
        <View className="mt-4 px-5" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={88} borderRadius={12} />
          ))}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PostCard post={item} />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 48,
            gap: 12,
          }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={onRefresh}
            />
          }
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              void list.fetchNextPage();
            }
          }}
          ListEmptyComponent={
            q.trim() ? (
              <EmptyState title="No matches for that search." />
            ) : (
              <View className="items-center px-6 py-16">
                <Text className="text-center font-display text-lg font-semibold text-foreground">
                  No posts yet — be the first to ask.
                </Text>
                <Text className="mt-2 text-center text-sm text-mutedForeground">
                  Share what you need; your neighbors will help.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Create the first post"
                  onPress={() => router.push("/post/new" as never)}
                  className="mt-5 rounded-full bg-primary px-5 py-2.5"
                >
                  <Text className="text-sm font-bold text-primaryForeground">
                    Create the first post
                  </Text>
                </Pressable>
              </View>
            )
          }
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View className="py-4 items-center">
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

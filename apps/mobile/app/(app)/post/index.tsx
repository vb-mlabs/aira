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
import { usePosts, useMyPostLimits } from "../../../features/community/hooks";
import { POST_CAP_REACHED_CAPTION } from "@aira/validators/community";

/**
 * Community / Post on AIRA board. Mirrors web's /community page:
 * SearchBar + infinite scroll over usePosts. Tap row → /post/<id>;
 * header "New Post" button → /post/new.
 */
export default function PostBoardScreen() {
  const [q, setQ] = React.useState("");
  const list = usePosts(q);
  const limits = useMyPostLimits();

  const pages = list.data?.pages ?? [];
  const items = pages.flatMap((p) => p.items);
  // Undefined during the initial fetch — treat as "unknown, allow"
  // (server-side gate is the source of truth if the user taps
  // through). Reactive fallback matches the web treatment.
  const capReached = limits.data?.remaining === 0;

  const onRefresh = React.useCallback(() => {
    void list.refetch();
    void limits.refetch();
  }, [list, limits]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <TopBar
        title={`Post on ${brand.name}`}
        left={<HamburgerButton />}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={capReached ? "Post limit reached" : "New post"}
            disabled={capReached}
            onPress={() => {
              if (capReached) return;
              router.push("/post/new" as never);
            }}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: capReached ? 0.4 : 1,
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

      {/* Cap-reached caption — visible above the list when the user
          holds MAX_ACTIVE_POSTS_PER_USER active rows. Same wording as
          the web caption (POST_CAP_REACHED_CAPTION), keeps the two
          surfaces in lockstep. */}
      {capReached ? (
        <View className="mx-5 mt-3 rounded-lg border border-border bg-muted/40 px-3 py-2">
          <Text className="text-xs text-mutedForeground">
            {POST_CAP_REACHED_CAPTION}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Manage my posts"
            onPress={() => router.push("/account/posts" as never)}
            className="mt-1 self-start"
          >
            <Text className="text-xs font-semibold text-primary">
              Manage my posts →
            </Text>
          </Pressable>
        </View>
      ) : null}

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
                  accessibilityLabel={
                    capReached
                      ? "Post limit reached"
                      : "Create the first post"
                  }
                  disabled={capReached}
                  onPress={() => {
                    if (capReached) return;
                    router.push("/post/new" as never);
                  }}
                  className="mt-5 rounded-full bg-primary px-5 py-2.5"
                  style={{ opacity: capReached ? 0.5 : 1 }}
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

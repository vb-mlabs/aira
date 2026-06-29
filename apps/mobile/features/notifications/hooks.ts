import * as React from "react";
import { AppState } from "react-native";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listNotifications, getUnreadCount, markAllRead } from "./api";
import type { NotificationRow } from "./api";

/**
 * Foreground-aware polling interval — 5s when the app is active, 60s when
 * backgrounded. Lifted out of the deleted features/messages/hooks during the
 * P1 mobile-parity tab refactor (notifications was the only remaining
 * consumer). Move to apps/mobile/lib/ if a third polling consumer appears.
 */
function usePollingInterval(): number {
  const [interval, setInterval] = React.useState(() =>
    AppState.currentState === "active" ? 5000 : 60_000
  );
  React.useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      setInterval(state === "active" ? 5000 : 60_000);
    });
    return () => sub.remove();
  }, []);
  return interval;
}

export function useNotifications() {
  const interval = usePollingInterval();
  const cacheRef = React.useRef<{
    lastModified: string | null;
    data: NotificationRow[];
  }>({ lastModified: null, data: [] });

  return useQuery({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const res = await listNotifications({
        ifModifiedSince: cacheRef.current.lastModified ?? undefined,
      });
      if (res.notModified) return cacheRef.current.data;
      cacheRef.current = {
        lastModified: res.lastModified ?? cacheRef.current.lastModified,
        data: res.data ?? [],
      };
      return cacheRef.current.data;
    },
    refetchInterval: interval,
  });
}

export function useUnreadCount() {
  const interval = usePollingInterval();
  const cacheRef = React.useRef<{
    lastModified: string | null;
    count: number;
  }>({ lastModified: null, count: 0 });

  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const res = await getUnreadCount({
        ifModifiedSince: cacheRef.current.lastModified ?? undefined,
      });
      if (res.notModified) return cacheRef.current.count;
      cacheRef.current = {
        lastModified: res.lastModified ?? cacheRef.current.lastModified,
        count: res.count ?? 0,
      };
      return cacheRef.current.count;
    },
    refetchInterval: interval,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { listNotifications, getUnreadCount, markAllRead } from "./api";
import type { Notification } from "./api";
import { usePollingInterval } from "../messages/hooks";

export function useNotifications() {
  const interval = usePollingInterval();
  const cacheRef = React.useRef<{
    lastModified: string | null;
    data: Notification[];
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

import * as React from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppState } from "react-native";
import { listConversations, listMessages, sendMessage } from "./api";
import type { Conversation, Message } from "./api";

/**
 * Returns a polling interval that follows AppState — 5s when foregrounded,
 * 60s when backgrounded. Shared between messages + notifications.
 */
export function usePollingInterval(): number {
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

/**
 * Conversation list with conditional GET. We cache the previous list locally
 * and the server's Last-Modified so a 304 simply re-uses the cached value
 * (no UI flicker).
 */
export function useConversations() {
  const interval = usePollingInterval();
  const cacheRef = React.useRef<{
    lastModified: string | null;
    data: Conversation[];
  }>({ lastModified: null, data: [] });

  return useQuery({
    queryKey: ["messages", "conversations"],
    queryFn: async () => {
      const res = await listConversations({
        ifModifiedSince: cacheRef.current.lastModified ?? undefined,
      });
      if (res.notModified) {
        return cacheRef.current.data;
      }
      cacheRef.current = {
        lastModified: res.lastModified ?? cacheRef.current.lastModified,
        data: res.data ?? [],
      };
      return cacheRef.current.data;
    },
    refetchInterval: interval,
  });
}

export function useMessages(conversationId: string | null) {
  const interval = usePollingInterval();
  return useQuery({
    queryKey: ["messages", "thread", conversationId],
    queryFn: () => listMessages(conversationId as string),
    enabled: !!conversationId,
    refetchInterval: interval,
  });
}

export function useSendMessage(conversationId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage({ conversationId, body }),
    onSuccess: (msg: Message) => {
      qc.setQueryData<Message[]>(
        ["messages", "thread", conversationId],
        (prev) => (prev ? [...prev, msg] : [msg])
      );
      qc.invalidateQueries({ queryKey: ["messages", "conversations"] });
    },
  });
}

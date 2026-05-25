import { apiGet, apiPost } from "../../lib/api/client";

export interface Conversation {
  id: string;
  peer: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
  lastMessagePreview: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export async function listConversations(opts: {
  ifModifiedSince?: string;
}): Promise<{
  data: Conversation[] | null;
  lastModified: string | null;
  notModified: boolean;
}> {
  const res = await apiGet<{ conversations: Conversation[] }>(
    "/api/v1/messages/conversations",
    { ifModifiedSince: opts.ifModifiedSince }
  );
  return {
    data: res.data?.conversations ?? null,
    lastModified: res.lastModified,
    notModified: res.notModified,
  };
}

export async function listMessages(
  conversationId: string
): Promise<Message[]> {
  const res = await apiGet<{ messages: Message[] }>(
    `/api/v1/messages/conversations/${encodeURIComponent(conversationId)}`
  );
  return res.data?.messages ?? [];
}

export async function sendMessage(input: {
  conversationId: string;
  body: string;
}): Promise<Message> {
  const data = await apiPost<{ message: Message }>(
    `/api/v1/messages/conversations/${encodeURIComponent(input.conversationId)}`,
    { body: input.body }
  );
  return data.message;
}

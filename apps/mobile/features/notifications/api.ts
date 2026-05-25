import { apiGet, apiPost } from "../../lib/api/client";

export interface Notification {
  id: string;
  kind: string;
  body: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export async function listNotifications(opts: {
  ifModifiedSince?: string;
}): Promise<{
  data: Notification[] | null;
  lastModified: string | null;
  notModified: boolean;
}> {
  const res = await apiGet<{ notifications: Notification[] }>(
    "/api/v1/notifications",
    { ifModifiedSince: opts.ifModifiedSince }
  );
  return {
    data: res.data?.notifications ?? null,
    lastModified: res.lastModified,
    notModified: res.notModified,
  };
}

export async function getUnreadCount(opts: {
  ifModifiedSince?: string;
}): Promise<{
  count: number | null;
  lastModified: string | null;
  notModified: boolean;
}> {
  const res = await apiGet<{ count: number }>(
    "/api/v1/notifications/unread-count",
    { ifModifiedSince: opts.ifModifiedSince }
  );
  return {
    count: res.data?.count ?? null,
    lastModified: res.lastModified,
    notModified: res.notModified,
  };
}

export async function markAllRead(): Promise<{ ok: true }> {
  return apiPost("/api/v1/notifications/mark-all-read", {});
}

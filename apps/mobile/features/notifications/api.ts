import { apiGet, apiPost } from "../../lib/api/client";
import type { NotificationRow } from "@aira/validators/notifications";

export type { NotificationRow };

export async function listNotifications(opts: {
  ifModifiedSince?: string;
}): Promise<{
  data: NotificationRow[] | null;
  lastModified: string | null;
  notModified: boolean;
}> {
  const res = await apiGet<{ items: NotificationRow[] }>(
    "/api/v1/notifications",
    { ifModifiedSince: opts.ifModifiedSince }
  );
  return {
    data: res.data?.items ?? null,
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

export async function markAllRead(): Promise<{ ok: true; changed: number }> {
  return apiPost("/api/v1/notifications/mark-all-read", {});
}

export async function markRead(
  id: string
): Promise<{ ok: true; changed: number }> {
  return apiPost(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {}
  );
}

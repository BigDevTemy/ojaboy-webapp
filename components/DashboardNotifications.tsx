"use client";

import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  TrendingDown,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { API_BASE_URL, NOTIFICATIONS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  category: string;
  type: string;
  isRead: boolean;
  createdAt?: string;
};

const notificationsEndpoint = `${API_BASE_URL}${NOTIFICATIONS_URL}`;
const pageSize = 20;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function readBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }

      if (value.toLowerCase() === "false") {
        return false;
      }
    }
  }

  return false;
}

function getResponseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) {
    return fallback;
  }

  const message = body.message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseNotification(value: unknown): NotificationItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);

  if (!id) {
    return null;
  }

  return {
    id,
    title: readText(value, ["title", "subject"]) || "Notification",
    body: readText(value, ["body", "message", "description"]),
    category: readText(value, ["category", "channel"]) || "General",
    type: readText(value, ["type", "eventType"]) || "general",
    isRead:
      readBoolean(value, ["isRead", "read"]) ||
      Boolean(readText(value, ["readAt"])),
    createdAt: readText(value, ["createdAt", "sentAt", "updatedAt"]) || undefined,
  };
}

function parseNotifications(body: unknown) {
  const value = isRecord(body)
    ? body.data ?? body.notifications ?? body.results ?? body
    : body;
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((item) => {
    const notification = parseNotification(item);
    return notification ? [notification] : [];
  });
}

function parseUnreadCount(body: unknown) {
  if (!isRecord(body)) {
    return 0;
  }

  const value = Number(body.count ?? body.unreadCount ?? body.data);
  return Number.isFinite(value) ? value : 0;
}

function formatDate(value?: string) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getNotificationIcon(item: NotificationItem) {
  const token = `${item.type} ${item.category}`.toLowerCase();

  if (token.includes("price") || token.includes("market")) {
    return TrendingDown;
  }

  if (token.includes("order")) {
    return PackageCheck;
  }

  if (token.includes("alert") || token.includes("warning")) {
    return AlertTriangle;
  }

  if (token.includes("success") || token.includes("report")) {
    return CheckCircle2;
  }

  return Bell;
}

function isPositiveTone(item: NotificationItem) {
  const token = `${item.type} ${item.category}`.toLowerCase();
  return token.includes("success") || token.includes("report") || token.includes("order");
}

export function DashboardNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [offset, setOffset] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await authenticatedFetch(`${notificationsEndpoint}/unread-count`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (response.ok) {
        setUnreadCount(parseUnreadCount(body));
      }
    } catch {
      // The list remains useful if count fails.
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      limit: String(pageSize),
      offset: String(offset),
    });

    if (unreadOnly) {
      params.set("unreadOnly", "true");
    }

    try {
      const response = await authenticatedFetch(`${notificationsEndpoint}?${params}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load notifications (${response.status}).`));
      }

      setNotifications(parseNotifications(body));
      await loadUnreadCount();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadUnreadCount, offset, unreadOnly]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadNotifications();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadNotifications]);

  async function openNotification(id: string) {
    setBusyAction(`detail-${id}`);
    setError("");

    try {
      const response = await authenticatedFetch(`${notificationsEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load notification (${response.status}).`));
      }

      const value = isRecord(body) ? body.data ?? body.notification ?? body : body;
      const notification = parseNotification(value);

      if (!notification) {
        throw new Error("The notification response was not in the expected format.");
      }

      setSelectedNotification(notification);
      setNotifications((current) =>
        current.map((item) => (item.id === notification.id ? notification : item)),
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load notification.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function markAsRead(id: string) {
    setBusyAction(`read-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${notificationsEndpoint}/${id}/read`, {
        method: "PATCH",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to mark notification read (${response.status}).`));
      }

      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, isRead: true } : item)),
      );
      setSelectedNotification((current) =>
        current?.id === id ? { ...current, isRead: true } : current,
      );
      setUnreadCount((current) => Math.max(0, current - 1));
      setNotice("Notification marked as read.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to mark notification read.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function markAllAsRead() {
    setBusyAction("read-all");
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${notificationsEndpoint}/read-all`, {
        method: "PATCH",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to mark all read (${response.status}).`));
      }

      setNotifications((current) => current.map((item) => ({ ...item, isRead: true })));
      setSelectedNotification((current) => current ? { ...current, isRead: true } : current);
      setUnreadCount(0);
      setNotice("All notifications marked as read.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to mark all notifications read.",
      );
    } finally {
      setBusyAction("");
    }
  }

  function toggleUnreadOnly(nextValue: boolean) {
    setUnreadOnly(nextValue);
    setOffset(0);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Notifications</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Review price alerts, order updates, reports, and account messages.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                !unreadOnly
                  ? "bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]"
                  : "border border-black/10 bg-white text-black/68 hover:text-[#f10606]"
              }`}
              type="button"
              onClick={() => toggleUnreadOnly(false)}
            >
              All
            </button>
            <button
              className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                unreadOnly
                  ? "bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]"
                  : "border border-black/10 bg-white text-black/68 hover:text-[#f10606]"
              }`}
              type="button"
              onClick={() => toggleUnreadOnly(true)}
            >
              Unread ({unreadCount})
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/72 transition hover:text-[#f10606]"
              disabled={isLoading}
              type="button"
              onClick={() => void loadNotifications()}
            >
              <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
              Refresh
            </button>
            <button
              className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/72 transition hover:text-[#f10606] disabled:opacity-50"
              disabled={busyAction === "read-all" || unreadCount === 0}
              type="button"
              onClick={() => void markAllAsRead()}
            >
              {busyAction === "read-all" ? (
                <LoaderCircle className="animate-spin" size={16} />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Mark all read
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
          {notice}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between gap-3 border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-black text-black">Latest Activity</h2>
          <p className="text-xs font-black text-black/42">
            Offset {offset}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2].map((item) => (
              <div className="h-24 animate-pulse rounded-xl bg-black/[0.04]" key={item} />
            ))}
          </div>
        ) : notifications.length ? (
          notifications.map((item) => {
            const Icon = getNotificationIcon(item);
            const isGreen = isPositiveTone(item);

            return (
              <article
                className={`flex gap-4 border-b border-black/10 px-5 py-4 last:border-b-0 ${
                  !item.isRead ? "bg-[#fffafa]" : "bg-white"
                }`}
                key={item.id}
              >
                <button
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                    isGreen ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"
                  }`}
                  type="button"
                  onClick={() => void openNotification(item.id)}
                >
                  {busyAction === `detail-${item.id}` ? (
                    <LoaderCircle className="animate-spin" size={20} />
                  ) : (
                    <Icon size={21} />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <button
                      className="flex min-w-0 items-center gap-2 text-left"
                      type="button"
                      onClick={() => void openNotification(item.id)}
                    >
                      <h3 className="truncate text-sm font-black text-black">{item.title}</h3>
                      {!item.isRead ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#f10606]" /> : null}
                    </button>
                    <span className="w-max rounded-full bg-[#fbfbfb] px-3 py-1 text-[10px] font-black text-black/50">
                      {formatLabel(item.category)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-black/58">{item.body}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-xs font-bold text-black/38">{formatDate(item.createdAt)}</p>
                    {!item.isRead ? (
                      <button
                        className="text-xs font-black text-[#f10606] disabled:opacity-50"
                        disabled={busyAction === `read-${item.id}`}
                        type="button"
                        onClick={() => void markAsRead(item.id)}
                      >
                        {busyAction === `read-${item.id}` ? "Marking..." : "Mark as read"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="p-8 text-center">
            <Bell className="mx-auto text-[#f10606]" size={24} />
            <p className="mt-3 text-sm font-black text-black">No notifications</p>
            <p className="mt-1 text-xs font-medium text-black/48">
              {unreadOnly ? "No unread notifications right now." : "Notifications will appear here."}
            </p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={offset === 0 || isLoading}
          type="button"
          onClick={() => setOffset((current) => Math.max(0, current - pageSize))}
        >
          Previous
        </button>
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={notifications.length < pageSize || isLoading}
          type="button"
          onClick={() => setOffset((current) => current + pageSize)}
        >
          Next
        </button>
      </div>

      {selectedNotification ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedNotification(null);
            }
          }}
        >
          <section
            aria-labelledby="notification-detail-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#f10606]">
                  {formatLabel(selectedNotification.category)}
                </p>
                <h2 className="mt-1 text-lg font-black text-black" id="notification-detail-title">
                  {selectedNotification.title}
                </h2>
                <p className="mt-1 text-xs font-bold text-black/42">
                  {formatDate(selectedNotification.createdAt)}
                </p>
              </div>
              <button
                aria-label="Close notification detail"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                type="button"
                onClick={() => setSelectedNotification(null)}
              >
                <X size={18} />
              </button>
            </header>

            <p className="mt-5 whitespace-pre-wrap text-sm font-medium leading-6 text-black/65">
              {selectedNotification.body || "No message body was provided."}
            </p>

            <div className="mt-5 rounded-xl bg-[#fafafa] p-4">
              <p className="text-xs font-black uppercase text-black/42">Type</p>
              <p className="mt-1 text-sm font-black text-black">
                {formatLabel(selectedNotification.type)}
              </p>
            </div>

            {!selectedNotification.isRead ? (
              <button
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60"
                disabled={busyAction === `read-${selectedNotification.id}`}
                type="button"
                onClick={() => void markAsRead(selectedNotification.id)}
              >
                {busyAction === `read-${selectedNotification.id}` ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <CheckCircle2 size={17} />
                )}
                Mark as read
              </button>
            ) : (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                <CheckCircle2 size={15} />
                Already read
              </p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

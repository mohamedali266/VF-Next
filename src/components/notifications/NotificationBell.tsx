"use client";

import { Bell, CheckCheck, ExternalLink, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  priority: "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";
  link: string | null;
  createdAt: string;
  createdBy: string;
  readAt: string | null;
};

const priorityLabels: Record<NotificationItem["priority"], string> = {
  INFO: "Info",
  SUCCESS: "Success",
  WARNING: "Warning",
  CRITICAL: "Critical",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [error, setError] = useState("");
  const mountedRef = useRef(true);

  const unreadLabel = useMemo(() => unreadCount > 9 ? "9+" : String(unreadCount), [unreadCount]);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load notifications");
      const data = await response.json();
      if (!mountedRef.current) return;
      setNotifications(data.notifications ?? []);
      setUnreadCount(data.unreadCount ?? 0);
      setError("");
    } catch {
      if (mountedRef.current) setError("Notifications are temporarily unavailable.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchNotifications();
    const interval = window.setInterval(() => fetchNotifications(true), 5000);

    const refreshOnFocus = () => fetchNotifications(true);
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") fetchNotifications(true);
    };

    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisible);

    return () => {
      mountedRef.current = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, [fetchNotifications]);

  async function markRead(id: string) {
    setNotifications((items) => items.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? new Date().toISOString() } : item));
    setUnreadCount((count) => Math.max(0, count - 1));
    await fetch(`/api/notifications/${id}/read`, { method: "POST" }).catch(() => fetchNotifications(true));
  }

  async function markAllRead() {
    if (!unreadCount || busy) return;
    setBusy(true);
    const now = new Date().toISOString();
    setNotifications((items) => items.map((item) => ({ ...item, readAt: item.readAt ?? now })));
    setUnreadCount(0);
    await fetch("/api/notifications/read-all", { method: "POST" }).catch(() => fetchNotifications(true));
    setBusy(false);
  }

  function handleOpen() {
    setOpen((value) => !value);
    fetchNotifications(true);
  }

  async function openNotification(notification: NotificationItem) {
    if (!notification.readAt) await markRead(notification.id);
    if (notification.link) window.location.href = notification.link;
  }

  return (
    <div className="notification-shell">
      <button className="notification-trigger" type="button" onClick={handleOpen} aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && <span className="notification-badge">{unreadLabel}</span>}
      </button>

      {open && (
        <div className="notification-panel" role="dialog" aria-label="Notification center">
          <div className="notification-panel-head">
            <div>
              <span className="notification-kicker">Notification Center</span>
              <h2>Updates</h2>
            </div>
            <button className="notification-icon-btn" type="button" onClick={() => setOpen(false)} aria-label="Close notifications">
              <X size={18} />
            </button>
          </div>

          <div className="notification-actions">
            <span>{unreadCount} unread</span>
            <button type="button" onClick={markAllRead} disabled={!unreadCount || busy}>
              {busy ? <Loader2 size={15} className="notification-spin" /> : <CheckCheck size={15} />}
              Mark all read
            </button>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-empty">
                <Loader2 size={18} className="notification-spin" />
                Loading notifications...
              </div>
            ) : error ? (
              <div className="notification-empty notification-error">{error}</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : (
              notifications.map((notification) => (
                <button
                  className={`notification-card ${notification.readAt ? "" : "is-unread"} is-${notification.priority.toLowerCase()}`}
                  type="button"
                  key={notification.id}
                  onClick={() => openNotification(notification)}
                >
                  <span className="notification-card-top">
                    <strong>{notification.title}</strong>
                    <span>{priorityLabels[notification.priority]}</span>
                  </span>
                  <span className="notification-body">{notification.body}</span>
                  <span className="notification-meta">
                    {new Date(notification.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {notification.link && <ExternalLink size={13} />}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

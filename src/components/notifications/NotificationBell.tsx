"use client";

import { Bell, CheckCheck, ExternalLink, Loader2, Volume2, X } from "lucide-react";
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
  const [systemPermission, setSystemPermission] = useState<NotificationPermission>("default");
  const mountedRef = useRef(true);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const unreadLabel = useMemo(() => unreadCount > 9 ? "9+" : String(unreadCount), [unreadCount]);

  const playAlertSound = useCallback(() => {
    try {
      const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;
      const context = new AudioContextCtor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      oscillator.frequency.setValueAtTime(660, context.currentTime + 0.12);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
      window.setTimeout(() => context.close().catch(() => undefined), 520);
    } catch {
      // Browsers may block audio until the user interacts with the page.
    }
  }, []);

  const showSystemNotification = useCallback((notification: NotificationItem) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const systemNotification = new Notification(notification.title, {
      body: notification.body,
      icon: "/vf-icon.svg",
      badge: "/vf-icon.svg",
      tag: notification.id,
    });
    systemNotification.onclick = () => {
      window.focus();
      if (notification.link) window.location.href = notification.link;
      systemNotification.close();
    };
  }, []);

  const fetchNotifications = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load notifications");
      const data = await response.json();
      if (!mountedRef.current) return;
      const nextNotifications: NotificationItem[] = data.notifications ?? [];
      const newUnread = nextNotifications.filter((item) => !item.readAt && !knownIdsRef.current.has(item.id));
      nextNotifications.forEach((item) => knownIdsRef.current.add(item.id));

      if (!firstLoadRef.current && newUnread.length > 0) {
        playAlertSound();
        showSystemNotification(newUnread[0]);
      }

      firstLoadRef.current = false;
      setNotifications(nextNotifications);
      setUnreadCount(data.unreadCount ?? 0);
      setError("");
    } catch {
      if (mountedRef.current) setError("Notifications are temporarily unavailable.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [playAlertSound, showSystemNotification]);

  useEffect(() => {
    mountedRef.current = true;
    if ("Notification" in window) setSystemPermission(Notification.permission);
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

  async function enableSystemAlerts() {
    playAlertSound();
    if (!("Notification" in window)) {
      setError("System notifications are not supported on this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setSystemPermission(permission);
    if (permission === "granted") {
      new Notification("VF-Next alerts enabled", {
        body: "You will receive system alerts for new in-app notifications while the app is open.",
        icon: "/vf-icon.svg",
        badge: "/vf-icon.svg",
        tag: "vf-next-alerts-enabled",
      });
    }
  }

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

          {systemPermission !== "granted" && (
            <button className="notification-system-btn" type="button" onClick={enableSystemAlerts}>
              <Volume2 size={15} />
              Enable system alerts
            </button>
          )}

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

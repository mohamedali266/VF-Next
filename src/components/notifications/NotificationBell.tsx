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
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMessage, setPushMessage] = useState("");
  const [vapidPublicKey, setVapidPublicKey] = useState("");
  const mountedRef = useRef(true);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);

  const unreadLabel = useMemo(() => unreadCount > 9 ? "9+" : String(unreadCount), [unreadCount]);

  function urlBase64ToUint8Array(base64String: string) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = window.atob(base64);
    return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
  }

  const playAlertSound = useCallback(() => {
    try {
      const audio = new Audio("/sound/notification.wav");
      audio.volume = 0.85;
      void audio.play();
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
    const hasPushSupport = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setPushSupported(hasPushSupport);

    fetch("/api/notifications/push-config", { cache: "no-store" })
      .then((response) => response.json())
      .then(async (config) => {
        if (!mountedRef.current) return;
        setPushConfigured(Boolean(config.enabled && config.publicKey));
        setVapidPublicKey(config.publicKey || "");

        if (hasPushSupport && config.enabled) {
          const registration = await navigator.serviceWorker.getRegistration("/vf-push-sw.js");
          const subscription = await registration?.pushManager.getSubscription();
          if (mountedRef.current) setPushEnabled(Boolean(subscription && Notification.permission === "granted"));
        }
      })
      .catch(() => {
        if (mountedRef.current) setPushConfigured(false);
      });

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
    if (pushBusy) return;
    setPushBusy(true);
    setPushMessage("");
    playAlertSound();
    if (!pushSupported) {
      setPushMessage("This browser does not support push notifications.");
      setPushBusy(false);
      return;
    }

    if (!pushConfigured || !vapidPublicKey) {
      setPushMessage("Push notifications need VAPID keys in Vercel first.");
      setPushBusy(false);
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setSystemPermission(permission);
      if (permission !== "granted") {
        setPushMessage(permission === "denied" ? "Notifications are blocked. Enable them from browser settings." : "Notifications were not enabled.");
        setPushBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.register("/vf-push-sw.js", { scope: "/" });
      const existingSubscription = await registration.pushManager.getSubscription();
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const response = await fetch("/api/notifications/push-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
      });

      if (!response.ok) throw new Error("Subscription save failed");

      setPushEnabled(true);
      setPushMessage("Device alerts are enabled.");
      new Notification("VF-Next alerts enabled", {
        body: "You will receive notifications even when the app is in the background.",
        icon: "/icon-192.png",
        badge: "/favicon-32x32.png",
        tag: "vf-next-alerts-enabled",
      });
    } catch {
      setPushMessage("Could not enable push notifications on this device.");
    } finally {
      setPushBusy(false);
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

          {(!pushEnabled || systemPermission !== "granted") && (
            <div className="notification-permission-card">
              <div>
                <strong>Enable phone alerts</strong>
                <span>Allow VF-Next to send lock-screen notifications and play the alert sound.</span>
                {pushMessage && <em>{pushMessage}</em>}
              </div>
              <button className="notification-system-btn" type="button" onClick={enableSystemAlerts} disabled={pushBusy}>
                {pushBusy ? <Loader2 size={15} className="notification-spin" /> : <Volume2 size={15} />}
                {pushBusy ? "Enabling..." : "Allow"}
              </button>
            </div>
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

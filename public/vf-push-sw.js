self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: "VF-Next notification",
      body: event.data ? event.data.text() : "You have a new notification.",
    };
  }

  const title = payload.title || "VF-Next notification";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: "/icon-192.png",
    badge: "/favicon-32x32.png",
    tag: payload.id || `vf-next-${Date.now()}`,
    data: {
      url: payload.link || "/",
      id: payload.id || null,
    },
    vibrate: [90, 40, 90],
    requireInteraction: payload.priority === "CRITICAL",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil((async () => {
    const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windowClients) {
      if ("focus" in client) {
        await client.navigate(targetUrl);
        return client.focus();
      }
    }
    return clients.openWindow(targetUrl);
  })());
});

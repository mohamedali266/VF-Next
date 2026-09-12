import { prisma } from "@/lib/db";
import type { Notification, NotificationTargetType, Role } from "@prisma/client";
import webpush, { WebPushError } from "web-push";

type PushPayload = {
  id: string;
  title: string;
  body: string;
  priority: string;
  link: string | null;
  createdAt: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@vodafone.com.eg";

  if (!publicKey || !privateKey) return null;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

export function getVapidPublicKey() {
  return process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
}

export function isWebPushConfigured() {
  return Boolean(getVapidConfig());
}

export async function findNotificationRecipientIds(target: {
  targetType: NotificationTargetType;
  targetRole: Role | null;
  recipientId: string | null;
  branchId: string | null;
  areaId: string | null;
}) {
  const baseWhere = { isActive: true };

  if (target.targetType === "USER" && target.recipientId) {
    return [target.recipientId];
  }

  if (target.targetType === "ROLE" && target.targetRole) {
    const users = await prisma.user.findMany({
      where: { ...baseWhere, role: target.targetRole },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (target.targetType === "BRANCH" && target.branchId) {
    const users = await prisma.user.findMany({
      where: { ...baseWhere, branchId: target.branchId },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (target.targetType === "AREA" && target.areaId) {
    const users = await prisma.user.findMany({
      where: {
        ...baseWhere,
        OR: [
          { areaId: target.areaId },
          { branch: { areaId: target.areaId } },
        ],
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  const users = await prisma.user.findMany({
    where: baseWhere,
    select: { id: true },
  });
  return users.map((user) => user.id);
}

function buildPayload(notification: Notification): PushPayload {
  return {
    id: notification.id,
    title: notification.title,
    body: notification.body,
    priority: notification.priority,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  };
}

export async function sendNotificationPush(notification: Notification, userIds: string[]) {
  if (!getVapidConfig() || userIds.length === 0) {
    return { sent: 0, failed: 0, skipped: true };
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) {
    return { sent: 0, failed: 0, skipped: false };
  }

  const payload = JSON.stringify(buildPayload(notification));
  let sent = 0;
  let failed = 0;
  const staleIds: string[] = [];

  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.p256dh,
          auth: subscription.auth,
        },
      }, payload);
      sent += 1;
    } catch (error) {
      failed += 1;
      const statusCode = error instanceof WebPushError ? error.statusCode : 0;
      if (statusCode === 404 || statusCode === 410) staleIds.push(subscription.id);
    }
  }));

  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } });
  }

  return { sent, failed, skipped: false };
}

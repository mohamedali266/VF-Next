import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationUserScope, visibleNotificationWhere } from "@/lib/notifications";
import { findNotificationRecipientIds, sendNotificationPush } from "@/lib/web-push";
import type { Notification, NotificationPriority } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const smartTargetTypes = [
  "SMART_MISSING_HEALTH_TODAY",
  "SMART_MISSING_REPORT_TODAY",
  "SMART_PENDING_TASKS_TODAY",
  "SMART_MANAGERS_TEAM_LEADERS",
  "SMART_EMPLOYEES_WITHOUT_PUSH",
] as const;

type SmartTargetType = (typeof smartTargetTypes)[number];

const notificationSchema = z.object({
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(700),
  priority: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]).default("INFO"),
  targetType: z.enum(["ALL", "ROLE", "USER", "BRANCH", "AREA", ...smartTargetTypes]).default("ALL"),
  targetRole: z.enum(["EMPLOYEE", "TEAM_LEADER", "MANAGER", "AREA_MANAGER", "ADMIN"]).optional().nullable(),
  targetId: z.string().trim().optional().nullable(),
  link: z.string().trim().max(240).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

function isSmartTarget(targetType: string): targetType is SmartTargetType {
  return smartTargetTypes.includes(targetType as SmartTargetType);
}

function cairoDateOnly() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${values.year}-${values.month}-${values.day}T00:00:00.000Z`);
}

async function resolveSmartRecipientIds(targetType: SmartTargetType) {
  const today = cairoDateOnly();
  const baseUserWhere = { isActive: true };

  if (targetType === "SMART_MISSING_HEALTH_TODAY") {
    const users = await prisma.user.findMany({
      where: {
        ...baseUserWhere,
        role: "EMPLOYEE",
        branchId: { not: null },
        healthChecks: { none: { date: today } },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (targetType === "SMART_MISSING_REPORT_TODAY") {
    const users = await prisma.user.findMany({
      where: {
        ...baseUserWhere,
        role: "EMPLOYEE",
        branchId: { not: null },
        dailyReports: { none: { date: today } },
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (targetType === "SMART_PENDING_TASKS_TODAY") {
    const users = await prisma.user.findMany({
      where: {
        ...baseUserWhere,
        OR: [
          {
            assignedTaskItems: {
              some: {
                status: "PENDING",
                sheet: { date: today, status: "SUBMITTED" },
              },
            },
          },
          {
            role: "EMPLOYEE",
            branch: {
              dailyTaskSheets: {
                some: {
                  date: today,
                  status: "SUBMITTED",
                  items: { some: { assignedToAllShift: true, status: "PENDING" } },
                },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  if (targetType === "SMART_MANAGERS_TEAM_LEADERS") {
    const users = await prisma.user.findMany({
      where: { ...baseUserWhere, role: { in: ["MANAGER", "TEAM_LEADER"] } },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  const users = await prisma.user.findMany({
    where: { ...baseUserWhere, pushSubscriptions: { none: {} } },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

function aggregatePushResults(results: Awaited<ReturnType<typeof sendNotificationPush>>[]) {
  return results.reduce(
    (total, result) => ({
      sent: total.sent + result.sent,
      failed: total.failed + result.failed,
      skipped: total.skipped && result.skipped,
    }),
    { sent: 0, failed: 0, skipped: results.length === 0 },
  );
}

async function createDirectNotifications({
  recipientIds,
  title,
  body,
  priority,
  link,
  expiresAt,
  createdById,
}: {
  recipientIds: string[];
  title: string;
  body: string;
  priority: NotificationPriority;
  link: string | null;
  expiresAt: Date | null;
  createdById: string;
}) {
  return prisma.$transaction(
    recipientIds.map((recipientId) => prisma.notification.create({
      data: {
        title,
        body,
        priority,
        targetType: "USER",
        recipientId,
        link,
        expiresAt,
        createdById,
      },
    })),
  );
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getNotificationUserScope(session.user.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = visibleNotificationWhere(user);
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        reads: {
          where: { userId: user.id },
          select: { readAt: true },
        },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.notification.count({
      where: {
        ...where,
        reads: { none: { userId: user.id } },
      },
    }),
  ]);

  return NextResponse.json({
    unreadCount,
    notifications: notifications.map((notification) => ({
      id: notification.id,
      title: notification.title,
      body: notification.body,
      priority: notification.priority,
      targetType: notification.targetType,
      link: notification.link,
      createdAt: notification.createdAt,
      createdBy: notification.createdBy?.name ?? "System",
      readAt: notification.reads[0]?.readAt ?? null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Only Admin can send notifications" }, { status: 403 });
  }

  const parsed = notificationSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid notification data" }, { status: 400 });
  }

  const data = parsed.data;
  const targetId = data.targetId?.trim() || null;
  const link = data.link?.trim() || null;

  if (data.targetType === "ROLE" && !data.targetRole) {
    return NextResponse.json({ error: "Role target is required" }, { status: 400 });
  }

  if (!isSmartTarget(data.targetType) && ["USER", "BRANCH", "AREA"].includes(data.targetType) && !targetId) {
    return NextResponse.json({ error: "Target is required" }, { status: 400 });
  }

  if (isSmartTarget(data.targetType)) {
    const recipientIds = await resolveSmartRecipientIds(data.targetType);
    if (recipientIds.length === 0) {
      return NextResponse.json({ error: "No users matched this smart target." }, { status: 404 });
    }

    const notifications = await createDirectNotifications({
      recipientIds,
      title: data.title,
      body: data.body,
      priority: data.priority,
      link: link || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById: session.user.id,
    });
    const pushResults = await Promise.all(
      notifications.map((notification: Notification) => sendNotificationPush(notification, [notification.recipientId!]))
    );

    return NextResponse.json({
      notification: notifications[0],
      notificationsCreated: notifications.length,
      smartTarget: data.targetType,
      push: aggregatePushResults(pushResults),
    }, { status: 201 });
  }

  if (data.targetType === "USER") {
    const user = await prisma.user.findFirst({ where: { id: targetId!, isActive: true }, select: { id: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (data.targetType === "BRANCH") {
    const branch = await prisma.branch.findFirst({ where: { id: targetId!, isActive: true }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  if (data.targetType === "AREA") {
    const area = await prisma.area.findFirst({ where: { id: targetId!, isActive: true }, select: { id: true } });
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 });
  }

  const notification = await prisma.notification.create({
    data: {
      title: data.title,
      body: data.body,
      priority: data.priority,
      targetType: data.targetType,
      targetRole: data.targetType === "ROLE" ? data.targetRole : null,
      recipientId: data.targetType === "USER" ? targetId : null,
      branchId: data.targetType === "BRANCH" ? targetId : null,
      areaId: data.targetType === "AREA" ? targetId : null,
      link: link || null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById: session.user.id,
    },
  });

  const recipientIds = await findNotificationRecipientIds(notification);
  const push = await sendNotificationPush(notification, recipientIds);

  return NextResponse.json({ notification, push }, { status: 201 });
}

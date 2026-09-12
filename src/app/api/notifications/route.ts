import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationUserScope, visibleNotificationWhere } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const notificationSchema = z.object({
  title: z.string().trim().min(2).max(90),
  body: z.string().trim().min(2).max(700),
  priority: z.enum(["INFO", "SUCCESS", "WARNING", "CRITICAL"]).default("INFO"),
  targetType: z.enum(["ALL", "ROLE", "USER", "BRANCH", "AREA"]).default("ALL"),
  targetRole: z.enum(["EMPLOYEE", "TEAM_LEADER", "MANAGER", "AREA_MANAGER", "ADMIN"]).optional().nullable(),
  targetId: z.string().trim().optional().nullable(),
  link: z.string().trim().max(240).optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

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

  if (["USER", "BRANCH", "AREA"].includes(data.targetType) && !targetId) {
    return NextResponse.json({ error: "Target is required" }, { status: 400 });
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

  return NextResponse.json({ notification }, { status: 201 });
}

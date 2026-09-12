import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationUserScope, visibleNotificationWhere } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getNotificationUserScope(session.user.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const notification = await prisma.notification.findFirst({
    where: {
      id,
      ...visibleNotificationWhere(user),
    },
    select: { id: true },
  });

  if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 });

  await prisma.notificationRead.upsert({
    where: { notificationId_userId: { notificationId: id, userId: user.id } },
    update: { readAt: new Date() },
    create: { notificationId: id, userId: user.id },
  });

  return NextResponse.json({ ok: true });
}

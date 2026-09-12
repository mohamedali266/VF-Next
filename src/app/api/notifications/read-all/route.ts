import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getNotificationUserScope, visibleNotificationWhere } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await getNotificationUserScope(session.user.id);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unread = await prisma.notification.findMany({
    where: {
      ...visibleNotificationWhere(user),
      reads: { none: { userId: user.id } },
    },
    select: { id: true },
    take: 100,
  });

  if (unread.length) {
    await prisma.notificationRead.createMany({
      data: unread.map((notification) => ({
        notificationId: notification.id,
        userId: user.id,
      })),
      skipDuplicates: true,
    });
  }

  return NextResponse.json({ ok: true, marked: unread.length });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import NotificationsAdminClient from "./NotificationsAdminClient";

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [users, branches, areas, notifications] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, username: true, role: true, branch: { select: { name: true } }, area: { select: { name: true } } },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, area: { select: { name: true } } },
    }),
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.notification.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        title: true,
        body: true,
        priority: true,
        targetType: true,
        targetRole: true,
        createdAt: true,
        recipient: { select: { name: true } },
        branch: { select: { name: true } },
        area: { select: { name: true } },
      },
    }),
  ]);

  return (
    <NotificationsAdminClient
      users={users}
      branches={branches}
      areas={areas}
      notifications={notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      }))}
    />
  );
}

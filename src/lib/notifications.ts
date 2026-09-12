import { prisma } from "@/lib/db";
import type { Prisma, Role } from "@prisma/client";

export type NotificationUserScope = {
  id: string;
  role: Role;
  branchId: string | null;
  areaId: string | null;
  branch?: { areaId: string | null } | null;
};

export async function getNotificationUserScope(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      role: true,
      branchId: true,
      areaId: true,
      branch: { select: { areaId: true } },
    },
  });
}

export function getResolvedAreaId(user: NotificationUserScope) {
  return user.areaId ?? user.branch?.areaId ?? null;
}

export function visibleNotificationWhere(user: NotificationUserScope): Prisma.NotificationWhereInput {
  const areaId = getResolvedAreaId(user);

  const targetRules: Prisma.NotificationWhereInput[] = [
    { targetType: "ALL" },
    { targetType: "ROLE", targetRole: user.role },
    { targetType: "USER", recipientId: user.id },
  ];

  if (user.branchId) {
    targetRules.push({ targetType: "BRANCH", branchId: user.branchId });
  }

  if (areaId) {
    targetRules.push({ targetType: "AREA", areaId });
  }

  return {
    AND: [
      {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      { OR: targetRules },
    ],
  };
}

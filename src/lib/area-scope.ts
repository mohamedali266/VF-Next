import type { Prisma } from "@prisma/client";

export const AREA_MANAGER_ALLOWED_ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] as const;

export function areaMembershipUserWhere(areaId: string): Prisma.UserWhereInput {
  return {
    OR: [
      { areaId },
      { branch: { areaId } },
    ],
  };
}

export function areaManagedUserWhere(areaId: string, activeOnly = false): Prisma.UserWhereInput {
  return {
    ...(activeOnly ? { isActive: true } : {}),
    role: { in: [...AREA_MANAGER_ALLOWED_ROLES] },
    ...areaMembershipUserWhere(areaId),
  };
}

export function isAreaManagedRole(role: string) {
  return AREA_MANAGER_ALLOWED_ROLES.includes(role as (typeof AREA_MANAGER_ALLOWED_ROLES)[number]);
}

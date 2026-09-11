import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import UsersClient from "@/app/admin/users/UsersClient";

export default async function AreaUsersPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/unauthorized");
  if (!session.user.areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const areaWhere = session.user.role === "ADMIN" ? {} : { id: session.user.areaId || "" };
  const userWhere: Prisma.UserWhereInput = session.user.role === "ADMIN"
    ? { isActive: true }
    : {
        isActive: true,
        areaId: session.user.areaId || "",
        role: { in: ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] },
      };

  const [users, branches, areas] = await Promise.all([
    prisma.user.findMany({
      where: userWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        vpnNum: true,
        staffId: true,
        role: true,
        department: true,
        branchId: true,
        areaId: true,
        isActive: true,
        isMaster: true,
        createdAt: true,
        branch: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true, ...(session.user.role === "ADMIN" ? {} : { areaId: session.user.areaId || "" }) },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, areaId: true },
    }),
    prisma.area.findMany({
      where: areaWhere,
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <UsersClient
      users={users}
      branches={branches}
      areas={areas}
      currentRole={session.user.role}
      currentAreaId={session.user.areaId || null}
    />
  );
}

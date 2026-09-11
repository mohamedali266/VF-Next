import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import UsersClient from "./UsersClient";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [users, branches, areas] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        vpnNum: true,
        staffId: true,
        role: true,
        branchId: true,
        areaId: true,
        branch: { select: { id: true, name: true, code: true } },
        area: { select: { id: true, name: true, code: true } },
        isMaster: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, areaId: true },
    }),
    prisma.area.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return <UsersClient users={users} branches={branches} areas={areas} currentRole={session.user.role} currentAreaId={session.user.areaId || null} />;
}

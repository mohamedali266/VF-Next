import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import AreasClient from "./AreasClient";

export default async function AdminAreasPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [areas, branches] = await Promise.all([
    prisma.area.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
        branches: { orderBy: { name: "asc" }, select: { id: true, name: true, code: true, areaId: true } },
        users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, areaId: true },
    }),
  ]);

  return <AreasClient areas={areas} branches={branches} />;
}

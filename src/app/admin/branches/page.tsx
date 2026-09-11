import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import BranchesClient from "./BranchesClient";

export default async function AdminBranchesPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const branches = await prisma.branch.findMany({
    orderBy: { name: "asc" },
    include: {
      users: {
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
      area: { select: { id: true, name: true, code: true } },
    },
  });
  const areas = await prisma.area.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return <BranchesClient branches={branches} areas={areas} />;
}

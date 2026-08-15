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
    },
  });

  return <BranchesClient branches={branches} />;
}

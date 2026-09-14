import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TaskSheetClient from "@/components/tasks/TaskSheetClient";
import { redirect } from "next/navigation";

export default async function AdminTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/unauthorized");

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return <TaskSheetClient branches={branches} defaultBranchId={branches[0]?.id || ""} currentRole="ADMIN" />;
}

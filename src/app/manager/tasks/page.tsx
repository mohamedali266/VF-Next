import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TaskSheetClient from "@/components/tasks/TaskSheetClient";
import { redirect } from "next/navigation";

export default async function ManagerTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "MANAGER" && session.user.role !== "TEAM_LEADER") redirect("/employee");
  if (!session.user.branchId) redirect("/manager");

  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { id: true, name: true, code: true },
  });

  if (!branch) redirect("/manager");

  return <TaskSheetClient branches={[branch]} defaultBranchId={branch.id} currentRole={session.user.role} />;
}

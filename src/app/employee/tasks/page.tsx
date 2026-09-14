import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TaskSheetClient from "@/components/tasks/TaskSheetClient";
import { redirect } from "next/navigation";

export default async function EmployeeTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (!session.user.branchId) redirect("/employee");

  const branch = await prisma.branch.findUnique({
    where: { id: session.user.branchId },
    select: { id: true, name: true, code: true },
  });

  if (!branch) redirect("/employee");

  return <TaskSheetClient branches={[branch]} defaultBranchId={branch.id} currentRole={session.user.role} />;
}

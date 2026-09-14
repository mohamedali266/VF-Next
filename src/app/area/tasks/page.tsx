import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TaskSheetClient from "@/components/tasks/TaskSheetClient";
import { redirect } from "next/navigation";

export default async function AreaTasksPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/unauthorized");
  if (!session.user.areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ...(session.user.role === "AREA_MANAGER" ? { areaId: session.user.areaId || "" } : {}),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true },
  });

  return <TaskSheetClient branches={branches} defaultBranchId={branches[0]?.id || ""} currentRole={session.user.role} />;
}

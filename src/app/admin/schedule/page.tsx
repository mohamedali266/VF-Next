import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ShiftScheduleClient from "@/components/schedule/ShiftScheduleClient";

export default async function AdminSchedulePage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, terminalCount: true },
  });

  return (
    <ShiftScheduleClient
      title="Monthly Shift Schedule"
      description="Create, validate, submit, and print monthly schedules for each store."
      branches={branches}
      defaultBranchId={branches[0]?.id || null}
      canEdit
      isAdmin
    />
  );
}

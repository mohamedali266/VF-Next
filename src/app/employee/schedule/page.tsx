import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ShiftScheduleClient from "@/components/schedule/ShiftScheduleClient";

export default async function EmployeeSchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "EMPLOYEE") redirect("/unauthorized");

  const branch = session.user.branchId
    ? await prisma.branch.findUnique({
        where: { id: session.user.branchId },
        select: { id: true, name: true, code: true, terminalCount: true },
      })
    : null;

  return (
    <ShiftScheduleClient
      title="My Shift Schedule"
      description="View your store monthly schedule."
      branches={branch ? [branch] : []}
      defaultBranchId={branch?.id || null}
      canEdit={false}
      viewerEmployeeId={session.user.id}
    />
  );
}

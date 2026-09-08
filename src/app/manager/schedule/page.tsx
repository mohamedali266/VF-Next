import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ShiftScheduleClient from "@/components/schedule/ShiftScheduleClient";

export default async function ManagerSchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user;
  if (user.role !== "MANAGER" && user.role !== "TEAM_LEADER" && user.role !== "ADMIN") redirect("/unauthorized");

  const branch = user.branchId
    ? await prisma.branch.findUnique({
        where: { id: user.branchId },
        select: { id: true, name: true, code: true, terminalCount: true },
      })
    : null;

  return (
    <ShiftScheduleClient
      title="Monthly Shift Schedule"
      description="Build and approve your store monthly shifts."
      branches={branch ? [branch] : []}
      defaultBranchId={branch?.id || null}
      canEdit
    />
  );
}

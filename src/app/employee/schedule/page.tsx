import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ShiftScheduleClient from "@/components/schedule/ShiftScheduleClient";

function getNextMonthKey() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}`;
}

export default async function EmployeeSchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "EMPLOYEE") redirect("/unauthorized");

  const [branch, currentUser] = await Promise.all([
    session.user.branchId
      ? prisma.branch.findUnique({
        where: { id: session.user.branchId },
        select: { id: true, name: true, code: true, terminalCount: true },
      })
      : null,
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isMaster: true },
    }),
  ]);

  const nextMonth = getNextMonthKey();
  const isMasterEmployee = Boolean(currentUser?.isMaster);

  return (
    <ShiftScheduleClient
      title={isMasterEmployee ? "Next Month Shift Schedule" : "My Shift Schedule"}
      description={isMasterEmployee ? "Prepare next month schedule. Submitted schedules can only be reopened by management." : "View your store monthly schedule."}
      branches={branch ? [branch] : []}
      defaultBranchId={branch?.id || null}
      canEdit={isMasterEmployee}
      canReopenSubmitted={false}
      editableMonth={isMasterEmployee ? nextMonth : null}
      viewerEmployeeId={session.user.id}
    />
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import ShiftScheduleClient from "@/components/schedule/ShiftScheduleClient";

export default async function AreaSchedulePage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/unauthorized");
  if (!session.user.areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ...(session.user.role === "ADMIN" ? {} : { areaId: session.user.areaId || "" }),
    },
    orderBy: { name: "asc" },
    select: { id: true, name: true, code: true, terminalCount: true },
  });

  return (
    <ShiftScheduleClient
      title="Area Shift Review"
      description="Review submitted monthly schedules for stores in your area."
      branches={branches}
      defaultBranchId={branches[0]?.id || null}
      canEdit={false}
      canApprove={session.user.role === "AREA_MANAGER" || session.user.role === "ADMIN"}
      isAdmin
    />
  );
}

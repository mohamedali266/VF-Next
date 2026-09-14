import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canManageBranchTasks } from "@/lib/tasks";
import { NextResponse } from "next/server";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const group = await prisma.taskGroup.findUnique({
    where: { id },
    select: { id: true, scope: true, branchId: true, areaId: true, createdById: true },
  });

  if (!group) return NextResponse.json({ error: "Task group not found" }, { status: 404 });

  const allowed =
    session.user.role === "ADMIN" ||
    (group.scope === "AREA" && session.user.role === "AREA_MANAGER" && group.areaId === session.user.areaId) ||
    (group.scope === "BRANCH" && canManageBranchTasks(session.user.role) && group.branchId === session.user.branchId);

  if (!allowed) return NextResponse.json({ error: "You do not have permission to delete this task group" }, { status: 403 });

  await prisma.taskGroup.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

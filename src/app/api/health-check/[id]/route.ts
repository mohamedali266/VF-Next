import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback;
}

// PUT: Manager/TL edits a record — branch-ownership enforced
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user;
  if (user.role !== "MANAGER" && user.role !== "TEAM_LEADER" && user.role !== "ADMIN") {
    return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
  }

  const body = await req.json() as Record<string, unknown>;
  const { reason, ...lineValues } = body;

  if (typeof reason !== "string" || reason.trim().length < 3) {
    return NextResponse.json({ error: "يجب إدخال سبب التعديل" }, { status: 400 });
  }

  const { id } = await params;

  // Fetch the record + employee branchId for ownership check
  const existing = await prisma.healthCheck.findUnique({
    where: { id },
    include: { employee: { select: { branchId: true } } },
  });
  if (!existing) return NextResponse.json({ error: "السجل غير موجود" }, { status: 404 });

  // MANAGER/TEAM_LEADER: must belong to their branch
  if (user.role === "MANAGER" || user.role === "TEAM_LEADER") {
    const userBranchId = user.branchId;
    const recordBranchId = existing.employee?.branchId;

    if (!userBranchId || userBranchId !== recordBranchId) {
      return NextResponse.json({ error: "لا يمكنك تعديل سجلات فرع آخر" }, { status: 403 });
    }
  }

  const updated = await prisma.healthCheck.update({
    where: { id },
    data: {
      line1Nid:  asNumber(lineValues.line1Nid,  existing.line1Nid),
      line2Nid:  asNumber(lineValues.line2Nid,  existing.line2Nid),
      line3Nid:  asNumber(lineValues.line3Nid,  existing.line3Nid),
      line4Nid:  asNumber(lineValues.line4Nid,  existing.line4Nid),
      line5Nid:  asNumber(lineValues.line5Nid,  existing.line5Nid),
      line6Nid:  asNumber(lineValues.line6Nid,  existing.line6Nid),
      line7Nid:  asNumber(lineValues.line7Nid,  existing.line7Nid),
      line8Nid:  asNumber(lineValues.line8Nid,  existing.line8Nid),
      line9Nid:  asNumber(lineValues.line9Nid,  existing.line9Nid),
      line10Nid: asNumber(lineValues.line10Nid, existing.line10Nid),
    },
  });

  await prisma.editLog.create({
    data: {
      healthCheckId: id,
      editedById: user.id,
      oldValues: existing as unknown as Prisma.InputJsonValue,
      newValues: updated as unknown as Prisma.InputJsonValue,
      reason: reason.trim(),
    },
  });

  return NextResponse.json({ record: updated });
}

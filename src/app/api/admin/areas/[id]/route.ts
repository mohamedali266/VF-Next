import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function normalizeCode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed || null;
}

const areaSelect = {
  id: true,
  name: true,
  code: true,
  isActive: true,
  branches: { orderBy: { name: "asc" }, select: { id: true, name: true, code: true, areaId: true } },
  users: { select: { id: true, name: true, email: true, role: true, isActive: true } },
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = normalizeCode(body.code);
  const isActive = body.isActive !== false;
  const branchIds = Array.isArray(body.branchIds) ? body.branchIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];

  if (!name) {
    return NextResponse.json({ error: "Area name is required" }, { status: 400 });
  }

  const area = await prisma.$transaction(async (tx) => {
    const blocked = branchIds.length
      ? await tx.branch.count({
          where: { id: { in: branchIds }, areaId: { not: null }, NOT: { areaId: id } },
        })
      : 0;
    if (blocked) throw new Error("Some stores are already linked to another area");

    await tx.area.update({
      where: { id },
      data: { name, code, isActive },
      select: { id: true },
    });

    await tx.branch.updateMany({
      where: { areaId: id, id: { notIn: branchIds } },
      data: { areaId: null },
    });

    if (branchIds.length) {
      await tx.branch.updateMany({
        where: { id: { in: branchIds }, OR: [{ areaId: null }, { areaId: id }] },
        data: { areaId: id },
      });
    }

    return tx.area.findUniqueOrThrow({ where: { id }, select: areaSelect });
  });

  return NextResponse.json({ area });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [branches, users] = await Promise.all([
    prisma.branch.count({ where: { areaId: id } }),
    prisma.user.count({ where: { areaId: id } }),
  ]);

  if (branches || users) {
    return NextResponse.json({ error: "Cannot delete area with linked stores or users" }, { status: 409 });
  }

  await prisma.area.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

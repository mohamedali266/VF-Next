import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function normalizeCode(value: unknown) {
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim().toUpperCase();
  return trimmed || null;
}

function normalizeTerminalCount(value: unknown) {
  if (value === undefined) return undefined;
  const count = Number(value);
  return count === 2 || count === 3 ? count : null;
}

function normalizeAreaId(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value : null;
}

const branchInclude = {
  users: {
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true },
  },
  area: { select: { id: true, name: true, code: true } },
} satisfies Prisma.BranchInclude;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : undefined;
  const code = normalizeCode(body.code);
  const terminalCount = normalizeTerminalCount(body.terminalCount);
  const areaId = normalizeAreaId(body.areaId);
  const isActive = typeof body.isActive === "boolean" ? body.isActive : undefined;

  if (name !== undefined && !name) {
    return NextResponse.json({ error: "Store name is required" }, { status: 400 });
  }
  if (terminalCount === null) {
    return NextResponse.json({ error: "Store terminals must be 2 or 3" }, { status: 400 });
  }

  const store = await prisma.branch.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(terminalCount !== undefined ? { terminalCount } : {}),
      ...(areaId !== undefined ? { areaId } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: branchInclude,
  });

  return NextResponse.json({ branch: store });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const [users, reports] = await Promise.all([
    prisma.user.count({ where: { branchId: id } }),
    prisma.dailyReport.count({ where: { branchId: id } }),
  ]);

  if (users || reports) {
    return NextResponse.json({ error: "Cannot delete store with assigned users or reports" }, { status: 409 });
  }

  await prisma.branch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

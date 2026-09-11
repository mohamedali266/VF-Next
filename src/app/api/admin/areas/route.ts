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

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const areas = await prisma.area.findMany({
    orderBy: { name: "asc" },
    select: areaSelect,
  });

  return NextResponse.json({ areas });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = normalizeCode(body.code);
  const isActive = body.isActive !== false;
  const branchIds = Array.isArray(body.branchIds) ? body.branchIds.filter((value: unknown): value is string => typeof value === "string" && value.trim().length > 0) : [];

  if (!name) {
    return NextResponse.json({ error: "Area name is required" }, { status: 400 });
  }

  const area = await prisma.$transaction(async (tx) => {
    const created = await tx.area.create({
      data: { name, code, isActive },
      select: { id: true },
    });

    if (branchIds.length) {
      const blocked = await tx.branch.count({
        where: { id: { in: branchIds }, areaId: { not: null } },
      });
      if (blocked) throw new Error("Some stores are already linked to another area");

      await tx.branch.updateMany({
        where: { id: { in: branchIds }, areaId: null },
        data: { areaId: created.id },
      });
    }

    return tx.area.findUniqueOrThrow({ where: { id: created.id }, select: areaSelect });
  });

  return NextResponse.json({ area }, { status: 201 });
}

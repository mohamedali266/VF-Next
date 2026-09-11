import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function normalizeCode(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return trimmed || null;
}

function normalizeTerminalCount(value: unknown) {
  const count = Number(value);
  return count === 2 || count === 3 ? count : null;
}

function normalizeAreaId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const branches = await prisma.branch.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      users: {
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
      area: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json({ branches });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const code = normalizeCode(body.code);
  const terminalCount = normalizeTerminalCount(body.terminalCount);
  const areaId = normalizeAreaId(body.areaId);

  if (!name) {
    return NextResponse.json({ error: "Store name is required" }, { status: 400 });
  }
  if (!terminalCount) {
    return NextResponse.json({ error: "Store terminals must be 2 or 3" }, { status: 400 });
  }

  const branch = await prisma.branch.create({
    data: { name, code, terminalCount, areaId },
    include: {
      users: {
        select: { id: true, name: true, email: true, role: true, isActive: true },
      },
      area: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json({ branch }, { status: 201 });
}

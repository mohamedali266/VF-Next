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
  branches: { select: { id: true, name: true, code: true } },
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

  if (!name) {
    return NextResponse.json({ error: "Area name is required" }, { status: 400 });
  }

  const area = await prisma.area.create({
    data: { name, code, isActive },
    select: areaSelect,
  });

  return NextResponse.json({ area }, { status: 201 });
}

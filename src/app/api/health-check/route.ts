import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

function isShift(value: string | null): value is "AM" | "PM" | "BW" {
  return value === "AM" || value === "PM" || value === "BW";
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

// GET: fetch today's health check for current user or all (manager)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user;
  const { searchParams } = new URL(req.url);
  const shift = searchParams.get("shift");
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const targetDate = new Date(date);

  // Manager/Admin: get all records for a date
  if (user.role === "MANAGER" || user.role === "TEAM_LEADER" || user.role === "ADMIN") {
    const records = await prisma.healthCheck.findMany({
      where: {
        date: targetDate,
        ...(isShift(shift) ? { shift } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, department: true } },
      },
      orderBy: [{ shift: "asc" }, { submittedAt: "asc" }],
    });
    return NextResponse.json({ records });
  }

  // Employee: get own record
  const record = await prisma.healthCheck.findFirst({
    where: {
      employeeId: user.id,
      date: targetDate,
      ...(isShift(shift) ? { shift } : {}),
    },
  });

  return NextResponse.json({ record });
}

// POST: submit health check (employee)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user;
  const body = await req.json() as Record<string, unknown>;

  const { shift, line1Nid, line2Nid, line3Nid, line4Nid, line5Nid,
          line6Nid, line7Nid, line8Nid, line9Nid, line10Nid } = body;

  const submittedShift = typeof shift === "string" && isShift(shift) ? shift : null;

  if (!submittedShift) {
    return NextResponse.json({ error: "شيفت غير صحيح" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check for duplicate
  const existing = await prisma.healthCheck.findFirst({
    where: { employeeId: user.id, date: today, shift: submittedShift },
  });

  if (existing) {
    return NextResponse.json({ error: "تم الإرسال مسبقاً لهذا الشيفت" }, { status: 409 });
  }

  const record = await prisma.healthCheck.create({
    data: {
      employeeId: user.id,
      shift: submittedShift,
      date: today,
      line1Nid: asNumber(line1Nid),
      line2Nid: asNumber(line2Nid),
      line3Nid: asNumber(line3Nid),
      line4Nid: asNumber(line4Nid),
      line5Nid: asNumber(line5Nid),
      line6Nid: asNumber(line6Nid),
      line7Nid: asNumber(line7Nid),
      line8Nid: asNumber(line8Nid),
      line9Nid: asNumber(line9Nid),
      line10Nid: asNumber(line10Nid),
      isLocked: true,
    },
  });

  return NextResponse.json({ record }, { status: 201 });
}

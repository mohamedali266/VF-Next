import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  getMonthDays,
  monthStartFromInput,
  SCHEDULE_SHIFTS,
  sortScheduleMembers,
  validateScheduleDays,
  type ScheduleEntryInput,
  type ScheduleShiftValue,
} from "@/lib/shift-schedule";
import { ScheduleShift } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const writeRoles = new Set(["ADMIN", "MANAGER", "TEAM_LEADER"]);

const entrySchema = z.object({
  employeeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum(SCHEDULE_SHIFTS as [ScheduleShiftValue, ...ScheduleShiftValue[]]),
});

const saveSchema = z.object({
  branchId: z.string().optional().nullable(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  action: z.enum(["save", "submit", "edit"]),
  entries: z.array(entrySchema).default([]),
});

async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, branchId: true },
  });
}

function canWrite(role: string) {
  return writeRoles.has(role);
}

function requestedBranchId(req: NextRequest, user: { role: string; branchId: string | null }) {
  const queryBranchId = req.nextUrl.searchParams.get("branchId");
  if (user.role === "ADMIN") return queryBranchId || null;
  return user.branchId;
}

function serializeEntry(entry: { employeeId: string; date: Date; shift: ScheduleShift }) {
  return {
    employeeId: entry.employeeId,
    date: entry.date.toISOString().slice(0, 10),
    shift: entry.shift,
  };
}

async function getSchedulePayload(branchId: string, month: string, options?: { submittedOnly?: boolean }) {
  const monthStart = monthStartFromInput(month);
  if (!monthStart) {
    return { error: NextResponse.json({ error: "Invalid month" }, { status: 400 }) };
  }

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      name: true,
      code: true,
      terminalCount: true,
      users: {
        where: {
          isActive: true,
          role: { in: ["MANAGER", "TEAM_LEADER", "EMPLOYEE"] },
        },
        select: { id: true, name: true, role: true, isMaster: true, isActive: true },
      },
      shiftSchedules: {
        where: {
          month: monthStart,
          ...(options?.submittedOnly ? { status: "SUBMITTED" as const } : {}),
        },
        take: 1,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          updatedAt: true,
          entries: {
            select: { employeeId: true, date: true, shift: true },
          },
        },
      },
    },
  });

  if (!branch) {
    return { error: NextResponse.json({ error: "Store not found" }, { status: 404 }) };
  }

  const members = sortScheduleMembers(branch.users);
  const schedule = branch.shiftSchedules[0] || null;
  const days = getMonthDays(month);
  const entries = schedule?.entries.map(serializeEntry) || [];
  const validations = validateScheduleDays(days, members, entries, branch.terminalCount);

  return {
    payload: {
      branch: {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        terminalCount: branch.terminalCount,
      },
      month,
      days,
      members,
      schedule: schedule ? {
        id: schedule.id,
        status: schedule.status,
        submittedAt: schedule.submittedAt,
        updatedAt: schedule.updatedAt,
      } : null,
      entries,
      validations,
    },
  };
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const month = req.nextUrl.searchParams.get("month") || "";
  const branchId = requestedBranchId(req, user);
  if (!branchId) {
    return NextResponse.json({ error: "No store selected" }, { status: 400 });
  }

  const result = await getSchedulePayload(branchId, month, { submittedOnly: user.role === "EMPLOYEE" });
  if (result.error) return result.error;
  return NextResponse.json(result.payload);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canWrite(user.role)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = saveSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات الجدول" }, { status: 400 });
  }

  const { action, month, entries } = parsed.data;
  const monthStart = monthStartFromInput(month);
  if (!monthStart) return NextResponse.json({ error: "Invalid month" }, { status: 400 });

  const branchId = user.role === "ADMIN" ? parsed.data.branchId : user.branchId;
  if (!branchId) return NextResponse.json({ error: "No store selected" }, { status: 400 });

  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      terminalCount: true,
      users: {
        where: {
          isActive: true,
          role: { in: ["MANAGER", "TEAM_LEADER", "EMPLOYEE"] },
        },
        select: { id: true, name: true, role: true, isMaster: true, isActive: true },
      },
    },
  });

  if (!branch) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const allowedUserIds = new Set(branch.users.map((member) => member.id));
  const days = getMonthDays(month);
  const allowedDates = new Set(days.map((day) => day.date));
  const cleanEntries: ScheduleEntryInput[] = entries.filter((entry) => (
    allowedUserIds.has(entry.employeeId) && allowedDates.has(entry.date)
  ));

  if (action === "submit") {
    const validations = validateScheduleDays(days, branch.users, cleanEntries, branch.terminalCount);
    const invalidDays = validations.filter((day) => !day.valid);
    if (invalidDays.length) {
      return NextResponse.json({
        error: `Cannot submit. ${invalidDays.length} day(s) do not match schedule rules.`,
        invalidDays,
      }, { status: 422 });
    }
  }

  const existing = await prisma.shiftSchedule.findUnique({
    where: { branchId_month: { branchId, month: monthStart } },
    select: { id: true, status: true },
  });

  if (action === "edit") {
    const schedule = await prisma.shiftSchedule.upsert({
      where: { branchId_month: { branchId, month: monthStart } },
      create: {
        branchId,
        month: monthStart,
        status: "DRAFT",
        createdById: user.id,
        updatedById: user.id,
      },
      update: {
        status: "DRAFT",
        submittedAt: null,
        submittedById: null,
        updatedById: user.id,
      },
      select: { id: true },
    });

    const result = await getSchedulePayload(branchId, month);
    if (result.error) return result.error;
    return NextResponse.json({ ...result.payload, schedule: { ...result.payload?.schedule, id: schedule.id } });
  }

  if (existing?.status === "SUBMITTED") {
    return NextResponse.json({ error: "Schedule is submitted. Press Edit first." }, { status: 409 });
  }

  const schedule = await prisma.$transaction(async (tx) => {
    const saved = await tx.shiftSchedule.upsert({
      where: { branchId_month: { branchId, month: monthStart } },
      create: {
        branchId,
        month: monthStart,
        status: action === "submit" ? "SUBMITTED" : "DRAFT",
        submittedAt: action === "submit" ? new Date() : null,
        submittedById: action === "submit" ? user.id : null,
        createdById: user.id,
        updatedById: user.id,
      },
      update: {
        status: action === "submit" ? "SUBMITTED" : "DRAFT",
        submittedAt: action === "submit" ? new Date() : null,
        submittedById: action === "submit" ? user.id : null,
        updatedById: user.id,
      },
      select: { id: true },
    });

    await tx.shiftScheduleEntry.deleteMany({ where: { scheduleId: saved.id } });
    if (cleanEntries.length) {
      await tx.shiftScheduleEntry.createMany({
        data: cleanEntries.map((entry) => ({
          scheduleId: saved.id,
          employeeId: entry.employeeId,
          date: new Date(`${entry.date}T00:00:00.000Z`),
          shift: entry.shift,
        })),
      });
    }

    return saved;
  });

  const result = await getSchedulePayload(branchId, month);
  if (result.error) return result.error;
  return NextResponse.json({ ...result.payload, schedule: { ...result.payload?.schedule, id: schedule.id } });
}

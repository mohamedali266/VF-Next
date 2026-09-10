import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildSmsHealthBreakdown, calculateAtHomeAch, calculateTotalDailyAch } from "@/lib/daily-report";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  storeName: z.string().trim().min(1).max(100),
  pre: z.coerce.number().int().min(0).default(0),
  f52: z.coerce.number().int().min(0).default(0),
  f80: z.coerce.number().int().min(0).default(0),
  aboveF115: z.coerce.number().int().min(0).default(0),
  newVmt: z.coerce.number().int().min(0).default(0),
  exitVmt: z.coerce.number().int().min(0).default(0),
  newRed: z.coerce.number().int().min(0).default(0),
  conRed: z.coerce.number().int().min(0).default(0),
  mnp: z.coerce.number().int().min(0).default(0),
  atHomeType: z.enum(["FOUR_G", "FIVE_G"]).default("FOUR_G"),
  atHomeCount: z.coerce.number().int().min(0).default(0),
  adslAch: z.coerce.number().int().min(0).default(0),
  terminalAch: z.coerce.number().int().min(0).default(0),
  enterpriseNewAcc: z.coerce.number().int().min(0).default(0),
  enterpriseGas: z.coerce.number().int().min(0).default(0),
});

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function monthRangeFromDate(value: string) {
  const [year, month] = value.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

function toDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

type DailyReportWithRelations = Prisma.DailyReportGetPayload<{
  include: {
    employee: { select: { id: true; name: true; email: true; username: true; vpnNum: true; staffId: true; role: true } };
    branch: { select: { id: true; name: true; code: true } };
  };
}>;

type DailyReportRecord = Prisma.DailyReportGetPayload<Record<string, never>>;

function serializeReport(report: DailyReportRecord | DailyReportWithRelations) {
  return {
    ...report,
    date: toDateInput(report.date),
  };
}

async function getCurrentDbUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      branchId: true,
      branch: { select: { id: true, name: true } },
    },
  });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentDbUser(session.user.id);
  if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);
  const targetDate = dateOnly(date);

  if (currentUser.role === "MANAGER" || currentUser.role === "TEAM_LEADER" || currentUser.role === "ADMIN") {
    // ADMIN: can filter by branchId query param (or see all if not specified)
    // MANAGER/TEAM_LEADER: strictly scoped to their own branch — no branch = no data
    if (currentUser.role === "MANAGER" || currentUser.role === "TEAM_LEADER") {
      if (!currentUser.branchId) {
        return NextResponse.json({ reports: [] });
      }
    }

    const branchId = searchParams.get("branchId") || undefined;
    const scopedBranchId = currentUser.role === "ADMIN" ? branchId : currentUser.branchId ?? undefined;

    const reports = await prisma.dailyReport.findMany({
      where: {
        date: targetDate,
        ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      },
      include: {
        employee: { select: { id: true, name: true, email: true, username: true, vpnNum: true, staffId: true, role: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
      orderBy: [{ branch: { name: "asc" } }, { employee: { name: "asc" } }],
    });

    return NextResponse.json({ reports: reports.map(serializeReport) });
  }

  const monthRange = monthRangeFromDate(date);
  const reports = await prisma.dailyReport.findMany({
    where: {
      employeeId: currentUser.id,
      date: {
        gte: monthRange.start,
        lte: monthRange.end,
      },
    },
    orderBy: { date: "desc" },
  });

  const todayReport = reports.find((report) => toDateInput(report.date) === date);
  const healthChecks = await prisma.healthCheck.findMany({
    where: {
      employeeId: currentUser.id,
      date: targetDate,
    },
    select: {
      shift: true,
      line1Nid: true,
      line2Nid: true,
      line3Nid: true,
    },
    orderBy: [{ shift: "asc" }, { submittedAt: "asc" }],
  });

  return NextResponse.json({
    report: todayReport ? serializeReport(todayReport) : null,
    reports: reports.map(serializeReport),
    storeName: currentUser.branch?.name || "",
    healthSubmitted: healthChecks.length > 0,
    healthBreakdown: buildSmsHealthBreakdown(healthChecks),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const currentUser = await getCurrentDbUser(session.user.id);
  if (!currentUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (currentUser.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "Only employees can submit daily reports" }, { status: 403 });
  }

  const parsed = reportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report data", details: parsed.error.flatten() }, { status: 400 });
  }

  const values = parsed.data;
  const storeName = currentUser.branch?.name || values.storeName;
  const atHomeAch = calculateAtHomeAch(values.atHomeType, values.atHomeCount);
  const totalDailyAch = calculateTotalDailyAch(values);
  const targetDate = dateOnly(values.date);

  const healthCount = await prisma.healthCheck.count({
    where: {
      employeeId: currentUser.id,
      date: targetDate,
    },
  });

  if (healthCount === 0) {
    return NextResponse.json({
      error: "You must submit Health Check first.",
      redirectTo: "/employee/health-check",
    }, { status: 428 });
  }

  const report = await prisma.dailyReport.upsert({
    where: {
      employeeId_date: {
        employeeId: currentUser.id,
        date: targetDate,
      },
    },
    create: {
      employeeId: currentUser.id,
      branchId: currentUser.branchId,
      date: targetDate,
      storeName,
      pre: values.pre,
      f52: values.f52,
      f80: values.f80,
      aboveF115: values.aboveF115,
      newVmt: values.newVmt,
      exitVmt: values.exitVmt,
      newRed: values.newRed,
      conRed: values.conRed,
      mnp: values.mnp,
      atHomeType: values.atHomeType,
      atHomeCount: values.atHomeCount,
      atHomeAch,
      adslAch: values.adslAch,
      terminalAch: values.terminalAch,
      enterpriseNewAcc: values.enterpriseNewAcc,
      enterpriseGas: values.enterpriseGas,
      totalDailyAch,
    },
    update: {
      branchId: currentUser.branchId,
      storeName,
      pre: values.pre,
      f52: values.f52,
      f80: values.f80,
      aboveF115: values.aboveF115,
      newVmt: values.newVmt,
      exitVmt: values.exitVmt,
      newRed: values.newRed,
      conRed: values.conRed,
      mnp: values.mnp,
      atHomeType: values.atHomeType,
      atHomeCount: values.atHomeCount,
      atHomeAch,
      adslAch: values.adslAch,
      terminalAch: values.terminalAch,
      enterpriseNewAcc: values.enterpriseNewAcc,
      enterpriseGas: values.enterpriseGas,
      totalDailyAch,
    },
    include: {
      employee: { select: { id: true, name: true, email: true, username: true, vpnNum: true, staffId: true, role: true } },
      branch: { select: { id: true, name: true, code: true } },
    },
  });

  return NextResponse.json({ report: serializeReport(report) }, { status: 200 });
}

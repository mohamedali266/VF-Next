import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { calculateAtHomeAch, calculateTotalDailyAch } from "@/lib/daily-report";
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
    select: { id: true, role: true, branchId: true },
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
    const branchId = searchParams.get("branchId") || undefined;
    const scopedBranchId = currentUser.role === "ADMIN" ? branchId : currentUser.branchId || undefined;

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

  const reports = await prisma.dailyReport.findMany({
    where: { employeeId: currentUser.id },
    orderBy: { date: "desc" },
    take: 31,
  });

  const todayReport = reports.find((report) => toDateInput(report.date) === date);
  return NextResponse.json({
    report: todayReport ? serializeReport(todayReport) : null,
    reports: reports.map(serializeReport),
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
  const atHomeAch = calculateAtHomeAch(values.atHomeType, values.atHomeCount);
  const totalDailyAch = calculateTotalDailyAch(values);
  const targetDate = dateOnly(values.date);

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
      storeName: values.storeName,
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
      storeName: values.storeName,
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

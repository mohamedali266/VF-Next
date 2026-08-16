import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { buildSmsMessage, emptyDailyReportValues } from "@/lib/daily-report";
import type { DailyReportFormValues } from "@/lib/daily-report";
import { NextRequest, NextResponse } from "next/server";

const LINE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
type LineKey = `line${typeof LINE_NUMS[number]}Nid`;

function lineKey(n: number): LineKey {
  return `line${n}Nid` as LineKey;
}

function aggregateDailyReports(
  reports: Array<Record<string, unknown>>,
  date: string,
  storeName: string
): DailyReportFormValues {
  const sum = (key: keyof DailyReportFormValues) =>
    reports.reduce((s, r) => s + ((r[key as string] as number) || 0), 0);

  return {
    ...emptyDailyReportValues,
    storeName,
    date,
    pre: sum("pre"),
    f52: sum("f52"),
    f80: sum("f80"),
    aboveF115: sum("aboveF115"),
    newVmt: sum("newVmt"),
    exitVmt: sum("exitVmt"),
    newRed: sum("newRed"),
    conRed: sum("conRed"),
    mnp: sum("mnp"),
    atHomeType: "FOUR_G",
    atHomeCount: sum("atHomeCount"),
    atHomeAch: sum("atHomeAch"),
    adslAch: sum("adslAch"),
    terminalAch: sum("terminalAch"),
    enterpriseNewAcc: sum("enterpriseNewAcc"),
    enterpriseGas: sum("enterpriseGas"),
    totalDailyAch: sum("totalDailyAch"),
  };
}

function buildHealthReportText(
  date: string,
  storeName: string,
  records: Array<Record<string, unknown>>
): string {
  const lines = ["Date", date, "Store", storeName];

  (["AM", "PM"] as const).forEach((shift) => {
    const shiftRecords = records.filter((r) => r.shift === shift);
    lines.push("", `${shift}:`);
    [1, 2, 3].forEach((n) => {
      const total = shiftRecords.reduce(
        (s, r) => s + (((r[lineKey(n)] as number) || 0)),
        0
      );
      lines.push(`${n} ${n === 1 ? "line" : "lines"}/NID (${total})`);
    });
  });

  return lines.join("\n");
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date") || new Date().toISOString().slice(0, 10);

  // Fetch branch with active members
  const branch = await prisma.branch.findUnique({
    where: { id },
    include: {
      users: {
        where: { isActive: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
        select: { id: true, name: true, role: true, staffId: true, vpnNum: true },
      },
    },
  });

  if (!branch) return NextResponse.json({ error: "Store not found" }, { status: 404 });

  const targetDate = new Date(`${date}T00:00:00.000Z`);

  // Daily reports for this branch
  const dailyReports = await prisma.dailyReport.findMany({
    where: { branchId: id, date: targetDate },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: { employee: { name: "asc" } },
  });

  // Health checks for employees of this branch
  const healthChecks = await prisma.healthCheck.findMany({
    where: {
      date: new Date(date),
      employee: { branchId: id },
    },
    include: { employee: { select: { id: true, name: true } } },
    orderBy: [{ shift: "asc" }, { submittedAt: "asc" }],
  });

  // Build SMS message
  const aggregated = aggregateDailyReports(
    dailyReports as Array<Record<string, unknown>>,
    date,
    branch.name
  );
  const smsMessage = buildSmsMessage(aggregated);

  // Build health report text
  const healthReport = buildHealthReportText(
    date,
    branch.name,
    healthChecks as Array<Record<string, unknown>>
  );

  return NextResponse.json({
    branch: { id: branch.id, name: branch.name, code: branch.code },
    members: branch.users,
    dailyReports: dailyReports.map((r) => ({
      ...r,
      date: r.date.toISOString().slice(0, 10),
    })),
    healthChecks,
    smsMessage,
    healthReport,
    date,
    reportsCount: dailyReports.length,
    checksCount: healthChecks.length,
  });
}

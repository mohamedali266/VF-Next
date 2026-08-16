import { auth } from "@/lib/auth";
import { calculateAtHomeAch, calculateTotalDailyAch } from "@/lib/daily-report";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateReportSchema = z.object({
  storeName: z.string().trim().min(1).max(100).optional(),
  pre: z.coerce.number().int().min(0).optional(),
  f52: z.coerce.number().int().min(0).optional(),
  f80: z.coerce.number().int().min(0).optional(),
  aboveF115: z.coerce.number().int().min(0).optional(),
  newVmt: z.coerce.number().int().min(0).optional(),
  exitVmt: z.coerce.number().int().min(0).optional(),
  newRed: z.coerce.number().int().min(0).optional(),
  conRed: z.coerce.number().int().min(0).optional(),
  mnp: z.coerce.number().int().min(0).optional(),
  atHomeType: z.enum(["FOUR_G", "FIVE_G"]).optional(),
  atHomeCount: z.coerce.number().int().min(0).optional(),
  adslAch: z.coerce.number().int().min(0).optional(),
  terminalAch: z.coerce.number().int().min(0).optional(),
  enterpriseNewAcc: z.coerce.number().int().min(0).optional(),
  enterpriseGas: z.coerce.number().int().min(0).optional(),
});

const reportSelect = {
  id: true,
  employeeId: true,
  branchId: true,
  date: true,
  storeName: true,
  pre: true,
  f52: true,
  f80: true,
  aboveF115: true,
  newVmt: true,
  exitVmt: true,
  newRed: true,
  conRed: true,
  mnp: true,
  atHomeType: true,
  atHomeCount: true,
  atHomeAch: true,
  adslAch: true,
  terminalAch: true,
  enterpriseNewAcc: true,
  enterpriseGas: true,
  totalDailyAch: true,
  submittedAt: true,
  updatedAt: true,
  employee: { select: { id: true, name: true, username: true, vpnNum: true, staffId: true } },
  branch: { select: { id: true, name: true, code: true } },
} as const;

function serializeDate<T extends { date: Date }>(report: T) {
  return { ...report, date: report.date.toISOString().slice(0, 10) };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = updateReportSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report data" }, { status: 400 });
  }

  const { id } = await params;
  const current = await prisma.dailyReport.findUnique({ where: { id } });
  if (!current) return NextResponse.json({ error: "Report not found" }, { status: 404 });

  const next = { ...current, ...parsed.data };
  const atHomeAch = calculateAtHomeAch(next.atHomeType, next.atHomeCount);
  const totalDailyAch = calculateTotalDailyAch(next);

  const report = await prisma.dailyReport.update({
    where: { id },
    data: {
      ...parsed.data,
      atHomeAch,
      totalDailyAch,
    },
    select: reportSelect,
  });

  return NextResponse.json({ report: serializeDate(report) });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  await prisma.dailyReport.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

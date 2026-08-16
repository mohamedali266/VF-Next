import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import AdminReportsClient from "./AdminReportsClient";

export default async function AdminReportsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const [reports, branches] = await Promise.all([
    prisma.dailyReport.findMany({
      orderBy: [{ date: "desc" }, { submittedAt: "desc" }],
      take: 200,
      include: {
        employee: { select: { id: true, name: true, username: true, vpnNum: true, staffId: true } },
        branch: { select: { id: true, name: true, code: true } },
      },
    }),
    prisma.branch.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
  ]);

  return (
    <AdminReportsClient
      reports={reports.map((report) => ({ ...report, date: report.date.toISOString().slice(0, 10) }))}
      branches={branches}
    />
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import EditLogsClient from "./EditLogsClient";

const LINE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function lineChanges(oldValues: unknown, newValues: unknown) {
  const oldRecord = asRecord(oldValues);
  const newRecord = asRecord(newValues);

  return LINE_NUMS.map((n) => {
    const key = `line${n}Nid`;
    const oldValue = asNumber(oldRecord[key]);
    const newValue = asNumber(newRecord[key]);
    if (oldValue === newValue) return null;
    return { line: n, oldValue, newValue };
  }).filter(Boolean) as Array<{ line: number; oldValue: number; newValue: number }>;
}

export default async function AdminEditLogsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const logs = await prisma.editLog.findMany({
    orderBy: { editedAt: "desc" },
    take: 100,
    include: {
      editedBy: { select: { name: true } },
      healthCheck: {
        include: {
          employee: { select: { name: true } },
        },
      },
    },
  });

  return (
    <EditLogsClient
      logs={logs.map((log) => ({
        id: log.id,
        employeeName: log.healthCheck.employee.name,
        date: log.healthCheck.date.toISOString().slice(0, 10),
        shift: log.healthCheck.shift,
        reason: log.reason,
        editedBy: log.editedBy.name,
        editedAt: log.editedAt.toLocaleString("ar-EG"),
        changes: lineChanges(log.oldValues, log.newValues),
      }))}
    />
  );
}

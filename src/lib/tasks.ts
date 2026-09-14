import { prisma } from "@/lib/db";
import type { Role, Shift, TaskItemStatus } from "@prisma/client";

export const DEFAULT_TASK_GROUP_ID = "default-operations";

export const DEFAULT_DAILY_TASKS = [
  {
    title: "Clean PC audit",
    description: "making sure no scanned copies of national ID cards or customer contracts (files, not just paper) are sitting on the PC.",
  },
  {
    title: "Contracts Quality Review",
    description: "Review physical contracts to verify they are fully filled, signed, intact, and valid ID.",
  },
  {
    title: "System Contract Reconciliation",
    description: "To ensure that the actual physical count of contracts (Prepaid, VMT, SIM Swap) matches exactly with the number of contracts recorded on wincash",
  },
  {
    title: "Petty Cash Audit",
    description: "Perform a petty cash review, verify the balance, and reconcile it with the WinCash balance.",
  },
  {
    title: "SIM Cards Inventory",
    description: "Conduct a complete stock count and audit for all SIM card batches(27,43,114,58,Sim card).",
  },
  {
    title: "Warehouse Stock Audit",
    description: "Perform a full inventory audit for warehouse/stockroom devices, accessories, and assets.",
  },
].map((task, index) => ({ ...task, id: `${DEFAULT_TASK_GROUP_ID}-${index + 1}`, sortOrder: index + 1 }));

export function canManageBranchTasks(role?: string | null) {
  return role === "ADMIN" || role === "MANAGER" || role === "TEAM_LEADER" || role === "AREA_MANAGER";
}

export function canCreateAreaTasks(role?: string | null) {
  return role === "ADMIN" || role === "AREA_MANAGER";
}

export function normalizeTaskStatus(value: unknown): TaskItemStatus {
  if (value === "DONE" || value === "MISSED" || value === "NA") return value;
  return "PENDING";
}

export function normalizeShift(value: unknown): Shift {
  return value === "AM" || value === "BW" ? value : "PM";
}

export function toDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getAccessibleBranch(branchId: string, user: { role: Role | string; branchId?: string | null; areaId?: string | null }) {
  const branch = await prisma.branch.findFirst({
    where: {
      id: branchId,
      isActive: true,
      ...(user.role === "EMPLOYEE" || user.role === "MANAGER" || user.role === "TEAM_LEADER" ? { id: user.branchId || "" } : {}),
      ...(user.role === "AREA_MANAGER" ? { areaId: user.areaId || "" } : {}),
    },
    select: { id: true, name: true, code: true, areaId: true },
  });
  return branch;
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  DEFAULT_DAILY_TASKS,
  DEFAULT_TASK_GROUP_ID,
  canManageBranchTasks,
  dateKey,
  getAccessibleBranch,
  normalizeShift,
  normalizeTaskStatus,
  toDateOnly,
} from "@/lib/tasks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const taskItemSchema = z.object({
  id: z.string().optional().nullable(),
  templateItemId: z.string().optional().nullable(),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(700).default(""),
  assignedToId: z.string().optional().nullable(),
  assignedToAllShift: z.boolean().optional().default(false),
  status: z.string().optional().nullable(),
});

const saveSheetSchema = z.object({
  branchId: z.string().trim().min(1),
  date: z.string().trim().min(8),
  shift: z.string().trim(),
  shiftLeaderId: z.string().optional().nullable(),
  sourceGroupId: z.string().optional().nullable(),
  submit: z.boolean().optional().default(false),
  items: z.array(taskItemSchema).min(1),
});

function serializeSheet(sheet: Awaited<ReturnType<typeof loadSheet>>) {
  if (!sheet) return null;
  return {
    ...sheet,
    date: dateKey(sheet.date),
    createdAt: sheet.createdAt.toISOString(),
    updatedAt: sheet.updatedAt.toISOString(),
    submittedAt: sheet.submittedAt?.toISOString() || null,
  };
}

async function loadSheet(branchId: string, date: Date, shift: "AM" | "PM" | "BW") {
  return prisma.dailyTaskSheet.findUnique({
    where: { branchId_date_shift: { branchId, date, shift } },
    include: {
      shiftLeader: { select: { id: true, name: true, isMaster: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      items: {
        orderBy: { sortOrder: "asc" },
        include: { assignedTo: { select: { id: true, name: true, role: true, isMaster: true } } },
      },
    },
  });
}

function isSheetComplete(sheet: Awaited<ReturnType<typeof loadSheet>>) {
  if (!sheet) return false;
  return Boolean(
    sheet.status === "SUBMITTED" &&
    sheet.shiftLeaderId &&
    sheet.items.length &&
    sheet.items.every((item) => item.title.trim() && (item.assignedToId || item.assignedToAllShift))
  );
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const requestedBranchId = searchParams.get("branchId") || session.user.branchId || "";
  if (!requestedBranchId) return NextResponse.json({ error: "No store selected" }, { status: 400 });

  const branch = await getAccessibleBranch(requestedBranchId, session.user);
  if (!branch) return NextResponse.json({ error: "Store is outside your access scope" }, { status: 403 });

  const date = toDateOnly(searchParams.get("date") || new Date().toISOString().slice(0, 10));
  const shift = normalizeShift(searchParams.get("shift"));

  const canManage = canManageBranchTasks(session.user.role);
  const [members, groups, sheet] = await Promise.all([
    prisma.user.findMany({
      where: {
        branchId: branch.id,
        isActive: true,
        role: { in: ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] },
      },
      orderBy: [{ isMaster: "desc" }, { role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, isMaster: true, staffId: true, vpnNum: true },
    }),
    prisma.taskGroup.findMany({
      where: {
        isActive: true,
        OR: [
          { scope: "BRANCH", branchId: branch.id },
          ...(branch.areaId ? [{ scope: "AREA" as const, areaId: branch.areaId, OR: [{ branchId: null }, { branchId: branch.id }] }] : []),
        ],
      },
      orderBy: [{ scope: "asc" }, { title: "asc" }],
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    loadSheet(branch.id, date, shift),
  ]);

  const defaultGroup = {
    id: DEFAULT_TASK_GROUP_ID,
    title: "Daily Operations Checklist",
    scope: "BRANCH",
    shift: null,
    items: DEFAULT_DAILY_TASKS,
  };

  return NextResponse.json({
    branch,
    members,
    shiftLeaders: members.filter((member) => member.role === "EMPLOYEE" && member.isMaster),
    groups: [
      defaultGroup,
      ...groups.map((group) => ({
        id: group.id,
        title: group.title,
        scope: group.scope,
        shift: group.shift,
        branchId: group.branchId,
        areaId: group.areaId,
        items: group.items.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          sortOrder: item.sortOrder,
        })),
      })),
    ],
    sheet: serializeSheet(canManage || isSheetComplete(sheet) ? sheet : null),
    canManage,
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageBranchTasks(session.user.role)) {
    return NextResponse.json({ error: "You do not have permission to manage tasks" }, { status: 403 });
  }

  const parsed = saveSheetSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid task sheet data" }, { status: 400 });

  const data = parsed.data;
  const branch = await getAccessibleBranch(data.branchId, session.user);
  if (!branch) return NextResponse.json({ error: "Store is outside your access scope" }, { status: 403 });

  const date = toDateOnly(data.date);
  const shift = normalizeShift(data.shift);
  const memberIds = new Set(
    (await prisma.user.findMany({
      where: { branchId: branch.id, isActive: true, role: { in: ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] } },
      select: { id: true },
    })).map((user) => user.id)
  );

  if (data.shiftLeaderId) {
    const leader = await prisma.user.findFirst({
      where: { id: data.shiftLeaderId, branchId: branch.id, isActive: true, role: "EMPLOYEE", isMaster: true },
      select: { id: true },
    });
    if (!leader) return NextResponse.json({ error: "Shift Leader must be an active Master employee in this store" }, { status: 400 });
  }

  if (data.submit && !data.shiftLeaderId) {
    return NextResponse.json({ error: "Select a Shift Leader before submitting the task sheet" }, { status: 400 });
  }

  for (const item of data.items) {
    if (data.submit && !item.assignedToId && !item.assignedToAllShift) {
      return NextResponse.json({ error: "Every task must be assigned to an employee or All Shift before submit" }, { status: 400 });
    }
    if (item.assignedToId && !memberIds.has(item.assignedToId)) {
      return NextResponse.json({ error: "Assigned employee must be active in this store" }, { status: 400 });
    }
  }

  const sourceGroupId = data.sourceGroupId && data.sourceGroupId !== DEFAULT_TASK_GROUP_ID ? data.sourceGroupId : null;
  if (sourceGroupId) {
    const group = await prisma.taskGroup.findFirst({
      where: {
        id: sourceGroupId,
        isActive: true,
        OR: [
          { scope: "BRANCH", branchId: branch.id },
          ...(branch.areaId ? [{ scope: "AREA" as const, areaId: branch.areaId, OR: [{ branchId: null }, { branchId: branch.id }] }] : []),
        ],
      },
      select: { id: true },
    });
    if (!group) return NextResponse.json({ error: "Task group is outside your access scope" }, { status: 403 });
  }

  const saved = await prisma.$transaction(async (tx) => {
    const existing = await tx.dailyTaskSheet.findUnique({
      where: { branchId_date_shift: { branchId: branch.id, date, shift } },
      select: { id: true },
    });

    const sheet = existing
      ? await tx.dailyTaskSheet.update({
          where: { id: existing.id },
          data: {
            shiftLeaderId: data.shiftLeaderId || null,
            sourceGroupId,
            status: data.submit ? "SUBMITTED" : "DRAFT",
            submittedAt: data.submit ? new Date() : null,
            updatedById: session.user.id,
          },
        })
      : await tx.dailyTaskSheet.create({
          data: {
            branchId: branch.id,
            date,
            shift,
            shiftLeaderId: data.shiftLeaderId || null,
            sourceGroupId,
            status: data.submit ? "SUBMITTED" : "DRAFT",
            submittedAt: data.submit ? new Date() : null,
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        });

    await tx.dailyTaskItem.deleteMany({ where: { sheetId: sheet.id } });
    await tx.dailyTaskItem.createMany({
      data: data.items.map((item, index) => ({
        sheetId: sheet.id,
        templateItemId: item.templateItemId && !item.templateItemId.startsWith(DEFAULT_TASK_GROUP_ID) ? item.templateItemId : null,
        title: item.title,
        description: item.description || "",
        sortOrder: index + 1,
        assignedToId: item.assignedToAllShift ? null : item.assignedToId || null,
        assignedToAllShift: item.assignedToAllShift,
        status: normalizeTaskStatus(item.status),
      })),
    });

    return loadSheet(branch.id, date, shift);
  });

  return NextResponse.json({ sheet: serializeSheet(saved) });
}

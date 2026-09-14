import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { canCreateAreaTasks, canManageBranchTasks, getAccessibleBranch, normalizeShift } from "@/lib/tasks";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const groupSchema = z.object({
  title: z.string().trim().min(2).max(80),
  scope: z.enum(["BRANCH", "AREA"]).default("BRANCH"),
  branchId: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  shift: z.string().optional().nullable(),
  items: z.array(z.object({
    title: z.string().trim().min(1).max(120),
    description: z.string().trim().max(700).default(""),
  })).min(1),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = groupSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid task group data" }, { status: 400 });
  const data = parsed.data;

  let branchId: string | null = null;
  let areaId: string | null = null;

  if (data.scope === "AREA") {
    if (!canCreateAreaTasks(session.user.role)) {
      return NextResponse.json({ error: "Only Area Manager or Admin can create area task groups" }, { status: 403 });
    }
    areaId = session.user.role === "AREA_MANAGER" ? session.user.areaId || null : data.areaId || null;
    if (!areaId) return NextResponse.json({ error: "Area is required" }, { status: 400 });
    const area = await prisma.area.findFirst({
      where: { id: areaId, isActive: true },
      select: { id: true },
    });
    if (!area) return NextResponse.json({ error: "Area not found" }, { status: 404 });
  } else {
    if (!canManageBranchTasks(session.user.role)) {
      return NextResponse.json({ error: "You do not have permission to create branch task groups" }, { status: 403 });
    }
    const branch = await getAccessibleBranch(data.branchId || session.user.branchId || "", session.user);
    if (!branch) return NextResponse.json({ error: "Store is outside your access scope" }, { status: 403 });
    branchId = branch.id;
  }

  const group = await prisma.taskGroup.create({
    data: {
      title: data.title,
      scope: data.scope,
      shift: data.shift ? normalizeShift(data.shift) : null,
      branchId,
      areaId,
      createdById: session.user.id,
      items: {
        create: data.items.map((item, index) => ({
          title: item.title,
          description: item.description,
          sortOrder: index + 1,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ group }, { status: 201 });
}

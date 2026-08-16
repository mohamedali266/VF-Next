import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(1).optional(),
  serviceType: z.string().trim().min(1).optional(),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]).optional(),
  notes: z.string().nullable().optional(),
});

// PUT: update CST customer owned by logged-in agent
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.cstCustomer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  if (existing.agentId !== session.user.id) {
    return NextResponse.json({ error: "غير مصرح للتعديل على عميل موظف آخر" }, { status: 403 });
  }

  const json = await req.json();
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  const updated = await prisma.cstCustomer.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ customer: updated });
}

// DELETE: delete CST customer owned by logged-in agent
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.cstCustomer.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "العميل غير موجود" }, { status: 404 });

  if (existing.agentId !== session.user.id) {
    return NextResponse.json({ error: "غير مصرح بحذف عميل موظف آخر" }, { status: 403 });
  }

  await prisma.cstCustomer.delete({ where: { id } });

  return NextResponse.json({ success: true });
}

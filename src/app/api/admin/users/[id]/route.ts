import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER", "ADMIN"] as const;

function isRole(value: unknown): value is (typeof ROLES)[number] {
  return typeof value === "string" && ROLES.includes(value as (typeof ROLES)[number]);
}

function normalizeBranchId(value: unknown) {
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value : undefined;
}

// PATCH: update user (role or isActive)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { role, isActive, branchId } = body;

  const updateData: {
    role?: (typeof ROLES)[number];
    isActive?: boolean;
    branchId?: string | null;
  } = {};
  if (role !== undefined) {
    if (!isRole(role)) return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    updateData.role = role;
  }
  if (isActive !== undefined) updateData.isActive = Boolean(isActive);
  if (branchId !== undefined) {
    updateData.branchId = normalizeBranchId(branchId) ?? null;
  }

  const { id } = await params;

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      branchId: true,
      branch: { select: { id: true, name: true, code: true } },
      isActive: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

// DELETE: delete user
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

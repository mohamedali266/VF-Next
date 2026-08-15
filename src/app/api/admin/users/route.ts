import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER", "ADMIN"] as const;

function isRole(value: unknown): value is (typeof ROLES)[number] {
  return typeof value === "string" && ROLES.includes(value as (typeof ROLES)[number]);
}

function normalizeBranchId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

// GET: list all users
export async function GET() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
  return NextResponse.json({ users });
}

// POST: create new user
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, password, role, department, branchId } = await req.json();

  if (!name || !email || !password) {
    return NextResponse.json({ error: "الاسم والإيميل وكلمة المرور مطلوبة" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "البريد الإلكتروني مستخدم بالفعل" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const targetBranchId = normalizeBranchId(branchId);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      role: isRole(role) ? role : "EMPLOYEE",
      department,
      branchId: targetBranchId,
      isActive: true,
    },
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

  return NextResponse.json({ user }, { status: 201 });
}

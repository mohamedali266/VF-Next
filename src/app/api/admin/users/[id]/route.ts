import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER", "ADMIN"] as const;
const EMAIL_DOMAIN = "@vodafone.com.eg";

const updateUserSchema = z.object({
  name: z.string().trim().min(2).optional(),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  vpnNum: z.string().trim().min(1).max(30).optional(),
  staffId: z.string().trim().min(1).max(30).optional(),
  emailLocalPart: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  confirmPassword: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(ROLES).optional(),
  isActive: z.boolean().optional(),
  branchId: z.string().trim().optional().nullable(),
}).refine((data) => !data.password || data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function buildVodafoneEmail(localPart: string) {
  return `${localPart.toLowerCase()}${EMAIL_DOMAIN}`;
}

function normalizeBranchId(value: unknown) {
  if (value === null) return null;
  return typeof value === "string" && value.trim() ? value : undefined;
}

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  vpnNum: true,
  staffId: true,
  role: true,
  branchId: true,
  branch: { select: { id: true, name: true, code: true } },
  isActive: true,
  createdAt: true,
} as const;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const parsed = updateUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات المستخدم المطلوبة" }, { status: 400 });
  }

  const body = parsed.data;
  const updateData: {
    name?: string;
    email?: string;
    username?: string;
    vpnNum?: string;
    staffId?: string;
    password?: string;
    role?: (typeof ROLES)[number];
    isActive?: boolean;
    branchId?: string | null;
  } = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.username !== undefined) updateData.username = body.username.toLowerCase();
  if (body.vpnNum !== undefined) updateData.vpnNum = body.vpnNum;
  if (body.staffId !== undefined) updateData.staffId = body.staffId;
  if (body.emailLocalPart !== undefined) updateData.email = buildVodafoneEmail(body.emailLocalPart);
  if (body.role !== undefined) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.branchId !== undefined) updateData.branchId = normalizeBranchId(body.branchId) ?? null;
  if (body.password) updateData.password = await bcrypt.hash(body.password, 12);

  const duplicateChecks = [];
  if (updateData.email) duplicateChecks.push({ email: updateData.email });
  if (updateData.username) duplicateChecks.push({ username: updateData.username });
  if (updateData.vpnNum) duplicateChecks.push({ vpnNum: updateData.vpnNum });
  if (updateData.staffId) duplicateChecks.push({ staffId: updateData.staffId });

  if (duplicateChecks.length) {
    const existing = await prisma.user.findFirst({
      where: { id: { not: id }, OR: duplicateChecks },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ error: "Email أو Username أو VPN num أو Staff ID مستخدم بالفعل" }, { status: 409 });
    }
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [healthChecks, dailyReports, editLogs] = await Promise.all([
    prisma.healthCheck.count({ where: { employeeId: id } }),
    prisma.dailyReport.count({ where: { employeeId: id } }),
    prisma.editLog.count({ where: { editedById: id } }),
  ]);

  if (healthChecks || dailyReports || editLogs) {
    return NextResponse.json({
      error: "Cannot delete user with linked reports or logs. Disable the user instead.",
    }, { status: 409 });
  }

  await prisma.session.deleteMany({ where: { userId: id } });
  await prisma.account.deleteMany({ where: { userId: id } });
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ success: true });
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

const ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER", "AREA_MANAGER", "ADMIN"] as const;
const AREA_MANAGER_ALLOWED_ROLES = ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] as const;
const EMAIL_DOMAIN = "@vodafone.com.eg";

const createUserSchema = z.object({
  name: z.string().trim().min(2),
  username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9._-]+$/),
  vpnNum: z.string().trim().min(1).max(30),
  staffId: z.string().trim().min(1).max(30),
  emailLocalPart: z.string().trim().min(1).max(64).regex(/^[a-zA-Z0-9._-]+$/),
  password: z.string().min(6),
  confirmPassword: z.string().min(6),
  role: z.enum(ROLES).default("EMPLOYEE"),
  branchId: z.string().trim().optional().nullable(),
  areaId: z.string().trim().optional().nullable(),
  isMaster: z.boolean().default(false),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

function buildVodafoneEmail(localPart: string) {
  return `${localPart.toLowerCase()}${EMAIL_DOMAIN}`;
}

function normalizeBranchId(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
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
  areaId: true,
  branch: { select: { id: true, name: true, code: true } },
  area: { select: { id: true, name: true, code: true } },
  isMaster: true,
  isActive: true,
  createdAt: true,
} as const;

export async function GET() {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AREA_MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: session.user.role === "AREA_MANAGER"
      ? { areaId: session.user.areaId || "__none__", role: { in: [...AREA_MANAGER_ALLOWED_ROLES] } }
      : undefined,
    orderBy: { createdAt: "desc" },
    select: userSelect,
  });

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AREA_MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = createUserSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "راجع بيانات المستخدم المطلوبة" }, { status: 400 });
  }

  const data = parsed.data;
  if (session.user.role === "AREA_MANAGER") {
    if (!AREA_MANAGER_ALLOWED_ROLES.includes(data.role as (typeof AREA_MANAGER_ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: "Area Manager cannot create Admin or Area Manager users" }, { status: 403 });
    }
    if (!session.user.areaId) {
      return NextResponse.json({ error: "Area Manager is not assigned to an area" }, { status: 403 });
    }
    const branchId = normalizeBranchId(data.branchId);
    if (!branchId) return NextResponse.json({ error: "Store is required for area users" }, { status: 400 });
    const branch = await prisma.branch.findFirst({ where: { id: branchId, areaId: session.user.areaId }, select: { id: true } });
    if (!branch) return NextResponse.json({ error: "Store is outside your area" }, { status: 403 });
  }

  if (session.user.role === "ADMIN" && data.role === "AREA_MANAGER" && !normalizeBranchId(data.areaId)) {
    return NextResponse.json({ error: "Area is required for Area Manager users" }, { status: 400 });
  }

  const username = data.username.toLowerCase();
  const email = buildVodafoneEmail(data.emailLocalPart);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { email },
        { username },
        { vpnNum: data.vpnNum },
        { staffId: data.staffId },
      ],
    },
    select: { email: true, username: true, vpnNum: true, staffId: true },
  });

  if (existing) {
    return NextResponse.json({ error: "Email أو Username أو VPN num أو Staff ID مستخدم بالفعل" }, { status: 409 });
  }

  const hashedPassword = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email,
      username,
      vpnNum: data.vpnNum,
      staffId: data.staffId,
      password: hashedPassword,
      role: data.role,
      branchId: normalizeBranchId(data.branchId),
      areaId: session.user.role === "AREA_MANAGER" ? session.user.areaId : normalizeBranchId(data.areaId),
      isMaster: data.isMaster,
      isActive: true,
    },
    select: userSelect,
  });

  return NextResponse.json({ user }, { status: 201 });
}

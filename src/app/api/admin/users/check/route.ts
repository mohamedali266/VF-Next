import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_DOMAIN = "@vodafone.com.eg";

function normalize(value: string | null) {
  return value?.trim() || "";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user.role !== "ADMIN" && session.user.role !== "AREA_MANAGER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const excludeId = normalize(searchParams.get("excludeId"));
  const username = normalize(searchParams.get("username")).toLowerCase();
  const vpnNum = normalize(searchParams.get("vpnNum"));
  const staffId = normalize(searchParams.get("staffId"));
  const emailLocalPart = normalize(searchParams.get("emailLocalPart")).toLowerCase();
  const email = emailLocalPart ? `${emailLocalPart}${EMAIL_DOMAIN}` : "";

  const checks: Array<{ username?: string; vpnNum?: string; staffId?: string; email?: string }> = [];
  if (username) checks.push({ username });
  if (vpnNum) checks.push({ vpnNum });
  if (staffId) checks.push({ staffId });
  if (email) checks.push({ email });

  if (!checks.length) {
    return NextResponse.json({ available: true, conflicts: [] });
  }

  const existing = await prisma.user.findMany({
    where: {
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: checks,
    },
    select: { username: true, vpnNum: true, staffId: true, email: true },
  });

  const conflicts = new Set<string>();
  for (const user of existing) {
    if (username && user.username?.toLowerCase() === username) conflicts.add("username");
    if (vpnNum && user.vpnNum === vpnNum) conflicts.add("vpnNum");
    if (staffId && user.staffId === staffId) conflicts.add("staffId");
    if (email && user.email.toLowerCase() === email) conflicts.add("email");
  }

  return NextResponse.json({
    available: conflicts.size === 0,
    conflicts: Array.from(conflicts),
  });
}

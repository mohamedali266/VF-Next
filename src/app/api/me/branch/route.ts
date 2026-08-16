import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

// GET /api/me/branch — returns current user's branchId (always fresh from DB)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ branchId: null });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { branchId: true },
  });

  return NextResponse.json({ branchId: user?.branchId ?? null });
}

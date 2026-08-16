import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const cstSchema = z.object({
  name: z.string().trim().min(1, "اسم العميل مطلوب"),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب"),
  serviceType: z.string().trim().min(1, "نوع الخدمة مطلوب"),
  status: z.enum(["Pending", "In Progress", "Completed", "Cancelled"]).default("Pending"),
  notes: z.string().optional(),
});

// GET: fetch CST customers for currently logged-in agent (STRICT ISOLATION)
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const customers = await prisma.cstCustomer.findMany({
    where: { agentId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ customers });
}

// POST: create new CST customer for logged-in agent
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = cstSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة", details: parsed.error.flatten() }, { status: 400 });
  }

  const customer = await prisma.cstCustomer.create({
    data: {
      ...parsed.data,
      agentId: session.user.id,
    },
  });

  return NextResponse.json({ customer }, { status: 201 });
}

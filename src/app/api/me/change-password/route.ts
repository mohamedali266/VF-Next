import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "كلمة السر القديمة مطلوبة"),
  newPassword: z.string().min(6, "كلمة السر الجديدة يجب أن تكون 6 أحرف على الأقل"),
  confirmPassword: z.string().min(6, "تأكيد كلمة السر مطلوب"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "كلمة السر الجديدة وتأكيدها غير متطابقين",
  path: ["confirmPassword"],
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await req.json();
  const parsed = changePasswordSchema.safeParse(json);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "بيانات غير صالحة";
    return NextResponse.json({ error: errorMsg }, { status: 400 });
  }

  const { oldPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, password: true },
  });

  if (!user) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });

  const passwordMatch = await bcrypt.compare(oldPassword, user.password);
  if (!passwordMatch) {
    return NextResponse.json({ error: "كلمة السر القديمة غير صحيحة" }, { status: 400 });
  }

  const newHashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { password: newHashedPassword },
  });

  return NextResponse.json({ success: true, message: "تم تغيير كلمة السر بنجاح" });
}

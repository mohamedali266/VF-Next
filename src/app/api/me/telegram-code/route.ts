import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { telegramChatId: true, telegramLinkCode: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.telegramChatId) {
    return NextResponse.json({ isLinked: true, telegramChatId: user.telegramChatId });
  }

  let code = user.telegramLinkCode;
  if (!code) {
    code = generateCode();
    await prisma.user.update({
      where: { id: session.user.id },
      data: { telegramLinkCode: code },
    });
  }

  return NextResponse.json({ isLinked: false, code });
}

export async function POST() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const code = generateCode();
  await prisma.user.update({
    where: { id: session.user.id },
    data: { telegramLinkCode: code },
  });

  return NextResponse.json({ isLinked: false, code });
}

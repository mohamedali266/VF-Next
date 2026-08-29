import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

type TelegramReplyMarkup = Record<string, unknown>;

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: TelegramReplyMarkup) {
  if (!BOT_TOKEN) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        reply_markup: replyMarkup,
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

async function linkTelegramAccount(chatId: string | number, code: string) {
  const user = await prisma.user.findFirst({
    where: { telegramLinkCode: code },
  });

  if (!user) return null;

  await prisma.$transaction([
    prisma.user.updateMany({
      where: {
        telegramChatId: chatId.toString(),
        id: { not: user.id },
      },
      data: { telegramChatId: null },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        telegramChatId: chatId.toString(),
        telegramLinkCode: null,
      },
    }),
  ]);

  return user;
}

export async function POST(req: NextRequest) {
  try {
    const update = await req.json();
    const message = update.message;
    if (!message || !message.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();

    // 1) /start command
    if (text.startsWith("/start")) {
      const startPayload = text.split(" ")[1]?.trim();
      const linkCode = startPayload?.startsWith("link_") ? startPayload.replace("link_", "") : null;

      if (linkCode) {
        const user = await linkTelegramAccount(chatId, linkCode);
        if (!user) {
          await sendTelegramMessage(chatId, "❌ Invalid or expired link code. Please generate a new code on VF-Next dashboard.");
          return NextResponse.json({ ok: true });
        }

        await sendTelegramMessage(chatId, `✅ <b>Account Linked Successfully!</b>\n\nWelcome <b>${user.name}</b>! You will now receive automated shift reminders and customer follow-up alerts.`);
        return NextResponse.json({ ok: true });
      }

      const welcomeText = `👋 <b>Welcome to VF-Next Assistant Bot!</b>\n\n` +
        `To start receiving shift reminders and querying your RPM or customers, please link your account:\n\n` +
        `1. Open VF-Next Dashboard on your phone/PC.\n` +
        `2. Click <b>Telegram Bot</b> card to get your 6-digit code.\n` +
        `3. Send <code>/link 123456</code> here in chat.\n\n` +
        `<b>Available Commands:</b>\n` +
        `• 📊 <code>/rpm</code> - View your personal & store RPM\n` +
        `• 👥 <code>/cst</code> - View customer follow-ups for today\n` +
        `• ℹ️ <code>/help</code> - Show commands guide`;

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    // 2) /link <code> command
    if (text.startsWith("/link")) {
      const parts = text.split(" ");
      const code = parts[1]?.trim();

      if (!code) {
        await sendTelegramMessage(chatId, "⚠️ Please provide your 6-digit code.\nExample: <code>/link 582914</code>");
        return NextResponse.json({ ok: true });
      }

      const user = await linkTelegramAccount(chatId, code);
      if (!user) {
        await sendTelegramMessage(chatId, "❌ Invalid or expired link code. Please generate a new code on VF-Next dashboard.");
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(chatId, `✅ <b>Account Linked Successfully!</b>\n\nWelcome <b>${user.name}</b>! You will now receive automated shift reminders and customer follow-up alerts.`);
      return NextResponse.json({ ok: true });
    }

    // Check linked user for other commands
    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId.toString() },
      include: { branch: true },
    });

    if (!user) {
      await sendTelegramMessage(chatId, "⚠️ <b>Account Not Linked!</b>\nPlease link your VF-Next account first by sending <code>/link &lt;code&gt;</code>.");
      return NextResponse.json({ ok: true });
    }

    // 3) /rpm command
    if (text === "/rpm" || text === "/status") {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      const reports = await prisma.dailyReport.findMany({
        where: {
          employeeId: user.id,
          date: { gte: startOfMonth, lte: endOfMonth },
        },
      });

      let totalF = 0, totalMnp = 0, totalRed = 0, totalLines = 0, totalNewVmt = 0, totalAcquisition = 0;

      reports.forEach((r) => {
        const pre = r.pre || 0;
        const f52 = r.f52 || 0;
        const f80 = r.f80 || 0;
        const aboveF115 = r.aboveF115 || 0;
        const mnp = r.mnp || 0;
        const newRed = r.newRed || 0;
        const conRed = r.conRed || 0;
        const newVmt = r.newVmt || 0;

        const fSum = pre + f52 + f80 + aboveF115;
        const redSum = newRed * 3 + conRed;
        const linesSum = fSum + mnp + redSum;
        const acqSum = linesSum + newVmt;

        totalF += fSum;
        totalMnp += mnp;
        totalRed += redSum;
        totalLines += linesSum;
        totalNewVmt += newVmt;
        totalAcquisition += acqSum;
      });

      let responseText = `📊 <b>${user.name} RPM (Monthly Cumulative)</b>\n\n` +
        `📈 <b>Acquisition:</b> ${totalAcquisition}\n` +
        `📦 <b>Lines:</b> ${totalLines} (F: ${totalF} | MNP: ${totalMnp} | Red: ${totalRed})\n` +
        `📡 <b>New VMT:</b> ${totalNewVmt}\n`;

      if (user.branchId && user.branch) {
        const storeReports = await prisma.dailyReport.findMany({
          where: {
            branchId: user.branchId,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
        });

        let storeAcq = 0, storeLines = 0;
        storeReports.forEach((r) => {
          const lines = (r.pre || 0) + (r.f52 || 0) + (r.f80 || 0) + (r.aboveF115 || 0) + (r.mnp || 0) + ((r.newRed || 0) * 3 + (r.conRed || 0));
          storeLines += lines;
          storeAcq += lines + (r.newVmt || 0);
        });

        responseText += `\n🏪 <b>Store RPM (${user.branch.name}):</b>\n` +
          `📈 Total Store Acquisition: <b>${storeAcq}</b>\n` +
          `📦 Total Store Lines: <b>${storeLines}</b>`;
      }

      await sendTelegramMessage(chatId, responseText);
      return NextResponse.json({ ok: true });
    }

    // 4) /cst command
    if (text.startsWith("/cst") || text.startsWith("/customer")) {
      const todayStr = new Date().toISOString().slice(0, 10);
      const customers = await prisma.cstCustomer.findMany({
        where: { agentId: user.id },
        orderBy: { createdAt: "desc" },
        take: 10,
      });

      if (customers.length === 0) {
        await sendTelegramMessage(chatId, "👥 You don't have any customers registered in CST Data yet.");
        return NextResponse.json({ ok: true });
      }

      let msg = `👥 <b>Your CST Customers (Recent 10)</b>\n\n`;
      customers.forEach((c, idx) => {
        const followUp = c.followUpDate ? c.followUpDate.toISOString().slice(0, 10) : null;
        const isToday = followUp === todayStr;

        msg += `${idx + 1}. <b>${c.name}</b> (${c.serviceType})\n` +
          `   📞 Phone: <code>${c.phone}</code> | Status: ${c.status}\n` +
          (followUp ? `   🗓️ Follow-up: <b>${followUp}</b> ${isToday ? "⚠️ (TODAY)" : ""}\n` : "") +
          `-------------------------------\n`;
      });

      await sendTelegramMessage(chatId, msg);
      return NextResponse.json({ ok: true });
    }

    // 5) /help command
    await sendTelegramMessage(chatId, `ℹ️ <b>VF-Next Bot Commands Guide</b>\n\n` +
      `• 📊 <code>/rpm</code> - Check your monthly Acquisition & Lines breakdown\n` +
      `• 👥 <code>/cst</code> - View customer follow-ups and phone contacts\n` +
      `• 🔗 <code>/link &lt;code&gt;</code> - Re-link account with code from web dashboard`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in Telegram Webhook:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

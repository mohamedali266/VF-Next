import { prisma } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId: string, text: string) {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Secret protection for cron jobs
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    // Egypt Local Time (UTC+2 or UTC+3)
    const egyptHour = (now.getUTCHours() + 3) % 24;
    const egyptMinute = now.getUTCMinutes();

    let sentShiftReminders = 0;
    let sentFollowUpReminders = 0;

    // 1) Shift Reminders (AM shift at 15:55, PM shift at 22:55)
    const isAmReminder = (egyptHour === 15 && egyptMinute >= 50 && egyptMinute <= 59);
    const isPmReminder = (egyptHour === 22 && egyptMinute >= 50 && egyptMinute <= 59);

    if (isAmReminder || isPmReminder || req.nextUrl.searchParams.get("forceShift") === "true") {
      const shiftName = isAmReminder ? "AM Shift" : "PM Shift";

      const usersWithTelegram = await prisma.user.findMany({
        where: {
          telegramChatId: { not: null },
          isActive: true,
        },
      });

      const shiftReminderText = `⏳ <b>Shift Submission Reminder! (${shiftName})</b>\n\n` +
        `Hello Agent! Please don't forget to submit your <b>Health Check</b> & <b>Daily Report</b> for your shift today before time runs out.\n\n` +
        `🔗 <b>Submit Health Check:</b>\nhttps://vf-next-delta.vercel.app/employee/health-check\n\n` +
        `📱 <b>Submit Daily Report:</b>\nhttps://vf-next-delta.vercel.app/employee/daily-report\n\n` +
        `Have a productive shift! 🚀`;

      for (const u of usersWithTelegram) {
        if (u.telegramChatId) {
          await sendTelegramMessage(u.telegramChatId, shiftReminderText);
          sentShiftReminders++;
        }
      }
    }

    // 2) Customer Follow-Up Reminders for Today
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const followUpsToday = await prisma.cstCustomer.findMany({
      where: {
        followUpDate: { gte: todayStart, lte: todayEnd },
        agent: { telegramChatId: { not: null } },
      },
      include: { agent: true },
    });

    for (const c of followUpsToday) {
      if (c.agent.telegramChatId) {
        const followUpText = `🔔 <b>Customer Follow-Up Alert!</b>\n\n` +
          `👤 <b>Customer:</b> ${c.name}\n` +
          `📞 <b>Phone:</b> <code>${c.phone}</code>\n` +
          `🏷️ <b>Service:</b> ${c.serviceType}\n` +
          `📌 <b>Status:</b> ${c.status}\n` +
          (c.notes ? `📝 <b>Notes:</b> ${c.notes}\n` : "") +
          `\n💬 <a href="https://wa.me/20${c.phone.replace(/\D/g, "")}">Open WhatsApp Chat</a>`;

        await sendTelegramMessage(c.agent.telegramChatId, followUpText);
        sentFollowUpReminders++;
      }
    }

    return NextResponse.json({
      success: true,
      egyptTime: `${egyptHour}:${egyptMinute}`,
      sentShiftReminders,
      sentFollowUpReminders,
    });
  } catch (error) {
    console.error("Error running Telegram cron reminders:", error);
    return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
  }
}

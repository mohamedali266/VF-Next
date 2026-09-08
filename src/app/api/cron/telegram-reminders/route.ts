import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXTAUTH_URL || "https://vf-next-delta.vercel.app";

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getEgyptDateLabel() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getDateRangeFromLabel(dateLabel: string) {
  return {
    start: new Date(`${dateLabel}T00:00:00.000Z`),
    end: new Date(`${dateLabel}T23:59:59.999Z`),
  };
}

async function sendTelegramMessage(chatId: string | null | undefined, text: string) {
  if (!BOT_TOKEN || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      console.error("Telegram sendMessage failed:", await response.text());
      return false;
    }

    return true;
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
    return false;
  }
}

function plainTextFromTelegram(text: string) {
  return text
    .replace(/<b>/g, "")
    .replace(/<\/b>/g, "")
    .replace(/<code>/g, "")
    .replace(/<\/code>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function emailHtmlFromText(title: string, text: string) {
  return (
    "<div style=\"font-family:Arial,sans-serif;line-height:1.7;color:#111827\">" +
    `<h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>` +
    `<pre style="white-space:pre-wrap;font-family:Arial,sans-serif;margin:0">${escapeHtml(plainTextFromTelegram(text))}</pre>` +
    "</div>"
  );
}

export async function GET(req: NextRequest) {
  try {
    // Secret protection for cron jobs
    const authHeader = req.headers.get("authorization");
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dateLabel = req.nextUrl.searchParams.get("date") || getEgyptDateLabel();
    const { start: todayStart, end: todayEnd } = getDateRangeFromLabel(dateLabel);

    let sentHealthReminders = 0;
    let sentHealthEmailReminders = 0;
    let skippedCompletedUsers = 0;
    let sentFollowUpReminders = 0;
    let sentFollowUpEmailReminders = 0;
    let emailFailures = 0;

    // 1) Daily Health/Daily Report reminders.
    // Vercel Hobby only allows one cron per day, so this reminder intentionally runs on every scheduled invocation.
    const employeesWithContacts = await prisma.user.findMany({
      where: {
        isActive: true,
        role: "EMPLOYEE",
      },
      include: { branch: true },
      orderBy: { name: "asc" },
    });

    for (const user of employeesWithContacts) {
      const [healthCount, dailyCount] = await Promise.all([
        prisma.healthCheck.count({
          where: { employeeId: user.id, date: { gte: todayStart, lte: todayEnd } },
        }),
        prisma.dailyReport.count({
          where: { employeeId: user.id, date: { gte: todayStart, lte: todayEnd } },
        }),
      ]);

      if (healthCount > 0 && dailyCount > 0 && req.nextUrl.searchParams.get("forceHealth") !== "true") {
        skippedCompletedUsers++;
        continue;
      }

      const missingItems = [
        healthCount === 0 ? "Health Check" : null,
        dailyCount === 0 ? "Daily Report" : null,
      ].filter(Boolean).join(" + ");

      const reminderText = `⏳ <b>VF-Next Daily Reminder</b>\n\n` +
        `Hello <b>${escapeHtml(user.name)}</b>.\n` +
        `Date: <b>${dateLabel}</b>\n` +
        `Store: <b>${escapeHtml(user.branch?.name || "Not assigned")}</b>\n\n` +
        `Missing today: <b>${missingItems || "None"}</b>\n\n` +
        `Health Check:\n${APP_URL}/employee/health-check\n\n` +
        `Daily Report:\n${APP_URL}/employee/daily-report`;

      if (await sendTelegramMessage(user.telegramChatId, reminderText)) {
        sentHealthReminders++;
      }

      const emailResult = await sendEmail({
        to: user.email,
        subject: `VF-Next Daily Reminder - ${dateLabel}`,
        text: plainTextFromTelegram(reminderText),
        html: emailHtmlFromText("VF-Next Daily Reminder", reminderText),
      });

      if (emailResult.ok) {
        sentHealthEmailReminders++;
      } else if (!emailResult.skipped) {
        emailFailures++;
      }
    }

    // 2) Customer Follow-Up Reminders for Today
    const followUpsToday = await prisma.cstCustomer.findMany({
      where: {
        followUpDate: { gte: todayStart, lte: todayEnd },
        agent: { isActive: true },
      },
      include: { agent: true },
      orderBy: [{ agentId: "asc" }, { followUpDate: "asc" }, { createdAt: "desc" }],
    });

    const followUpsByAgent = new Map<string, typeof followUpsToday>();
    for (const customer of followUpsToday) {
      const list = followUpsByAgent.get(customer.agentId) || [];
      list.push(customer);
      followUpsByAgent.set(customer.agentId, list);
    }

    for (const customers of followUpsByAgent.values()) {
      const agent = customers[0]?.agent;
      if (!agent) continue;

      const customerLines = customers.slice(0, 12).map((customer, index) => {
        const digits = customer.phone.replace(/\D/g, "");
        const whatsappUrl = digits ? `https://wa.me/${digits.startsWith("20") ? digits : `20${digits}`}` : "";

        return `${index + 1}. <b>${escapeHtml(customer.name)}</b> (${escapeHtml(customer.serviceType)})\n` +
          `Phone: <code>${escapeHtml(customer.phone)}</code>\n` +
          `Status: ${escapeHtml(customer.status)}\n` +
          (customer.notes ? `Notes: ${escapeHtml(customer.notes)}\n` : "") +
          (whatsappUrl ? `WhatsApp: ${whatsappUrl}\n` : "");
      }).join("\n");

      const followUpText = `🔔 <b>CST Follow-Up Reminder</b>\n\n` +
        `Date: <b>${dateLabel}</b>\n` +
        `You have <b>${customers.length}</b> follow-up(s) today.\n\n` +
        customerLines;

      if (await sendTelegramMessage(agent.telegramChatId, followUpText)) {
        sentFollowUpReminders++;
      }

      const emailResult = await sendEmail({
        to: agent.email,
        subject: `VF-Next CST Follow-Up Reminder - ${dateLabel}`,
        text: plainTextFromTelegram(followUpText),
        html: emailHtmlFromText("VF-Next CST Follow-Up Reminder", followUpText),
      });

      if (emailResult.ok) {
        sentFollowUpEmailReminders++;
      } else if (!emailResult.skipped) {
        emailFailures++;
      }
    }

    return NextResponse.json({
      success: true,
      date: dateLabel,
      telegramConfigured: Boolean(BOT_TOKEN),
      checkedEmployees: employeesWithContacts.length,
      skippedCompletedUsers,
      sentHealthReminders,
      sentHealthEmailReminders,
      sentFollowUpReminders,
      sentFollowUpEmailReminders,
      emailFailures,
      followUpsFound: followUpsToday.length,
    });
  } catch (error) {
    console.error("Error running Telegram cron reminders:", error);
    return NextResponse.json({ error: "Cron execution failed" }, { status: 500 });
  }
}

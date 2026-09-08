import { prisma } from "@/lib/db";
import { calculateAcqHighAch, calculateAcqLowAch, calculateNewTotalAcqAch, calculateTotalDailyAch } from "@/lib/daily-report";
import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXTAUTH_URL || "https://vf-next-delta.vercel.app";

type TelegramReplyMarkup = Record<string, unknown>;
type LinkedTelegramUser = NonNullable<Awaited<ReturnType<typeof getLinkedUser>>>;

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

async function getLinkedUser(chatId: string | number) {
  return prisma.user.findFirst({
    where: { telegramChatId: chatId.toString(), isActive: true },
    include: { branch: true },
  });
}

function escapeHtml(value: string | null | undefined) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getEgyptDate(value = new Date()) {
  return new Date(value.toLocaleString("en-US", { timeZone: "Africa/Cairo" }));
}

function getTodayRange() {
  const egyptNow = getEgyptDate();
  const start = new Date(egyptNow.getFullYear(), egyptNow.getMonth(), egyptNow.getDate(), 0, 0, 0, 0);
  const end = new Date(egyptNow.getFullYear(), egyptNow.getMonth(), egyptNow.getDate(), 23, 59, 59, 999);

  return { start, end, label: start.toISOString().slice(0, 10) };
}

function getMonthRange() {
  const egyptNow = getEgyptDate();
  return {
    start: new Date(egyptNow.getFullYear(), egyptNow.getMonth(), 1, 0, 0, 0, 0),
    end: new Date(egyptNow.getFullYear(), egyptNow.getMonth() + 1, 0, 23, 59, 59, 999),
  };
}

function getCommand(text: string) {
  const firstToken = text.trim().split(/\s+/)[0] || "";
  return firstToken.split("@")[0].toLowerCase();
}

function getHelpText() {
  return `ℹ️ <b>VF-Next Bot Commands</b>\n\n` +
    `• <code>/help</code> - عرض الأوامر\n` +
    `• <code>/me</code> - بيانات حسابك والـ Store\n` +
    `• <code>/today</code> - حالة تقارير اليوم\n` +
    `• <code>/daily</code> - آخر Daily Report مرسل\n` +
    `• <code>/health</code> - Health Check اليوم\n` +
    `• <code>/rpm</code> - ملخص الشهر للموظف والـ Store\n` +
    `• <code>/cst</code> - آخر العملاء والمتابعات\n` +
    `• <code>/links</code> - روابط سريعة للموقع\n` +
    `• <code>/link CODE</code> - ربط الحساب بكود جديد`;
}

function getLinksText() {
  return `🔗 <b>VF-Next Quick Links</b>\n\n` +
    `Home:\n${APP_URL}\n\n` +
    `Daily Report:\n${APP_URL}/employee/daily-report\n\n` +
    `Health Check:\n${APP_URL}/employee/health-check\n\n` +
    `CST Data:\n${APP_URL}/employee/cst\n\n` +
    `SR & SKU:\n${APP_URL}/employee/sr-sku`;
}

async function buildTodayStatus(user: LinkedTelegramUser) {
  const { start, end, label } = getTodayRange();
  const [dailyReport, healthChecks, cstDueCount] = await Promise.all([
    prisma.dailyReport.findFirst({
      where: { employeeId: user.id, date: { gte: start, lte: end } },
      orderBy: { submittedAt: "desc" },
    }),
    prisma.healthCheck.findMany({
      where: { employeeId: user.id, date: { gte: start, lte: end } },
      orderBy: { shift: "asc" },
    }),
    prisma.cstCustomer.count({
      where: { agentId: user.id, followUpDate: { gte: start, lte: end } },
    }),
  ]);

  const shifts = healthChecks.map((item) => item.shift).join(", ") || "No shifts";
  const dailyStatus = dailyReport ? `Submitted (${dailyReport.totalDailyAch}/${49})` : "Not submitted";

  return `📌 <b>Today Status - ${label}</b>\n\n` +
    `User: <b>${escapeHtml(user.name)}</b>\n` +
    `Store: <b>${escapeHtml(user.branch?.name || "Not assigned")}</b>\n\n` +
    `Daily Report: <b>${dailyStatus}</b>\n` +
    `Health Check: <b>${healthChecks.length ? "Submitted" : "Not submitted"}</b> (${shifts})\n` +
    `CST follow-ups today: <b>${cstDueCount}</b>\n\n` +
    `Use <code>/links</code> to open submission pages.`;
}

async function buildDailyReportSummary(user: LinkedTelegramUser) {
  const report = await prisma.dailyReport.findFirst({
    where: { employeeId: user.id },
    orderBy: { submittedAt: "desc" },
  });

  if (!report) {
    return `📱 <b>Daily Report</b>\n\nNo daily report submitted yet.\n\nOpen:\n${APP_URL}/employee/daily-report`;
  }

  const totalLines = calculateTotalDailyAch({
    pre: report.pre,
    f52: report.f52,
    f80: report.f80,
    aboveF115: report.aboveF115,
    newVmt: 0,
    mnp: report.mnp,
    newRed: report.newRed,
    conRed: report.conRed,
  });

  return `📱 <b>Last Daily Report</b>\n\n` +
    `Date: <b>${report.date.toISOString().slice(0, 10)}</b>\n` +
    `Store: <b>${escapeHtml(report.storeName)}</b>\n` +
    `Total Daily Ach: <b>${report.totalDailyAch}/49</b>\n` +
    `Lines: <b>${totalLines}</b>\n` +
    `New VMT: <b>${report.newVmt}</b>\n` +
    `At Home Ach: <b>${report.atHomeAch}</b>\n` +
    `ADSL Ach: <b>${report.adslAch}</b>\n` +
    `Terminal Ach: <b>${report.terminalAch}</b>`;
}

async function buildHealthSummary(user: LinkedTelegramUser) {
  const { start, end, label } = getTodayRange();
  const records = await prisma.healthCheck.findMany({
    where: { employeeId: user.id, date: { gte: start, lte: end } },
    orderBy: { shift: "asc" },
  });

  if (!records.length) {
    return `🩺 <b>Health Check - ${label}</b>\n\nNo health check submitted today.\n\nOpen:\n${APP_URL}/employee/health-check`;
  }

  const lines = records.map((record) => {
    const total =
      record.line1Nid + record.line2Nid + record.line3Nid + record.line4Nid + record.line5Nid +
      record.line6Nid + record.line7Nid + record.line8Nid + record.line9Nid + record.line10Nid;

    return `<b>${record.shift}</b>: ${total} total NID lines ` +
      `(1L: ${record.line1Nid}, 2L: ${record.line2Nid}, 3L: ${record.line3Nid})`;
  });

  return `🩺 <b>Health Check - ${label}</b>\n\n${lines.join("\n")}`;
}

async function buildRpmSummary(user: LinkedTelegramUser) {
  const { start, end } = getMonthRange();
  const reports = await prisma.dailyReport.findMany({
    where: {
      employeeId: user.id,
      date: { gte: start, lte: end },
    },
  });

  let totalPre = 0;
  let totalF52 = 0;
  let totalF80 = 0;
  let totalAboveF115 = 0;
  let totalNewRed = 0;
  let totalConRed = 0;
  let totalMnp = 0;
  let totalExitVmt = 0;
  let totalNewVmt = 0;
  let totalAtHomeAch = 0;
  let totalAdslAch = 0;
  let totalTerminalAch = 0;
  let totalEnterpriseNewAcc = 0;
  let totalEnterpriseGas = 0;

  reports.forEach((report) => {
    totalPre += report.pre;
    totalF52 += report.f52;
    totalF80 += report.f80;
    totalAboveF115 += report.aboveF115;
    totalNewRed += report.newRed;
    totalConRed += report.conRed;
    totalMnp += report.mnp;
    totalExitVmt += report.exitVmt;
    totalNewVmt += report.newVmt;
    totalAtHomeAch += report.atHomeAch;
    totalAdslAch += report.adslAch;
    totalTerminalAch += report.terminalAch;
    totalEnterpriseNewAcc += report.enterpriseNewAcc;
    totalEnterpriseGas += report.enterpriseGas;
  });

  const personalTotals = {
    pre: totalPre,
    f52: totalF52,
    f80: totalF80,
    aboveF115: totalAboveF115,
    newRed: totalNewRed,
    conRed: totalConRed,
    newVmt: totalNewVmt,
  };
  const acqLowAch = calculateAcqLowAch(personalTotals);
  const acqHighAch = calculateAcqHighAch(personalTotals);
  const totalAcqAch = calculateNewTotalAcqAch(personalTotals);
  const averageDailyAcq = reports.length ? (totalAcqAch / reports.length).toFixed(1) : "0";

  let responseText = `📊 <b>${escapeHtml(user.name)} RPM (Monthly)</b>\n\n` +
    `Days submitted: <b>${reports.length}</b>\n` +
    `Average daily Acq: <b>${averageDailyAcq}</b>\n\n` +
    `<b>Acquisition Box</b>\n` +
    `Acq Low: <b>${acqLowAch}</b> (Pre ${totalPre} + F52 ${totalF52} + F80 ${totalF80} + Con Red ${totalConRed})\n` +
    `Acq High: <b>${acqHighAch}</b> (Above F115 ${totalAboveF115} + New Red ${totalNewRed})\n` +
    `Cash New: <b>${totalNewVmt}</b>\n` +
    `Total Acq: <b>${totalAcqAch}</b>\n\n` +
    `<b>Other Details</b>\n` +
    `MNP: <b>${totalMnp}</b>\n` +
    `Exit VMT: <b>${totalExitVmt}</b>\n` +
    `Terminal: <b>${totalTerminalAch}</b>\n` +
    `Connectivity/At Home: <b>${totalAtHomeAch}</b>\n` +
    `DSL SR: <b>${totalAdslAch}</b>\n` +
    `Enterprise New Account: <b>${totalEnterpriseNewAcc}</b>\n` +
    `Infollow GA: <b>${totalEnterpriseGas}</b>\n`;

  if (user.branchId && user.branch) {
    const storeReports = await prisma.dailyReport.findMany({
      where: {
        branchId: user.branchId,
        date: { gte: start, lte: end },
      },
    });

    let storePre = 0;
    let storeF52 = 0;
    let storeF80 = 0;
    let storeAboveF115 = 0;
    let storeNewRed = 0;
    let storeConRed = 0;
    let storeNewVmt = 0;
    let storeAtHomeAch = 0;
    let storeTerminalAch = 0;
    storeReports.forEach((report) => {
      storePre += report.pre;
      storeF52 += report.f52;
      storeF80 += report.f80;
      storeAboveF115 += report.aboveF115;
      storeNewRed += report.newRed;
      storeConRed += report.conRed;
      storeNewVmt += report.newVmt;
      storeAtHomeAch += report.atHomeAch;
      storeTerminalAch += report.terminalAch;
    });

    const storeTotals = {
      pre: storePre,
      f52: storeF52,
      f80: storeF80,
      aboveF115: storeAboveF115,
      newRed: storeNewRed,
      conRed: storeConRed,
      newVmt: storeNewVmt,
    };

    responseText += `\n🏪 <b>Store RPM (${escapeHtml(user.branch.name)}):</b>\n` +
      `Store reports: <b>${storeReports.length}</b>\n` +
      `Store Acq Low: <b>${calculateAcqLowAch(storeTotals)}</b>\n` +
      `Store Acq High: <b>${calculateAcqHighAch(storeTotals)}</b>\n` +
      `Store Cash New: <b>${storeNewVmt}</b>\n` +
      `Store Total Acq: <b>${calculateNewTotalAcqAch(storeTotals)}</b>\n` +
      `Store Connectivity: <b>${storeAtHomeAch}</b>\n` +
      `Store Terminal: <b>${storeTerminalAch}</b>`;
  }

  return responseText;
}

async function buildCstSummary(user: LinkedTelegramUser) {
  const { start, end } = getTodayRange();
  const customers = await prisma.cstCustomer.findMany({
    where: { agentId: user.id },
    orderBy: [
      { followUpDate: "asc" },
      { createdAt: "desc" },
    ],
    take: 10,
  });

  if (customers.length === 0) {
    return "👥 You don't have any customers registered in CST Data yet.";
  }

  let msg = `👥 <b>Your CST Customers (Nearest 10)</b>\n\n`;
  customers.forEach((customer, index) => {
    const followUp = customer.followUpDate ? customer.followUpDate.toISOString().slice(0, 10) : null;
    const isToday = customer.followUpDate ? customer.followUpDate >= start && customer.followUpDate <= end : false;

    msg += `${index + 1}. <b>${escapeHtml(customer.name)}</b> (${escapeHtml(customer.serviceType)})\n` +
      `Phone: <code>${escapeHtml(customer.phone)}</code> | Status: ${escapeHtml(customer.status)}\n` +
      (followUp ? `Follow-up: <b>${followUp}</b> ${isToday ? "(TODAY)" : ""}\n` : "") +
      `-------------------------------\n`;
  });

  return msg;
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
    const command = getCommand(text);

    // 1) /start command
    if (command === "/start") {
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
        getHelpText();

      await sendTelegramMessage(chatId, welcomeText);
      return NextResponse.json({ ok: true });
    }

    // 2) /link <code> command
    if (command === "/link") {
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
    const user = await getLinkedUser(chatId);

    if (!user) {
      await sendTelegramMessage(chatId, "⚠️ <b>Account Not Linked!</b>\nPlease link your VF-Next account first by sending <code>/link &lt;code&gt;</code>.");
      return NextResponse.json({ ok: true });
    }

    if (command === "/help" || command === "/commands") {
      await sendTelegramMessage(chatId, getHelpText());
      return NextResponse.json({ ok: true });
    }

    if (command === "/me" || command === "/profile") {
      await sendTelegramMessage(chatId,
        `👤 <b>VF-Next Account</b>\n\n` +
        `Name: <b>${escapeHtml(user.name)}</b>\n` +
        `Role: <b>${escapeHtml(user.role)}</b>\n` +
        `Store: <b>${escapeHtml(user.branch?.name || "Not assigned")}</b>\n` +
        `Username: <code>${escapeHtml(user.username || "-")}</code>\n` +
        `VPN: <code>${escapeHtml(user.vpnNum || "-")}</code>`
      );
      return NextResponse.json({ ok: true });
    }

    if (command === "/today" || command === "/status") {
      await sendTelegramMessage(chatId, await buildTodayStatus(user));
      return NextResponse.json({ ok: true });
    }

    if (command === "/daily" || command === "/report") {
      await sendTelegramMessage(chatId, await buildDailyReportSummary(user));
      return NextResponse.json({ ok: true });
    }

    if (command === "/health") {
      await sendTelegramMessage(chatId, await buildHealthSummary(user));
      return NextResponse.json({ ok: true });
    }

    if (command === "/rpm") {
      await sendTelegramMessage(chatId, await buildRpmSummary(user));
      return NextResponse.json({ ok: true });
    }

    if (command === "/cst" || command === "/customer" || command === "/customers") {
      await sendTelegramMessage(chatId, await buildCstSummary(user));
      return NextResponse.json({ ok: true });
    }

    if (command === "/links") {
      await sendTelegramMessage(chatId, getLinksText());
      return NextResponse.json({ ok: true });
    }

    await sendTelegramMessage(chatId, `لم أفهم الأمر.\n\n${getHelpText()}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error in Telegram Webhook:", error);
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}

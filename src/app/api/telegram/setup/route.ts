import { NextRequest, NextResponse } from "next/server";

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const APP_URL = process.env.NEXTAUTH_URL || "https://vf-next-delta.vercel.app";

const commands = [
  { command: "help", description: "Show available VF-Next commands" },
  { command: "me", description: "Show linked account and store" },
  { command: "today", description: "Show today's submission status" },
  { command: "daily", description: "Show last daily report summary" },
  { command: "health", description: "Show today's health check summary" },
  { command: "shift_today", description: "Show today's store shift schedule" },
  { command: "shift_tomorrow", description: "Show tomorrow's store shift schedule" },
  { command: "vacations", description: "Show monthly OFF and ANN summary" },
  { command: "rpm", description: "Show monthly RPM summary" },
  { command: "cst", description: "Show customer follow-ups" },
  { command: "links", description: "Show quick VF-Next links" },
];

async function callTelegram(method: string, body: Record<string, unknown>) {
  if (!BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await response.json() as { ok?: boolean; description?: string };
  if (!response.ok || !data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }

  return data;
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const webhookUrl = `${APP_URL.replace(/\/$/, "")}/api/telegram/webhook`;
    const [commandsResult, webhookResult] = await Promise.all([
      callTelegram("setMyCommands", { commands }),
      callTelegram("setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message"],
      }),
    ]);

    return NextResponse.json({
      ok: true,
      webhookUrl,
      commands: commands.map((item) => item.command),
      commandsResult,
      webhookResult,
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Telegram setup failed",
    }, { status: 500 });
  }
}

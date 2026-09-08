import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const testEmailSchema = z.object({
  to: z.string().email().optional(),
});

function isCronAuthorized(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  return Boolean(process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  const cronAuthorized = isCronAuthorized(req);

  if (!cronAuthorized && (!session || session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = testEmailSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const to = parsed.data.to || session?.user.email;
  if (!to) {
    return NextResponse.json({ error: "Send a test recipient in the `to` field" }, { status: 400 });
  }

  const result = await sendEmail({
    to,
    subject: "VF-Next Email Test",
    text: "VF-Next email reminders are connected successfully.",
    html:
      "<div style=\"font-family:Arial,sans-serif;line-height:1.6\">" +
      "<h2>VF-Next Email Test</h2>" +
      "<p>Email reminders are connected successfully.</p>" +
      "<p>You can now use Resend for employee reminders.</p>" +
      "</div>",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.reason || result.error || "Email failed", result }, { status: 500 });
  }

  return NextResponse.json({ success: true, id: result.id });
}

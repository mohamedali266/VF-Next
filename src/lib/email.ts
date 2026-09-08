type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

type SendEmailResult =
  | { ok: true; id: string | null }
  | { ok: false; skipped?: boolean; reason?: string; status?: number; error?: string };

const RESEND_API_URL = "https://api.resend.com/emails";

function getEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    from: process.env.RESEND_FROM_EMAIL || "VF-Next <onboarding@resend.dev>",
    enabled: process.env.EMAIL_REMINDERS_ENABLED !== "false",
  };
}

function normalizeRecipients(to: string | string[]) {
  return Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
}

export function isEmailConfigured() {
  const config = getEmailConfig();
  return Boolean(config.enabled && config.apiKey && config.from);
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const config = getEmailConfig();
  const recipients = normalizeRecipients(input.to);

  if (!config.enabled) {
    return { ok: false, skipped: true, reason: "Email reminders are disabled" };
  }

  if (!config.apiKey) {
    return { ok: false, skipped: true, reason: "RESEND_API_KEY is not configured" };
  }

  if (!config.from) {
    return { ok: false, skipped: true, reason: "RESEND_FROM_EMAIL is not configured" };
  }

  if (recipients.length === 0) {
    return { ok: false, skipped: true, reason: "No recipients provided" };
  }

  try {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.from,
        to: recipients,
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const message =
        typeof payload?.message === "string"
          ? payload.message
          : typeof payload?.error === "string"
            ? payload.error
            : "Resend request failed";

      console.error("Resend email failed:", {
        status: response.status,
        error: message,
      });

      return { ok: false, status: response.status, error: message };
    }

    return { ok: true, id: typeof payload?.id === "string" ? payload.id : null };
  } catch (error) {
    console.error("Failed to send Resend email:", error);
    return { ok: false, error: "Failed to send email" };
  }
}

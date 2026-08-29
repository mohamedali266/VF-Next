"use client";

import { CheckCircle2, Copy, ExternalLink, Loader2, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

type TelegramCodeResponse = {
  isLinked?: boolean;
  telegramChatId?: string;
  code?: string;
  botUsername?: string | null;
  botUrl?: string | null;
  error?: string;
};

export default function TelegramLinkModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [isLinked, setIsLinked] = useState(false);
  const [code, setCode] = useState("");
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [botUsername, setBotUsername] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const deepLinkUrl = botUrl && code ? `${botUrl}?start=link_${code}` : botUrl;

  async function loadTelegramCode(method: "GET" | "POST" = "GET") {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/me/telegram-code", { method });
      const data = (await res.json()) as TelegramCodeResponse;

      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to load Telegram link code");
      }

      setBotUrl(data.botUrl || null);
      setBotUsername(data.botUsername || null);
      setIsLinked(Boolean(data.isLinked));
      setCode(data.code || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load Telegram link code");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      void loadTelegramCode();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [isOpen]);

  async function handleRefresh() {
    await loadTelegramCode("POST");
  }

  async function handleCopy() {
    if (!code) return;
    await navigator.clipboard.writeText(`/link ${code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isOpen) return null;

  return (
    <div className="daily-modal" onClick={onClose}>
      <div
        className="daily-modal-card animate-fade-up"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "420px" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Send size={20} style={{ color: "#38bdf8" }} />
            <h3 style={{ fontSize: "1.0625rem", fontWeight: "800", color: "#fff" }}>
              ربط حساب تليجرام
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "var(--vf-surface-2)",
              border: "1px solid var(--vf-border)",
              borderRadius: "50%",
              width: 32,
              height: 32,
              cursor: "pointer",
              color: "var(--vf-text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <Loader2 className="daily-spin" size={28} style={{ margin: "0 auto", color: "#38bdf8" }} />
          </div>
        ) : error ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "1rem" }}>
            <div className="vf-alert vf-alert-error">
              <span>!</span>
              <span>تعذر تحميل بيانات ربط تليجرام: {error}</span>
            </div>
            <button
              type="button"
              onClick={() => void loadTelegramCode()}
              className="vf-btn vf-btn-primary vf-btn-md"
            >
              <RefreshCw size={14} />
              إعادة المحاولة
            </button>
          </div>
        ) : isLinked ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
            <CheckCircle2 size={48} style={{ color: "#22c55e" }} />
            <h4 style={{ color: "#fff", fontWeight: "800", fontSize: "1.1rem" }}>تم ربط حسابك بنجاح!</h4>
            <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)", lineHeight: 1.6 }}>
              حساب التليجرام الخاص بك مرتبط بالنظام. ستصلك التنبيهات ويمكنك طلب البيانات والـ RPM مباشرة من البوت.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginTop: "0.75rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)", lineHeight: 1.6 }}>
              لربط حسابك ووصول التنبيهات، افتح البوت وأرسل الأمر التالي:
            </p>

            {botUrl ? (
              <a
                href={deepLinkUrl || botUrl}
                target="_blank"
                rel="noreferrer"
                className="vf-btn vf-btn-primary vf-btn-md"
                style={{ justifyContent: "center", textDecoration: "none" }}
              >
                <ExternalLink size={16} />
                فتح وربط بوت تليجرام {botUsername ? `@${botUsername}` : ""}
              </a>
            ) : (
              <div className="vf-alert vf-alert-error">
                <span>!</span>
                <span>اسم بوت تليجرام غير مضبوط في إعدادات السيرفر. أضف TELEGRAM_BOT_USERNAME في Vercel.</span>
              </div>
            )}

            <div style={{
              background: "var(--vf-surface-2)",
              border: "1px dashed #38bdf8",
              borderRadius: "14px",
              padding: "1rem",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              alignItems: "center"
            }}>
              <span style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)" }}>كود الربط المباشر:</span>
              <div style={{ fontSize: "1.75rem", fontWeight: "900", letterSpacing: "0.15em", color: "#38bdf8" }}>
                {code}
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="vf-btn vf-btn-ghost vf-btn-sm"
                style={{ color: copied ? "#22c55e" : "#38bdf8" }}
              >
                <Copy size={14} />
                {copied ? "تم النسخ (/link)" : "نسخ الأمر (/link " + code + ")"}
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--vf-text-2)" }}>
                <span>1️⃣</span> افتح بوت التليجرام الخاص بالنظام.
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--vf-text-2)" }}>
                <span>2️⃣</span> أرسل الرسالة التالية للـ Bot: <code style={{ background: "#000", padding: "0.2rem 0.4rem", borderRadius: "6px", color: "#38bdf8" }}>/link {code}</code>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.5rem" }}>
              <button
                type="button"
                onClick={handleRefresh}
                className="vf-btn vf-btn-ghost vf-btn-sm"
                style={{ color: "var(--vf-text-muted)" }}
              >
                <RefreshCw size={14} />
                توليد كود جديد
              </button>
              <button className="vf-btn vf-btn-primary vf-btn-md" onClick={onClose}>
                تم
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

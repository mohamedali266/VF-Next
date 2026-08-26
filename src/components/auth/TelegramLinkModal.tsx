"use client";

import { CheckCircle2, Copy, Loader2, RefreshCw, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

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
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch("/api/me/telegram-code")
      .then((r) => r.json())
      .then((d) => {
        if (d.isLinked) {
          setIsLinked(true);
        } else {
          setIsLinked(false);
          setCode(d.code || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen]);

  async function handleRefresh() {
    setLoading(true);
    try {
      const res = await fetch("/api/me/telegram-code", { method: "POST" });
      const d = await res.json();
      if (d.code) setCode(d.code);
    } catch {}
    setLoading(false);
  }

  function handleCopy() {
    if (!code) return;
    navigator.clipboard.writeText(`/link ${code}`);
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

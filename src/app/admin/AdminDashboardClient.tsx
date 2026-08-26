"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound, Send } from "lucide-react";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";
import TelegramLinkModal from "@/components/auth/TelegramLinkModal";

type StatItem = {
  icon: string;
  label: string;
  value: number;
  color: string;
};

type ActionItem = {
  icon: string;
  title: string;
  sub: string;
  href: string;
  color: string;
  border: string;
};

type Props = {
  userName: string;
  todayText: string;
  stats: StatItem[];
  actions: ActionItem[];
};

export default function AdminDashboardClient({ userName, todayText, stats, actions }: Props) {
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [telegramModalOpen, setTelegramModalOpen] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-muted)" }}>{todayText}</p>
      </div>

      <div className="vf-card animate-fade-up animate-fade-up-delay-1" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.2) 0%, rgba(26,26,26,1) 60%)",
        borderColor: "rgba(196,30,58,0.35)",
        position: "relative",
        overflow: "hidden",
      }}>
        <p style={{ fontSize: "1.125rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Welcome, {userName}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)" }}>
          You have full VF-Next administration permissions.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "0.75rem" }}>
        {stats.map((s, idx) => (
          <div key={s.label} className={`vf-card animate-fade-up animate-fade-up-delay-${idx + 1}`} style={{
            padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.375rem",
            borderColor: "rgba(255,255,255,0.06)",
          }}>
            <span style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)" }}>{s.label}</span>
            <span style={{ fontSize: "1.5rem", fontWeight: "900", color: s.color, lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Actions Grid */}
      <div>
        <div className="vf-section-header">
          <span className="vf-section-title">Admin Management</span>
          <div className="vf-section-line" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          {actions.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className={`vf-card animate-fade-up animate-fade-up-delay-${index + 1}`} style={{
                minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "space-between",
                borderColor: item.border, background: item.color,
              }}>
                <div className="vf-number-badge" style={{ width: 40, height: 40 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>{item.sub}</div>
                </div>
              </div>
            </Link>
          ))}

          {/* Telegram Bot Card */}
          <div
            onClick={() => setTelegramModalOpen(true)}
            className="vf-card animate-fade-up"
            style={{
              minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "space-between",
              borderColor: "rgba(56,189,248,0.3)", background: "linear-gradient(135deg, rgba(56,189,248,0.08), var(--vf-surface))",
              cursor: "pointer",
            }}
          >
            <div className="vf-number-badge" style={{ width: 40, height: 40, color: "#38bdf8" }}>
              <Send size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>Telegram Bot</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>ربط حساب التليجرام والتنبيهات</div>
            </div>
          </div>

          {/* Reset Password Card */}
          <div
            onClick={() => setResetModalOpen(true)}
            className="vf-card animate-fade-up"
            style={{
              minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "space-between",
              borderColor: "rgba(245,158,11,0.3)", background: "linear-gradient(135deg, rgba(245,158,11,0.08), var(--vf-surface))",
              cursor: "pointer",
            }}
          >
            <div className="vf-number-badge" style={{ width: 40, height: 40, color: "#f59e0b" }}>
              <KeyRound size={20} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>Reset Password</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>تغيير كلمة السر للحساب</div>
            </div>
          </div>
        </div>
      </div>

      <ResetPasswordModal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} />
      <TelegramLinkModal isOpen={telegramModalOpen} onClose={() => setTelegramModalOpen(false)} />
    </div>
  );
}

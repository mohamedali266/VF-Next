"use client";

import Link from "next/link";
import { useState } from "react";
import { KeyRound } from "lucide-react";
import ResetPasswordModal from "@/components/auth/ResetPasswordModal";

type DashboardProps = {
  userName: string;
  todayText: string;
  branchId?: string | null;
};

export default function EmployeeDashboardClient({ userName, todayText, branchId }: DashboardProps) {
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const actions = [
    // 1) My Store (FIRST if branchId exists)
    ...(branchId ? [{
      id: "store",
      icon: "🏪",
      title: "My Store",
      sub: "View team, SMS & health report",
      href: `/store/${branchId}`,
    }] : []),
    {
      id: "daily",
      icon: "SMS",
      title: "Daily Report",
      sub: "Submit daily SMS values",
      href: "/employee/daily-report",
    },
    {
      id: "health",
      icon: "HC",
      title: "Health Check",
      sub: "Submit NID lines",
      href: "/employee/health-check",
    },
    {
      id: "cst",
      icon: "👥",
      title: "CST Data",
      sub: "Private customer follow-up",
      href: "/employee/cst",
    },
    {
      id: "srsku",
      icon: "📋",
      title: "SR & SKU",
      sub: "Service Requests & SKU directory",
      href: "/employee/sr-sku",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="vf-card animate-fade-up" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.15) 0%, rgba(26,26,26,1) 60%)",
        borderColor: "rgba(196,30,58,0.25)",
      }}>
        <p style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginBottom: "0.25rem" }}>{todayText}</p>
        <h2 style={{ fontSize: "1.375rem", fontWeight: "800", color: "#fff", marginBottom: "0.375rem" }}>
          Welcome, {userName}
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--vf-text-2)" }}>
          Choose the report or tool you want to access today.
        </p>
      </div>

      <div>
        <div className="vf-section-header">
          <span className="vf-section-title">Quick Access</span>
          <div className="vf-section-line" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          {actions.map((item, index) => (
            <Link key={item.id} href={item.href} style={{ textDecoration: "none" }}>
              <div className={`vf-card animate-fade-up animate-fade-up-delay-${index + 1}`} style={{
                minHeight: 140,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderColor: item.id === "store" ? "rgba(196,30,58,0.4)" : "rgba(196,30,58,0.2)",
                background: item.id === "store" ? "linear-gradient(135deg, rgba(196,30,58,0.12), var(--vf-surface))" : undefined,
              }}>
                <div className="vf-number-badge" style={{ width: 42, height: 42 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>{item.sub}</div>
                </div>
              </div>
            </Link>
          ))}

          {/* Reset Password Card */}
          <div
            onClick={() => setResetModalOpen(true)}
            className="vf-card animate-fade-up"
            style={{
              minHeight: 140,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              borderColor: "rgba(245,158,11,0.3)",
              background: "linear-gradient(135deg, rgba(245,158,11,0.08), var(--vf-surface))",
              cursor: "pointer",
            }}
          >
            <div className="vf-number-badge" style={{ width: 42, height: 42, color: "#f59e0b" }}>
              <KeyRound size={22} />
            </div>
            <div>
              <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>
                Reset Password
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>
                تغيير كلمة السر للحساب
              </div>
            </div>
          </div>
        </div>
      </div>

      <ResetPasswordModal isOpen={resetModalOpen} onClose={() => setResetModalOpen(false)} />
    </div>
  );
}

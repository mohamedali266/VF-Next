"use client";

import { useCallback, useEffect, useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

type Member = {
  id: string;
  name: string;
  role: Role;
  staffId: string | null;
  vpnNum: string | null;
};

type DailyReport = {
  id: string;
  date: string;
  pre: number;
  f52: number;
  f80: number;
  aboveF115: number;
  newVmt: number;
  exitVmt: number;
  newRed: number;
  conRed: number;
  mnp: number;
  atHomeCount: number;
  atHomeAch: number;
  adslAch: number;
  terminalAch: number;
  enterpriseNewAcc: number;
  enterpriseGas: number;
  totalDailyAch: number;
  employee: { id: string; name: string };
};

type StoreData = {
  branch: { id: string; name: string; code: string | null };
  members: Member[];
  dailyReports: DailyReport[];
  monthlyReports: DailyReport[];
  lastMonthReports: DailyReport[];
  lastMonthExpired: boolean;
  currentMonthLabel: string;
  lastMonthLabel: string;
  smsMessage: string;
  healthReport: string;
  reportsCount: number;
  checksCount: number;
  date: string;
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  EMPLOYEE: "Agent",
};

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "var(--vf-red-light)",
  MANAGER: "#f59e0b",
  TEAM_LEADER: "#8b5cf6",
  EMPLOYEE: "var(--vf-text-2)",
};

type Tab = "team" | "sms" | "health" | "rpm" | "lastMonth";

export default function StoreClient({ storeId }: { storeId: string }) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<StoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("team");
  const [copied, setCopied] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/store/${storeId}?date=${date}`);
      if (!res.ok) throw new Error((await res.json()).error || "Failed to load");
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error loading store data");
    }
    setLoading(false);
  }, [storeId, date]);

  useEffect(() => { void load(); }, [load]);

  async function copyText(text: string, label: string) {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(""), 2500);
  }

  if (error) return (
    <div className="vf-card" style={{ textAlign: "center", padding: "2.5rem", color: "var(--vf-red-light)" }}>
      ⚠️ {error}
    </div>
  );

  const sortedMembers = data ? [...data.members].sort((a, b) => {
    const order: Role[] = ["MANAGER", "TEAM_LEADER", "EMPLOYEE", "ADMIN"];
    return order.indexOf(a.role) - order.indexOf(b.role);
  }) : [];

  // Helper to aggregate reports for Store RPM and per-employee RPM
  function calculateRpm(reportsList: DailyReport[]) {
    const storeTotals = reportsList.reduce(
      (acc, r) => {
        const lines = (r.pre + r.f52 + r.f80 + r.aboveF115) + r.mnp + (r.newRed * 3) + r.conRed;
        const acq = lines + r.newVmt;
        acc.lines += lines;
        acc.newVmt += r.newVmt;
        acc.acquisition += acq;
        acc.atHomeAch += r.atHomeAch;
        acc.adslAch += r.adslAch;
        acc.terminalAch += r.terminalAch;
        acc.enterpriseNewAcc += r.enterpriseNewAcc;
        acc.enterpriseGas += r.enterpriseGas;
        acc.pre += r.pre;
        acc.f52 += r.f52;
        acc.f80 += r.f80;
        acc.aboveF115 += r.aboveF115;
        acc.newRed += r.newRed;
        acc.conRed += r.conRed;
        acc.mnp += r.mnp;
        return acc;
      },
      {
        lines: 0,
        newVmt: 0,
        acquisition: 0,
        atHomeAch: 0,
        adslAch: 0,
        terminalAch: 0,
        enterpriseNewAcc: 0,
        enterpriseGas: 0,
        pre: 0,
        f52: 0,
        f80: 0,
        aboveF115: 0,
        newRed: 0,
        conRed: 0,
        mnp: 0,
      }
    );

    // Group by employee
    const empMap = new Map<string, {
      name: string;
      reportsCount: number;
      lines: number;
      newVmt: number;
      acquisition: number;
      atHomeAch: number;
      adslAch: number;
      terminalAch: number;
      enterpriseNewAcc: number;
      enterpriseGas: number;
      pre: number;
      f52: number;
      f80: number;
      aboveF115: number;
      newRed: number;
      conRed: number;
      mnp: number;
    }>();

    reportsList.forEach((r) => {
      const empId = r.employee.id;
      const empName = r.employee.name;
      const lines = (r.pre + r.f52 + r.f80 + r.aboveF115) + r.mnp + (r.newRed * 3) + r.conRed;
      const acq = lines + r.newVmt;

      const existing = empMap.get(empId) || {
        name: empName,
        reportsCount: 0,
        lines: 0,
        newVmt: 0,
        acquisition: 0,
        atHomeAch: 0,
        adslAch: 0,
        terminalAch: 0,
        enterpriseNewAcc: 0,
        enterpriseGas: 0,
        pre: 0,
        f52: 0,
        f80: 0,
        aboveF115: 0,
        newRed: 0,
        conRed: 0,
        mnp: 0,
      };

      existing.reportsCount += 1;
      existing.lines += lines;
      existing.newVmt += r.newVmt;
      existing.acquisition += acq;
      existing.atHomeAch += r.atHomeAch;
      existing.adslAch += r.adslAch;
      existing.terminalAch += r.terminalAch;
      existing.enterpriseNewAcc += r.enterpriseNewAcc;
      existing.enterpriseGas += r.enterpriseGas;
      existing.pre += r.pre;
      existing.f52 += r.f52;
      existing.f80 += r.f80;
      existing.aboveF115 += r.aboveF115;
      existing.newRed += r.newRed;
      existing.conRed += r.conRed;
      existing.mnp += r.mnp;

      empMap.set(empId, existing);
    });

    return { storeTotals, empBreakdown: Array.from(empMap.values()) };
  }

  const currentMonthRpm = calculateRpm(data?.monthlyReports || []);
  const lastMonthRpm = calculateRpm(data?.lastMonthReports || []);

  // Distinct days in current month with reports
  const currentMonthDays = new Set((data?.monthlyReports || []).map((r) => r.date)).size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

      {/* Header */}
      <div className="animate-fade-up">
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontSize: "1.375rem" }}>🏪</span>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff" }}>
            {data?.branch.name ?? "Store"}
          </h1>
          {data?.branch.code && (
            <span style={{
              fontSize: "0.625rem", fontWeight: "800", padding: "0.125rem 0.5rem",
              borderRadius: "999px", background: "rgba(196,30,58,0.15)",
              border: "1px solid rgba(196,30,58,0.3)", color: "var(--vf-red-light)",
            }}>{data.branch.code}</span>
          )}
        </div>
        <div style={{ display: "flex", gap: "1rem", fontSize: "0.75rem", color: "var(--vf-text-muted)" }}>
          <span>👥 {data?.members.length ?? "—"} members</span>
        </div>
      </div>

      {/* Date Picker */}
      <div className="vf-card animate-fade-up animate-fade-up-delay-1"
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--vf-text-2)", whiteSpace: "nowrap" }}>
          📅 Date
        </label>
        <input
          type="date"
          className="vf-input"
          style={{ flex: 1, padding: "0.5rem 0.75rem", textAlign: "center" }}
          value={date}
          max={new Date().toISOString().slice(0, 10)}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "0.375rem", background: "var(--vf-surface-2)", borderRadius: "16px", padding: "0.375rem", overflowX: "auto" }}>
        {(
          [
            ["team", "👥 Team"],
            ["sms", "📱 SMS"],
            ["health", "🏥 Health"],
            ["rpm", "📊 Store RPM"],
            ["lastMonth", "🗓️ Last Month"],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              whiteSpace: "nowrap",
              padding: "0.625rem 0.5rem",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.78125rem",
              fontWeight: "700",
              fontFamily: "inherit",
              transition: "all 0.2s",
              background: tab === id
                ? "linear-gradient(135deg, var(--vf-red), var(--vf-red-dark))"
                : "transparent",
              color: tab === id ? "#fff" : "var(--vf-text-muted)",
              boxShadow: tab === id ? "0 2px 8px rgba(196,30,58,0.3)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="vf-card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "3px solid var(--vf-border)", borderTopColor: "var(--vf-red)",
            animation: "spin 0.8s linear infinite", margin: "0 auto",
          }} />
          <p style={{ color: "var(--vf-text-muted)", marginTop: "0.75rem", fontSize: "0.875rem" }}>Loading...</p>
        </div>
      )}

      {/* ── TAB: Team ── */}
      {!loading && tab === "team" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} className="animate-fade-up">
          {sortedMembers.length === 0 ? (
            <div className="vf-card" style={{ textAlign: "center", padding: "2rem", color: "var(--vf-text-muted)" }}>
              No team members assigned to this store
            </div>
          ) : (
            sortedMembers.map((m) => (
              <div key={m.id} className="vf-card" style={{
                display: "flex", alignItems: "center", gap: "0.875rem", padding: "0.875rem 1rem"
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: `${ROLE_COLORS[m.role]}20`,
                  border: `2px solid ${ROLE_COLORS[m.role]}40`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.875rem", fontWeight: "800", color: ROLE_COLORS[m.role],
                }}>
                  {m.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.9375rem", fontWeight: "700", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.name}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                    {m.staffId && `#${m.staffId}`} {m.vpnNum && `· VPN ${m.vpnNum}`}
                  </div>
                </div>
                <span style={{
                  fontSize: "0.625rem", fontWeight: "800", padding: "0.2rem 0.5rem",
                  borderRadius: "999px", whiteSpace: "nowrap",
                  background: `${ROLE_COLORS[m.role]}15`,
                  border: `1px solid ${ROLE_COLORS[m.role]}30`,
                  color: ROLE_COLORS[m.role],
                }}>
                  {ROLE_LABELS[m.role]}
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── TAB: SMS ── */}
      {!loading && tab === "sms" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="vf-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#fff" }}>📱 Final SMS Message</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                {data?.reportsCount ?? 0} reports aggregated · Read-only
              </div>
            </div>
            <button
              className="vf-btn vf-btn-primary vf-btn-md"
              disabled={!data?.smsMessage || !data.reportsCount}
              onClick={() => data?.smsMessage && copyText(data.smsMessage, "sms")}
            >
              {copied === "sms" ? "✅ Copied!" : "Copy SMS"}
            </button>
          </div>

          {!data?.reportsCount ? (
            <div className="vf-card" style={{
              textAlign: "center", padding: "2rem",
              borderStyle: "dashed", color: "var(--vf-text-muted)"
            }}>
              No daily reports submitted for this date
            </div>
          ) : (
            <div className="vf-card" style={{ padding: 0, overflow: "hidden" }}>
              <textarea
                readOnly
                value={data?.smsMessage ?? ""}
                style={{
                  display: "block", width: "100%", minHeight: "320px",
                  background: "transparent", border: "none", outline: "none",
                  color: "var(--vf-text)", fontFamily: "monospace", fontSize: "0.8125rem",
                  lineHeight: 1.7, padding: "1.25rem", resize: "none",
                  cursor: "default",
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Health ── */}
      {!loading && tab === "health" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="vf-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.75rem" }}>
            <div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "#fff" }}>🏥 Health Report</div>
              <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                {data?.checksCount ?? 0} health checks · Read-only
              </div>
            </div>
            <button
              className="vf-btn vf-btn-primary vf-btn-md"
              disabled={!data?.healthReport || !data.checksCount}
              onClick={() => data?.healthReport && copyText(data.healthReport, "health")}
            >
              {copied === "health" ? "✅ Copied!" : "Copy Report"}
            </button>
          </div>

          {!data?.checksCount ? (
            <div className="vf-card" style={{
              textAlign: "center", padding: "2rem",
              borderStyle: "dashed", color: "var(--vf-text-muted)"
            }}>
              No health checks submitted for this date
            </div>
          ) : (
            <div className="vf-card" style={{ padding: 0, overflow: "hidden" }}>
              <pre style={{
                display: "block", width: "100%",
                background: "transparent", border: "none",
                color: "var(--vf-text)", fontFamily: "monospace", fontSize: "0.8125rem",
                lineHeight: 1.7, padding: "1.25rem", margin: 0,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {data?.healthReport}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Store RPM (Current Month Cumulative) ── */}
      {!loading && tab === "rpm" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {/* 1) Store Total RPM Summary */}
          <div className="vf-card" style={{
            background: "linear-gradient(135deg, rgba(196,30,58,0.18), var(--vf-surface))",
            borderColor: "rgba(196,30,58,0.4)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>
                  📊 Store RPM — {data?.currentMonthLabel}
                </h3>
                <p style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                  تراكمي من أول الشهر حتى اليوم ({currentMonthDays} أيام مسجلة) · يصفر تلقائياً بداية الشهر
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
              <div style={{ background: "rgba(196,30,58,0.2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid rgba(196,30,58,0.4)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-red-light)", fontWeight: "600" }}>Acquisition</div>
                <div style={{ fontSize: "1.375rem", fontWeight: "800", color: "#fff", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.acquisition}
                </div>
              </div>
              <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Lines (F+MNP+Red)</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.lines}
                </div>
              </div>
              <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>New VMT</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.newVmt}
                </div>
              </div>
              <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>At Home Ach</div>
                <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f59e0b", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.atHomeAch}
                </div>
              </div>
              <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>ADSL Ach</div>
                <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.adslAch}
                </div>
              </div>
              <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Terminal Ach</div>
                <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                  {currentMonthRpm.storeTotals.terminalAch}
                </div>
              </div>
            </div>
          </div>

          {/* 2) Detailed Breakdown Per Employee for Current Month */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>👥</span>
              <span>Agent RPM Breakdown — {data?.currentMonthLabel}</span>
            </div>

            {currentMonthRpm.empBreakdown.length === 0 ? (
              <div className="vf-card" style={{ textAlign: "center", padding: "2rem", color: "var(--vf-text-muted)" }}>
                لا توجد تقارير مسجلة في هذا الشهر حتى الآن
              </div>
            ) : (
              currentMonthRpm.empBreakdown.map((emp) => (
                <div key={emp.name} className="vf-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--vf-border)", paddingBottom: "0.5rem" }}>
                    <div>
                      <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.9375rem" }}>
                        {emp.name} RPM
                      </div>
                      <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                        {emp.reportsCount} أيام مسجلة
                      </div>
                    </div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--vf-red-light)", background: "rgba(196,30,58,0.15)", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                      Acq: {emp.acquisition}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
                    <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                      <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>Lines</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff" }}>{emp.lines}</div>
                    </div>
                    <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                      <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>New VMT</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff" }}>{emp.newVmt}</div>
                    </div>
                    <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                      <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>At Home</div>
                      <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#f59e0b" }}>{emp.atHomeAch}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.375rem", fontSize: "0.6875rem", color: "var(--vf-text-2)", textAlign: "center" }}>
                    <div>Pre: <strong>{emp.pre}</strong></div>
                    <div>F52: <strong>{emp.f52}</strong></div>
                    <div>F80: <strong>{emp.f80}</strong></div>
                    <div>F345: <strong>{emp.aboveF115}</strong></div>
                    <div>Red: <strong>{emp.newRed}</strong></div>
                    <div>MNP: <strong>{emp.mnp}</strong></div>
                    <div>ADSL: <strong>{emp.adslAch}</strong></div>
                    <div>Term: <strong>{emp.terminalAch}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Last Month RPM ── */}
      {!loading && tab === "lastMonth" && (
        <div className="animate-fade-up" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>

          {data?.lastMonthExpired ? (
            <div className="vf-card" style={{
              textAlign: "center", padding: "2.5rem 1.5rem",
              borderColor: "rgba(245,158,11,0.3)", background: "rgba(245,158,11,0.05)"
            }}>
              <span style={{ fontSize: "2rem" }}>🗑️</span>
              <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#f59e0b", marginTop: "0.5rem" }}>
                تم حذف بيانات الشهر السابق
              </h3>
              <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)", marginTop: "0.375rem", maxWidth: "420px", margin: "0.375rem auto 0" }}>
                طبقاً للنظام، يتم إخفاء/مسح تقارير الشهر السابق تلقائياً بعد مرور 25 يوماً من بداية الشهر الجديد.
              </p>
            </div>
          ) : (
            <>
              {/* Last Month Store Summary */}
              <div className="vf-card" style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.18), var(--vf-surface))",
                borderColor: "rgba(139,92,246,0.4)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>
                      🗓️ Final Store RPM — {data?.lastMonthLabel}
                    </h3>
                    <p style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                      النتيجة النهائية المغلقة للشهر السابق · متاح حتى يوم 25 في الشهر
                    </p>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  <div style={{ background: "rgba(139,92,246,0.2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid rgba(139,92,246,0.4)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "#8b5cf6", fontWeight: "600" }}>Final Acquisition</div>
                    <div style={{ fontSize: "1.375rem", fontWeight: "800", color: "#fff", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.acquisition}
                    </div>
                  </div>
                  <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Final Lines</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.lines}
                    </div>
                  </div>
                  <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Final New VMT</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.newVmt}
                    </div>
                  </div>
                  <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Final At Home Ach</div>
                    <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f59e0b", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.atHomeAch}
                    </div>
                  </div>
                  <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Final ADSL Ach</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.adslAch}
                    </div>
                  </div>
                  <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
                    <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Final Terminal Ach</div>
                    <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>
                      {lastMonthRpm.storeTotals.terminalAch}
                    </div>
                  </div>
                </div>
              </div>

              {/* Per Employee Breakdown for Last Month */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span>👥</span>
                  <span>Agent Final RPM — {data?.lastMonthLabel}</span>
                </div>

                {lastMonthRpm.empBreakdown.length === 0 ? (
                  <div className="vf-card" style={{ textAlign: "center", padding: "2rem", color: "var(--vf-text-muted)" }}>
                    لا توجد تقارير مسجلة للشهر السابق
                  </div>
                ) : (
                  lastMonthRpm.empBreakdown.map((emp) => (
                    <div key={emp.name} className="vf-card" style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--vf-border)", paddingBottom: "0.5rem" }}>
                        <div>
                          <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.9375rem" }}>
                            {emp.name} RPM
                          </div>
                          <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                            {emp.reportsCount} أيام مسجلة
                          </div>
                        </div>
                        <div style={{ fontSize: "0.75rem", fontWeight: "800", color: "#8b5cf6", background: "rgba(139,92,246,0.15)", padding: "0.2rem 0.6rem", borderRadius: "999px" }}>
                          Acq: {emp.acquisition}
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", textAlign: "center" }}>
                        <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>Lines</div>
                          <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff" }}>{emp.lines}</div>
                        </div>
                        <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>New VMT</div>
                          <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#fff" }}>{emp.newVmt}</div>
                        </div>
                        <div style={{ background: "var(--vf-surface-2)", borderRadius: "8px", padding: "0.5rem" }}>
                          <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)" }}>At Home</div>
                          <div style={{ fontSize: "0.9375rem", fontWeight: "800", color: "#f59e0b" }}>{emp.atHomeAch}</div>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.375rem", fontSize: "0.6875rem", color: "var(--vf-text-2)", textAlign: "center" }}>
                        <div>Pre: <strong>{emp.pre}</strong></div>
                        <div>F52: <strong>{emp.f52}</strong></div>
                        <div>F80: <strong>{emp.f80}</strong></div>
                        <div>F345: <strong>{emp.aboveF115}</strong></div>
                        <div>Red: <strong>{emp.newRed}</strong></div>
                        <div>MNP: <strong>{emp.mnp}</strong></div>
                        <div>ADSL: <strong>{emp.adslAch}</strong></div>
                        <div>Term: <strong>{emp.terminalAch}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

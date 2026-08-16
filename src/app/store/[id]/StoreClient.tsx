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

type StoreData = {
  branch: { id: string; name: string; code: string | null };
  members: Member[];
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
  EMPLOYEE: "Employee",
};

const ROLE_COLORS: Record<Role, string> = {
  ADMIN: "var(--vf-red-light)",
  MANAGER: "#f59e0b",
  TEAM_LEADER: "#8b5cf6",
  EMPLOYEE: "var(--vf-text-2)",
};

type Tab = "sms" | "health" | "team";

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
          <span>📊 {data?.reportsCount ?? "—"} reports</span>
          <span>🏥 {data?.checksCount ?? "—"} checks</span>
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
      <div style={{ display: "flex", gap: "0.5rem", background: "var(--vf-surface-2)", borderRadius: "16px", padding: "0.375rem" }}>
        {([["team", "👥 Team"], ["sms", "📱 SMS"], ["health", "🏥 Health"]] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              padding: "0.625rem",
              borderRadius: "12px",
              border: "none",
              cursor: "pointer",
              fontSize: "0.8125rem",
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

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

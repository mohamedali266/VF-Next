"use client";

import { useState, useEffect, useCallback } from "react";

type Shift = "AM" | "PM" | "BW";

type HealthRecord = {
  id: string;
  shift: Shift;
  employee?: { name?: string | null } | null;
} & Record<`line${number}Nid`, number | null | undefined>;

const SHIFT_CONFIG: Record<Shift, { label: string; icon: string; color: string; bg: string }> = {
  AM: { label: "AM shift", icon: "AM", color: "var(--shift-am)", bg: "rgba(245,158,11,0.08)" },
  PM: { label: "PM shift", icon: "PM", color: "var(--shift-pm)", bg: "rgba(59,130,246,0.08)" },
  BW: { label: "BW shift", icon: "BW", color: "var(--shift-bw)", bg: "rgba(139,92,246,0.08)" },
};

const LINE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const lineKey = (n: number) => `line${n}Nid` as `line${number}Nid`;
const lineHeader = (n: number) => `${n} L / NID`;

function calcRecord(r: HealthRecord) {
  const totalNids = LINE_NUMS.reduce((s, n) => s + (r[lineKey(n)] || 0), 0);
  const totalLines = LINE_NUMS.reduce((s, n) => s + n * (r[lineKey(n)] || 0), 0);
  return { totalNids, totalLines };
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to save changes";
}

export default function ManagerHealthCheckPage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editRecord, setEditRecord] = useState<HealthRecord | null>(null);
  const [editValues, setEditValues] = useState<Record<string, number>>({});
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/health-check?date=${date}`);
      const data = await res.json();
      setRecords(data.records || []);
    } catch {
      setRecords([]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const grouped = (["AM", "PM", "BW"] as Shift[]).reduce((acc, shift) => {
    const recs = records.filter((r) => r.shift === shift);
    if (recs.length > 0) acc[shift] = recs;
    return acc;
  }, {} as Partial<Record<Shift, HealthRecord[]>>);

  const dayTotalNids = records.reduce((s, r) => s + calcRecord(r).totalNids, 0);
  const dayTotalLines = records.reduce((s, r) => s + calcRecord(r).totalLines, 0);

  function openEdit(record: HealthRecord) {
    const vals: Record<string, number> = {};
    LINE_NUMS.forEach((n) => { vals[lineKey(n)] = record[lineKey(n)] || 0; });
    setEditRecord(record);
    setEditValues(vals);
    setEditReason("");
    setMessage("");
  }

  async function saveEdit() {
    if (!editRecord) return;
    if (!editReason.trim()) {
      setMessage("Edit reason is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/health-check/${editRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editValues, reason: editReason }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setEditRecord(null);
      load();
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
    setSaving(false);
  }

  const today = new Date(date).toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Health Check - Manager
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-muted)" }}>{today}</p>
      </div>

      <div className="nox-card animate-fade-up animate-fade-up-delay-1" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <label style={{ fontSize: "0.8125rem", fontWeight: "600", color: "var(--nox-text-2)", whiteSpace: "nowrap" }}>
          Date
        </label>
        <input
          type="date"
          className="nox-input"
          style={{ flex: 1, padding: "0.5rem 0.75rem", textAlign: "center" }}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          max={new Date().toISOString().split("T")[0]}
        />
      </div>

      <a
        href={`/api/health-check/export?date=${date}`}
        className="nox-btn nox-btn-primary nox-btn-md animate-fade-up animate-fade-up-delay-1"
        style={{ textDecoration: "none" }}
      >
        Export Excel
      </a>

      {loading && (
        <div className="nox-card" style={{ textAlign: "center", padding: "2rem" }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            border: "3px solid var(--nox-border)",
            borderTopColor: "var(--nox-red)",
            animation: "spin 0.8s linear infinite",
            margin: "0 auto"
          }} />
          <p style={{ color: "var(--nox-text-muted)", marginTop: "0.75rem", fontSize: "0.875rem" }}>Loading...</p>
        </div>
      )}

      {!loading && records.length === 0 && (
        <div className="nox-card animate-fade-up" style={{
          textAlign: "center", padding: "2.5rem",
          borderStyle: "dashed", borderColor: "var(--nox-border-light)"
        }}>
          <p style={{ color: "var(--nox-text-2)", fontWeight: "600" }}>No records for this day</p>
        </div>
      )}

      {!loading && Object.entries(grouped).map(([shift, recs]) => {
        const cfg = SHIFT_CONFIG[shift as Shift];
        const shiftTotalNids = recs.reduce((s, r) => s + calcRecord(r).totalNids, 0);
        const shiftTotalLines = recs.reduce((s, r) => s + calcRecord(r).totalLines, 0);

        return (
          <div key={shift} className="nox-card animate-fade-up" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              background: cfg.bg,
              borderBottom: `1px solid ${cfg.color}30`,
              padding: "0.875rem 1rem",
              display: "flex",
              alignItems: "center",
              gap: "0.625rem"
            }}>
              <span style={{ fontWeight: "900", color: cfg.color, fontSize: "0.875rem" }}>{cfg.icon}</span>
              <span style={{ fontWeight: "800", color: cfg.color, fontSize: "1rem" }}>{cfg.label}</span>
              <span style={{
                marginLeft: "auto",
                background: `${cfg.color}20`,
                border: `1px solid ${cfg.color}40`,
                borderRadius: "999px",
                padding: "0.125rem 0.625rem",
                fontSize: "0.75rem",
                color: cfg.color,
                fontWeight: "700"
              }}>
                {recs.length} employees
              </span>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="nox-table" style={{ minWidth: "760px" }}>
                <thead>
                  <tr>
                    <th style={{ position: "sticky", right: 0, background: "var(--nox-surface-2)", zIndex: 1 }}>
                      Store Name-{shift} shift
                    </th>
                    {LINE_NUMS.map((n) => (
                      <th key={n} style={{ textAlign: "center", minWidth: "68px", whiteSpace: "pre-line" }}>
                        {lineHeader(n)}
                      </th>
                    ))}
                    <th style={{ textAlign: "center", color: "var(--nox-red-light)" }}>NIDs</th>
                    <th style={{ textAlign: "center", color: "#fff" }}>Lines</th>
                    <th style={{ textAlign: "center" }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {recs.map((r) => {
                    const { totalNids, totalLines } = calcRecord(r);
                    return (
                      <tr key={r.id}>
                        <td style={{
                          position: "sticky",
                          right: 0,
                          background: "var(--nox-surface)",
                          fontWeight: "600",
                          whiteSpace: "nowrap",
                          zIndex: 1,
                        }}>
                          {r.employee?.name}
                        </td>
                        {LINE_NUMS.map((n) => (
                          <td key={n} style={{ textAlign: "center", color: r[lineKey(n)] ? "var(--nox-text)" : "var(--nox-text-muted)" }}>
                            {r[lineKey(n)] || 0}
                          </td>
                        ))}
                        <td style={{ textAlign: "center", fontWeight: "700", color: "var(--nox-red-light)" }}>
                          {totalNids.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center", fontWeight: "700", color: "#fff" }}>
                          {totalLines.toLocaleString()}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <button onClick={() => openEdit(r)} style={{
                            background: "rgba(196,30,58,0.1)",
                            border: "1px solid rgba(196,30,58,0.3)",
                            borderRadius: "8px",
                            color: "var(--nox-red-light)",
                            padding: "0.25rem 0.625rem",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            fontWeight: "600",
                            fontFamily: "inherit",
                          }}>
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="nox-table-footer">
                    <td style={{ position: "sticky", right: 0, background: "var(--nox-red-subtle)", zIndex: 1, fontWeight: "800" }}>
                      Total {shift}
                    </td>
                    {LINE_NUMS.map((n) => (
                      <td key={n} style={{ textAlign: "center", fontWeight: "700" }}>
                        {recs.reduce((s, r) => s + (r[lineKey(n)] || 0), 0)}
                      </td>
                    ))}
                    <td style={{ textAlign: "center", fontWeight: "800", color: "var(--nox-red-light)" }}>
                      {shiftTotalNids.toLocaleString()}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: "800", color: "#fff" }}>
                      {shiftTotalLines.toLocaleString()}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })}

      {!loading && records.length > 0 && (
        <div className="nox-card animate-fade-up" style={{
          background: "linear-gradient(135deg, rgba(196,30,58,0.18), rgba(26,26,26,1))",
          borderColor: "rgba(196,30,58,0.4)",
        }}>
          <div style={{ fontWeight: "800", color: "var(--nox-red-light)", fontSize: "0.875rem", marginBottom: "1rem", textTransform: "uppercase" }}>
            Day Total
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: "800", color: "var(--nox-red-light)", lineHeight: 1 }}>
                {dayTotalNids.toLocaleString("ar-EG")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>
                Total NIDs
              </div>
            </div>
            <div style={{ textAlign: "center", borderRight: "1px solid rgba(196,30,58,0.2)" }}>
              <div style={{ fontSize: "2.25rem", fontWeight: "800", color: "#fff", lineHeight: 1 }}>
                {dayTotalLines.toLocaleString("ar-EG")}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>
                Total Lines
              </div>
            </div>
          </div>
        </div>
      )}

      {editRecord && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end",
          padding: "0"
        }}>
          <div style={{
            background: "var(--nox-surface)",
            border: "1px solid rgba(196,30,58,0.3)",
            borderRadius: "24px 24px 0 0",
            padding: "1.5rem 1.25rem",
            width: "100%",
            maxHeight: "90dvh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>Edit data</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>
                  {editRecord.employee?.name} - {editRecord.shift}
                </p>
              </div>
              <button
                onClick={() => setEditRecord(null)}
                style={{ background: "var(--nox-surface-2)", border: "1px solid var(--nox-border)", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--nox-text-2)", fontSize: "1rem" }}
              >x</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {LINE_NUMS.map((n) => (
                <div key={n} style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
                  <div className="nox-number-badge">{n}</div>
                  <span style={{ flex: 1, fontSize: "0.8125rem", color: "var(--nox-text-2)", fontWeight: "600" }}>{n} Line / NID</span>
                  <input
                    type="number" min="0"
                    className="nox-input"
                    style={{ width: "90px", textAlign: "center", padding: "0.5rem", fontSize: "1rem", fontWeight: "700" }}
                    value={editValues[lineKey(n)] ?? 0}
                    onChange={(e) => setEditValues((p) => ({ ...p, [lineKey(n)]: parseInt(e.target.value) || 0 }))}
                    inputMode="numeric"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="nox-label">Edit reason <span style={{ color: "var(--nox-red-light)" }}>*</span></label>
              <textarea
                className="nox-input"
                rows={3}
                placeholder="Write the reason clearly..."
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                style={{ resize: "none", paddingTop: "0.75rem" }}
              />
            </div>

            {message && <div className="nox-alert nox-alert-error">{message}</div>}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button className="nox-btn nox-btn-ghost nox-btn-md" onClick={() => setEditRecord(null)}>
                Cancel
              </button>
              <button className="nox-btn nox-btn-primary nox-btn-md" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving..." : "Save edit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

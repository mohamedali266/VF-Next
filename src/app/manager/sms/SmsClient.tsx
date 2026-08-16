"use client";

import {
  DailyReportFormValues,
  buildSmsMessage,
  emptyDailyReportValues,
} from "@/lib/daily-report";
import { BarChart3, ClipboardCopy, Loader2, MessageSquareText, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type SmsReport = DailyReportFormValues & {
  id: string;
  employee: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    vpnNum: string | null;
    staffId: string | null;
    role: string;
  };
  branch: {
    id: string;
    name: string;
    code: string | null;
  } | null;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function aggregateReports(reports: SmsReport[], date: string): DailyReportFormValues {
  const totals = reports.reduce(
    (sum, report) => ({
      pre: sum.pre + report.pre,
      f52: sum.f52 + report.f52,
      f80: sum.f80 + report.f80,
      aboveF115: sum.aboveF115 + report.aboveF115,
      newVmt: sum.newVmt + report.newVmt,
      exitVmt: sum.exitVmt + report.exitVmt,
      newRed: sum.newRed + report.newRed,
      conRed: sum.conRed + report.conRed,
      mnp: sum.mnp + report.mnp,
      atHomeCount: sum.atHomeCount + report.atHomeCount,
      atHomeAch: sum.atHomeAch + report.atHomeAch,
      adslAch: sum.adslAch + report.adslAch,
      terminalAch: sum.terminalAch + report.terminalAch,
      enterpriseNewAcc: sum.enterpriseNewAcc + report.enterpriseNewAcc,
      enterpriseGas: sum.enterpriseGas + report.enterpriseGas,
      totalDailyAch: sum.totalDailyAch + report.totalDailyAch,
    }),
    {
      pre: 0,
      f52: 0,
      f80: 0,
      aboveF115: 0,
      newVmt: 0,
      exitVmt: 0,
      newRed: 0,
      conRed: 0,
      mnp: 0,
      atHomeCount: 0,
      atHomeAch: 0,
      adslAch: 0,
      terminalAch: 0,
      enterpriseNewAcc: 0,
      enterpriseGas: 0,
      totalDailyAch: 0,
    },
  );

  return {
    ...emptyDailyReportValues,
    ...totals,
    date,
    storeName: reports[0]?.storeName || reports[0]?.branch?.name || "Daily SMS Report",
    atHomeType: "FOUR_G",
  };
}

export default function SmsClient() {
  const [date, setDate] = useState(todayInput());
  const [reports, setReports] = useState<SmsReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [copyState, setCopyState] = useState("");
  const [showRpmModal, setShowRpmModal] = useState(false);

  const totals = useMemo(() => aggregateReports(reports, date), [reports, date]);
  const smsMessage = useMemo(() => buildSmsMessage(totals), [totals]);

  const storeLines = (totals.pre + totals.f52 + totals.f80 + totals.aboveF115) + totals.mnp + (totals.newRed * 3) + totals.conRed;
  const storeAcquisition = storeLines + totals.newVmt;

  const loadReports = useCallback(async () => {
    setLoading(true);
    setCopyState("");
    const res = await fetch(`/api/daily-report?date=${date}`);
    const data = await res.json();
    setReports(data.reports || []);
    setLoading(false);
  }, [date]);

  useEffect(() => {
    let active = true;

    fetch(`/api/daily-report?date=${date}`)
      .then((res) => res.json())
      .then((data) => {
        if (active) setReports(data.reports || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [date]);

  async function copyMessage() {
    await navigator.clipboard.writeText(smsMessage);
    setCopyState("تم نسخ الرسالة");
  }

  return (
    <div className="daily-shell">
      <section className="daily-hero">
        <div>
          <p>Manager SMS</p>
          <h1>Daily SMS</h1>
          <span>تجميع تلقائي لكل تقارير الموظفين في نفس اليوم مع رسالة جاهزة للنسخ.</span>
        </div>
        <div className="daily-score">
          <strong>{reports.length}</strong>
          <span>Reports</span>
        </div>
      </section>

      <section className="vf-card sms-toolbar">
        <label className="daily-field">
          <span>Date</span>
          <input
            className="vf-input"
            type="date"
            value={date}
            onChange={(event) => {
              setLoading(true);
              setCopyState("");
              setDate(event.target.value);
            }}
          />
        </label>
        <button
          className="vf-btn vf-btn-ghost vf-btn-lg"
          onClick={() => setShowRpmModal((v) => !v)}
          type="button"
          style={{ gap: "0.375rem" }}
        >
          <BarChart3 size={18} />
          Store RPM
        </button>
        <button className="vf-btn vf-btn-ghost vf-btn-lg" onClick={loadReports} type="button" disabled={loading}>
          {loading ? <Loader2 className="daily-spin" size={18} /> : <RefreshCcw size={18} />}
          Refresh
        </button>
        <button className="vf-btn vf-btn-primary vf-btn-lg" onClick={copyMessage} type="button" disabled={!reports.length}>
          <ClipboardCopy size={18} />
          Copy SMS
        </button>
      </section>

      {/* ── Store RPM Section ── */}
      {showRpmModal && (
        <section className="vf-card animate-fade-up" style={{
          background: "linear-gradient(135deg, rgba(196,30,58,0.18), var(--vf-surface))",
          borderColor: "rgba(196,30,58,0.4)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.0625rem", fontWeight: "800", color: "#fff" }}>📊 Store RPM (مجموع الفرع)</h3>
              <p style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>
                {date} · {reports.length} employee reports
              </p>
            </div>
            <button
              onClick={() => setShowRpmModal(false)}
              style={{ background: "none", border: "none", color: "var(--vf-text-muted)", cursor: "pointer", fontSize: "1.25rem" }}
            >✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem", marginBottom: "1.25rem" }}>
            <div style={{ background: "rgba(196,30,58,0.2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid rgba(196,30,58,0.4)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-red-light)", fontWeight: "600" }}>Acquisition</div>
              <div style={{ fontSize: "1.375rem", fontWeight: "800", color: "#fff", marginTop: "0.125rem" }}>{storeAcquisition}</div>
            </div>
            <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Lines (F+MNP+Red)</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>{storeLines}</div>
            </div>
            <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>New VMT</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>{totals.newVmt}</div>
            </div>
            <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>At Home Ach</div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f59e0b", marginTop: "0.125rem" }}>{totals.atHomeAch}</div>
            </div>
            <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>ADSL Ach</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>{totals.adslAch}</div>
            </div>
            <div style={{ background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)" }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>Terminal Ach</div>
              <div style={{ fontSize: "1.125rem", fontWeight: "800", color: "var(--vf-text)", marginTop: "0.125rem" }}>{totals.terminalAch}</div>
            </div>
          </div>

          <div style={{ fontSize: "0.875rem", fontWeight: "800", color: "#fff", marginBottom: "0.75rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>👥</span>
            <span>Employee RPM Breakdown (المفصل لكل موظف)</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {reports.map((r) => {
              const empLines = (r.pre + r.f52 + r.f80 + r.aboveF115) + r.mnp + (r.newRed * 3) + r.conRed;
              const empAcq = empLines + r.newVmt;
              return (
                <div key={r.id} style={{
                  background: "var(--vf-surface-2)", borderRadius: "10px", padding: "0.75rem", border: "1px solid var(--vf-border)",
                  display: "flex", flexDirection: "column", gap: "0.5rem"
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: "700", color: "#fff", fontSize: "0.875rem" }}>{r.employee.name} RPM</span>
                    <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "var(--vf-red-light)" }}>Acq: {empAcq}</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.375rem", fontSize: "0.6875rem", color: "var(--vf-text-2)", textAlign: "center" }}>
                    <div>Lines: <strong>{empLines}</strong></div>
                    <div>VMT: <strong>{r.newVmt}</strong></div>
                    <div>AtHome: <strong>{r.atHomeAch}</strong></div>
                    <div>ADSL: <strong>{r.adslAch}</strong></div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="sms-summary-grid">
        <SummaryCard label="Acquisition" value={String(storeAcquisition)} />
        <SummaryCard label="Lines" value={String(storeLines)} />
        <SummaryCard label="New VMT" value={String(totals.newVmt)} />
        <SummaryCard label="At Home" value={String(totals.atHomeAch)} />
      </section>

      <section className="vf-card daily-preview">
        <div className="sms-preview-head">
          <div className="daily-section-title">Final SMS Message</div>
          {copyState && <span>{copyState}</span>}
        </div>
        <textarea className="vf-input" value={smsMessage} readOnly />
      </section>

      <section className="vf-card sms-table-card">
        <div className="sms-preview-head">
          <div className="daily-section-title">Employee Reports</div>
          <span>{loading ? "Loading..." : `${reports.length} reports`}</span>
        </div>
        <div className="sms-table-wrap">
          <table className="vf-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Pre</th>
                <th>F52</th>
                <th>F80</th>
                <th>F345</th>
                <th>New Red</th>
                <th>New VMT</th>
                <th>Acquisition</th>
                <th>At Home</th>
                <th>ADSL</th>
                <th>Terminal</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const empLines = (report.pre + report.f52 + report.f80 + report.aboveF115) + report.mnp + (report.newRed * 3) + report.conRed;
                const empAcq = empLines + report.newVmt;
                return (
                  <tr key={report.id}>
                    <td>
                      <strong>{report.employee.name}</strong>
                      <span className="sms-branch">{report.branch?.name || "No store"}</span>
                    </td>
                    <td>{report.pre}</td>
                    <td>{report.f52}</td>
                    <td>{report.f80}</td>
                    <td>{report.aboveF115}</td>
                    <td>{report.newRed}</td>
                    <td>{report.newVmt}</td>
                    <td style={{ fontWeight: "800", color: "var(--vf-red-light)" }}>{empAcq}</td>
                    <td>{report.atHomeAch}</td>
                    <td>{report.adslAch}</td>
                    <td>{report.terminalAch}</td>
                  </tr>
                );
              })}
              {!reports.length && !loading && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "var(--vf-text-muted)" }}>
                    لا توجد تقارير لهذا اليوم
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="vf-card sms-summary-card">
      <MessageSquareText size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

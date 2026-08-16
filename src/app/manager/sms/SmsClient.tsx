"use client";

import {
  DAILY_ACQUISITION_TARGET,
  DailyReportFormValues,
  buildSmsMessage,
  emptyDailyReportValues,
} from "@/lib/daily-report";
import { ClipboardCopy, Loader2, MessageSquareText, RefreshCcw } from "lucide-react";
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

  const totals = useMemo(() => aggregateReports(reports, date), [reports, date]);
  const smsMessage = useMemo(() => buildSmsMessage(totals), [totals]);
  const target = reports.length * DAILY_ACQUISITION_TARGET;
  const targetText = `${totals.totalDailyAch}/${target || DAILY_ACQUISITION_TARGET}`;

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

      <section className="nox-card sms-toolbar">
        <label className="daily-field">
          <span>Date</span>
          <input
            className="nox-input"
            type="date"
            value={date}
            onChange={(event) => {
              setLoading(true);
              setCopyState("");
              setDate(event.target.value);
            }}
          />
        </label>
        <button className="nox-btn nox-btn-ghost nox-btn-lg" onClick={loadReports} type="button" disabled={loading}>
          {loading ? <Loader2 className="daily-spin" size={18} /> : <RefreshCcw size={18} />}
          Refresh
        </button>
        <button className="nox-btn nox-btn-primary nox-btn-lg" onClick={copyMessage} type="button" disabled={!reports.length}>
          <ClipboardCopy size={18} />
          Copy SMS
        </button>
      </section>

      <section className="sms-summary-grid">
        <SummaryCard label="Total Daily Ach" value={targetText} />
        <SummaryCard label="At Home" value={String(totals.atHomeAch)} />
        <SummaryCard label="ADSL" value={String(totals.adslAch)} />
        <SummaryCard label="Terminal" value={String(totals.terminalAch)} />
      </section>

      <section className="nox-card daily-preview">
        <div className="sms-preview-head">
          <div className="daily-section-title">Final SMS Message</div>
          {copyState && <span>{copyState}</span>}
        </div>
        <textarea className="nox-input" value={smsMessage} readOnly />
      </section>

      <section className="nox-card sms-table-card">
        <div className="sms-preview-head">
          <div className="daily-section-title">Employee Reports</div>
          <span>{loading ? "Loading..." : `${reports.length} reports`}</span>
        </div>
        <div className="sms-table-wrap">
          <table className="nox-table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Pre</th>
                <th>F52</th>
                <th>F80</th>
                <th>F345</th>
                <th>New Red</th>
                <th>New VMT</th>
                <th>Total</th>
                <th>At Home</th>
                <th>ADSL</th>
                <th>Terminal</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <strong>{report.employee.name}</strong>
                    <span className="sms-branch">{report.branch?.name || "No branch"}</span>
                  </td>
                  <td>{report.pre}</td>
                  <td>{report.f52}</td>
                  <td>{report.f80}</td>
                  <td>{report.aboveF115}</td>
                  <td>{report.newRed}</td>
                  <td>{report.newVmt}</td>
                  <td>{report.totalDailyAch}</td>
                  <td>{report.atHomeAch}</td>
                  <td>{report.adslAch}</td>
                  <td>{report.terminalAch}</td>
                </tr>
              ))}
              {!reports.length && !loading && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "var(--nox-text-muted)" }}>
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
    <div className="nox-card sms-summary-card">
      <MessageSquareText size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

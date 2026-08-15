"use client";

import {
  AT_HOME_REQUIRED,
  DAILY_ACQUISITION_TARGET,
  DailyReportFormValues,
  buildSmsMessage,
  emptyDailyReportValues,
  normalizeDailyReportValues,
} from "@/lib/daily-report";
import { Calculator, CheckCircle2, Loader2, Send, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type SavedReport = DailyReportFormValues & {
  id: string;
  submittedAt: string;
  updatedAt: string;
};

function asFormReport(report: SavedReport): DailyReportFormValues {
  return {
    ...emptyDailyReportValues,
    ...report,
    date: report.date,
  };
}

export default function DailyReportClient() {
  const [values, setValues] = useState<DailyReportFormValues>(emptyDailyReportValues);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcText, setCalcText] = useState("");

  const normalized = useMemo(() => normalizeDailyReportValues(values), [values]);
  const smsPreview = useMemo(() => buildSmsMessage(normalized), [normalized]);
  const acquisitionPercent = Math.min(Math.round((normalized.totalDailyAch / DAILY_ACQUISITION_TARGET) * 100), 999);

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      const res = await fetch(`/api/daily-report?date=${values.date}`);
      const data = await res.json();
      if (data.report) setValues(asFormReport(data.report));
      setReports(data.reports || []);
      setLoading(false);
    }

    loadReport();
  }, [values.date]);

  function setField<K extends keyof DailyReportFormValues>(field: K, value: DailyReportFormValues[K]) {
    setValues((current) => normalizeDailyReportValues({ ...current, [field]: value }));
  }

  function setNumericField(field: keyof DailyReportFormValues, rawValue: string) {
    const value = rawValue === "" ? 0 : Number(rawValue);
    setField(field, Number.isFinite(value) ? value : 0);
  }

  async function submitReport() {
    setSaving(true);
    setMessage("");

    const res = await fetch("/api/daily-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });

    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "لم يتم حفظ التقرير");
      setSaving(false);
      return;
    }

    setValues(asFormReport(data.report));
    const reload = await fetch(`/api/daily-report?date=${normalized.date}`);
    const reloaded = await reload.json();
    setReports(reloaded.reports || []);
    setMessage("تم إرسال التقرير وحفظه");
    setSaving(false);
  }

  function clearForm() {
    setValues({
      ...emptyDailyReportValues,
      date: values.date,
      storeName: values.storeName || emptyDailyReportValues.storeName,
    });
    setMessage("");
  }

  function applyTerminalSum() {
    const sum = calcText
      .split(/\r?\n/)
      .map((line) => Number(line.trim()))
      .filter((num) => Number.isFinite(num))
      .reduce((total, num) => total + num, 0);
    setNumericField("terminalAch", String(sum));
    setCalcText("");
    setCalcOpen(false);
  }

  const fieldInput = (field: keyof DailyReportFormValues, label: string, readOnly = false) => (
    <label className="daily-field">
      <span>{label}</span>
      <input
        className="nox-input"
        type="number"
        min="0"
        inputMode="numeric"
        value={String(values[field] || "")}
        readOnly={readOnly}
        onChange={(event) => setNumericField(field, event.target.value)}
      />
    </label>
  );

  return (
    <div className="daily-shell">
      <section className="daily-hero">
        <div>
          <p>Daily Report</p>
          <h1>SMS Submit</h1>
          <span>سجل أرقام اليوم، والنظام يجمعها تلقائيا للمدير والتيم ليدر.</span>
        </div>
        <div className="daily-score">
          <strong>{normalized.totalDailyAch}</strong>
          <span>/ {DAILY_ACQUISITION_TARGET}</span>
        </div>
      </section>

      <section className="nox-card daily-progress-card">
        <div className="daily-progress-head">
          <span>Total Daily Ach</span>
          <strong>{acquisitionPercent}%</strong>
        </div>
        <div className="daily-progress-track">
          <div style={{ width: `${Math.min(acquisitionPercent, 100)}%` }} />
        </div>
        <div className="daily-mini-stats">
          <span>At Home: {normalized.atHomeAch}/{AT_HOME_REQUIRED}</span>
          <span>ADSL: {normalized.adslAch}/1</span>
          <span>Terminal: {normalized.terminalAch}</span>
        </div>
      </section>

      <section className="nox-card daily-form-card">
        <div className="daily-form-top">
          <label className="daily-field">
            <span>Store Name</span>
            <input className="nox-input" value={values.storeName} onChange={(event) => setField("storeName", event.target.value)} />
          </label>
          <label className="daily-field">
            <span>Date</span>
            <input className="nox-input" type="date" value={values.date} onChange={(event) => setField("date", event.target.value)} />
          </label>
        </div>

        <ReportSection title="Acquisition">
          {fieldInput("pre", "Pre")}
          {fieldInput("f52", "F52")}
          {fieldInput("f80", "F80")}
          {fieldInput("aboveF115", "Above F115 (F345)")}
          {fieldInput("newVmt", "New VMT (New V. Cash)")}
          {fieldInput("exitVmt", "Exit VMT")}
          {fieldInput("newRed", "New Red")}
          {fieldInput("conRed", "Con Red")}
          {fieldInput("mnp", "MNP")}
        </ReportSection>

        <ReportSection title="At Home & ADSL">
          <label className="daily-field">
            <span>At Home Type</span>
            <select
              className="nox-input"
              value={values.atHomeType}
              onChange={(event) => setField("atHomeType", event.target.value as DailyReportFormValues["atHomeType"])}
            >
              <option value="FOUR_G">At Home 4G (58)</option>
              <option value="FIVE_G">At Home 5G (105)</option>
            </select>
          </label>
          {fieldInput("atHomeCount", "At Home Count")}
          {fieldInput("atHomeAch", "At Home Ach", true)}
          {fieldInput("adslAch", "ADSL Daily Ach")}
        </ReportSection>

        <div className="daily-section">
          <div className="daily-section-title">*Terminal</div>
          <div className="terminal-row">
            {fieldInput("terminalAch", "Terminal Ach")}
            <button className="nox-btn nox-btn-ghost calc-btn" type="button" onClick={() => setCalcOpen(true)} aria-label="Terminal calculator">
              <Calculator size={20} />
            </button>
          </div>
        </div>

        <ReportSection title="Enterprise">
          {fieldInput("enterpriseNewAcc", "New Account (Z)")}
          {fieldInput("enterpriseGas", "Gas Lines (Y)")}
        </ReportSection>

        {message && (
          <div className={message.includes("تم") ? "nox-alert nox-alert-success" : "nox-alert nox-alert-error"}>
            {message.includes("تم") ? <CheckCircle2 size={18} /> : null}
            {message}
          </div>
        )}

        <div className="daily-actions">
          <button className="nox-btn nox-btn-ghost nox-btn-lg" type="button" onClick={clearForm}>
            <Trash2 size={18} />
            Clear Today
          </button>
          <button className="nox-btn nox-btn-primary nox-btn-lg" type="button" onClick={submitReport} disabled={saving || loading}>
            {saving ? <Loader2 className="daily-spin" size={18} /> : <Send size={18} />}
            Submit
          </button>
        </div>
      </section>

      <section className="nox-card daily-preview">
        <div className="daily-section-title">SMS Preview</div>
        <textarea className="nox-input" value={smsPreview} readOnly />
      </section>

      <section className="nox-card daily-history">
        <div className="daily-section-title">Saved Reports</div>
        <div className="daily-history-list">
          {reports.map((report) => (
            <button key={report.id} type="button" onClick={() => setValues(asFormReport(report))}>
              <span>{report.date}</span>
              <strong>{report.totalDailyAch}/{DAILY_ACQUISITION_TARGET}</strong>
            </button>
          ))}
          {!reports.length && <p>{loading ? "Loading..." : "لا توجد تقارير محفوظة"}</p>}
        </div>
      </section>

      {calcOpen && (
        <div className="daily-modal" onClick={() => setCalcOpen(false)}>
          <div className="daily-modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Terminal Calculator</h3>
            <textarea
              className="nox-input"
              rows={6}
              value={calcText}
              onChange={(event) => setCalcText(event.target.value)}
              placeholder={"10\n20\n30"}
            />
            <div className="daily-actions">
              <button className="nox-btn nox-btn-ghost nox-btn-lg" onClick={() => setCalcOpen(false)} type="button">Cancel</button>
              <button className="nox-btn nox-btn-primary nox-btn-lg" onClick={applyTerminalSum} type="button">OK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="daily-section">
      <div className="daily-section-title">{title}</div>
      <div className="daily-grid">{children}</div>
    </div>
  );
}

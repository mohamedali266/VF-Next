"use client";

import {
  DailyReportFormValues,
  buildSmsMessage,
  emptyDailyReportValues,
  normalizeDailyReportValues,
} from "@/lib/daily-report";
import { Calculator, CheckCircle2, Edit3, Loader2, Send, Trash2, BarChart3 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

type SavedReport = DailyReportFormValues & {
  id: string;
  submittedAt: string;
  updatedAt: string;
};

function asFormReport(report: SavedReport): DailyReportFormValues {
  return { ...emptyDailyReportValues, ...report, date: report.date };
}

/** Sum a numeric field across all saved reports */
function sumField(reports: SavedReport[], field: keyof DailyReportFormValues): number {
  return reports.reduce((s, r) => s + ((r[field] as number) || 0), 0);
}

function calcCumulative(reports: SavedReport[]) {
  const pre = sumField(reports, "pre");
  const f52 = sumField(reports, "f52");
  const f80 = sumField(reports, "f80");
  const aboveF115 = sumField(reports, "aboveF115");
  const newRed = sumField(reports, "newRed");
  const conRed = sumField(reports, "conRed");
  const mnp = sumField(reports, "mnp");
  const newVmt = sumField(reports, "newVmt");

  const lines = (pre + f52 + f80 + aboveF115) + mnp + (newRed * 3) + conRed;
  const acquisition = lines + newVmt;

  return {
    pre,
    f52,
    f80,
    aboveF115,
    newVmt,
    exitVmt: sumField(reports, "exitVmt"),
    newRed,
    conRed,
    mnp,
    lines,
    acquisition,
    atHomeAch: sumField(reports, "atHomeAch"),
    adslAch: sumField(reports, "adslAch"),
    terminalAch: sumField(reports, "terminalAch"),
    enterpriseNewAcc: sumField(reports, "enterpriseNewAcc"),
    enterpriseGas: sumField(reports, "enterpriseGas"),
    daysCount: reports.length,
  };
}

export default function DailyReportClient() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "Employee";

  const [values, setValues] = useState<DailyReportFormValues>(emptyDailyReportValues);
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcText, setCalcText] = useState("");
  const [assignedStoreName, setAssignedStoreName] = useState("");
  const [showCumulative, setShowCumulative] = useState(false);

  const normalized = useMemo(() => normalizeDailyReportValues(values), [values]);
  const smsPreview = useMemo(() => buildSmsMessage(normalized), [normalized]);
  const cumulative = useMemo(() => calcCumulative(reports), [reports]);

  // Check if today's report already exists (editing mode)
  const today = new Date().toISOString().slice(0, 10);
  const isEditMode = reports.some((r) => r.date === values.date);
  const isToday = values.date === today;

  useEffect(() => {
    async function loadReport() {
      setLoading(true);
      const res = await fetch(`/api/daily-report?date=${values.date}`);
      const data = await res.json();
      if ("storeName" in data) setAssignedStoreName(data.storeName || "No store assigned");
      if (data.report) setValues(asFormReport(data.report));
      if (!data.report && data.storeName) setValues((c) => ({ ...c, storeName: data.storeName }));
      setReports(data.reports || []);
      setLoading(false);
    }
    loadReport();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.date]);

  function setField<K extends keyof DailyReportFormValues>(field: K, value: DailyReportFormValues[K]) {
    setValues((c) => normalizeDailyReportValues({ ...c, [field]: value }));
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
      body: JSON.stringify({ ...normalized, storeName: assignedStoreName || normalized.storeName }),
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
    setMessage(isEditMode ? "✅ تم تحديث التقرير" : "✅ تم إرسال التقرير");
    setSaving(false);
  }

  function clearForm() {
    setValues({ ...emptyDailyReportValues, date: values.date, storeName: assignedStoreName || values.storeName });
    setMessage("");
  }

  function applyTerminalSum() {
    const sum = calcText
      .split(/\r?\n/)
      .map((l) => Number(l.trim()))
      .filter((n) => Number.isFinite(n))
      .reduce((t, n) => t + n, 0);
    setNumericField("terminalAch", String(sum));
    setCalcText("");
    setCalcOpen(false);
  }

  const fieldInput = (field: keyof DailyReportFormValues, label: string, readOnly = false) => (
    <label className="daily-field" key={field}>
      <span>{label}</span>
      <input
        className="vf-input"
        type="number"
        min="0"
        inputMode="numeric"
        value={String(values[field] || "")}
        readOnly={readOnly}
        onChange={(e) => setNumericField(field, e.target.value)}
      />
    </label>
  );

  return (
    <div className="daily-shell">
      <section className="daily-hero">
        <div>
          <p>Daily Report</p>
          <h1>SMS Submit</h1>
        </div>
        {/* RPM toggle button */}
        <button
          className="vf-btn vf-btn-ghost vf-btn-lg"
          type="button"
          onClick={() => setShowCumulative((v) => !v)}
          style={{ gap: "0.375rem" }}
        >
          <BarChart3 size={18} />
          RPM
        </button>
      </section>

      {/* ── Employee RPM Card ── */}
      {showCumulative && (
        <section className="vf-card animate-fade-up" style={{
          background: "linear-gradient(135deg, rgba(196,30,58,0.15), var(--vf-surface))",
          borderColor: "rgba(196,30,58,0.35)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div style={{ fontWeight: "800", color: "#fff", fontSize: "1.125rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>📊</span>
              <span>{userName} RPM</span>
              <span style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>
                ({cumulative.daysCount} days)
              </span>
            </div>
            <button
              onClick={() => setShowCumulative(false)}
              style={{ background: "none", border: "none", color: "var(--vf-text-muted)", cursor: "pointer", fontSize: "1.25rem" }}
            >✕</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
            {[
              ["Acquisition", String(cumulative.acquisition), true],
              ["Lines (F+MNP+Red)", String(cumulative.lines), false],
              ["New VMT", String(cumulative.newVmt), false],
              ["At Home Ach", String(cumulative.atHomeAch), false],
              ["ADSL Ach", String(cumulative.adslAch), false],
              ["Terminal Ach", String(cumulative.terminalAch), false],
              ["Enterprise New Acc", String(cumulative.enterpriseNewAcc), false],
              ["Enterprise Gas", String(cumulative.enterpriseGas), false],
              ["Pre", String(cumulative.pre), false],
              ["F52", String(cumulative.f52), false],
              ["F80", String(cumulative.f80), false],
              ["F345", String(cumulative.aboveF115), false],
              ["New Red", String(cumulative.newRed), false],
              ["Con Red", String(cumulative.conRed), false],
              ["MNP", String(cumulative.mnp), false],
            ].map(([label, val, highlight]) => (
              <div key={label as string} style={{
                background: highlight ? "rgba(196,30,58,0.2)" : "var(--vf-surface-2)",
                borderRadius: "10px",
                padding: "0.625rem 0.875rem",
                border: highlight ? "1px solid rgba(196,30,58,0.4)" : "1px solid var(--vf-border)"
              }}>
                <div style={{ fontSize: "0.6875rem", color: highlight ? "var(--vf-red-light)" : "var(--vf-text-muted)", fontWeight: "600" }}>{label}</div>
                <div style={{ fontSize: highlight ? "1.25rem" : "1rem", fontWeight: "800", color: highlight ? "#fff" : "var(--vf-text)", marginTop: "0.125rem" }}>{val}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Form Card ── */}
      <section className="vf-card daily-form-card">
        <div className="daily-form-top">
          <label className="daily-field">
            <span>Store Name</span>
            <input className="vf-input" value={assignedStoreName || values.storeName || "No store assigned"} readOnly />
          </label>
          <label className="daily-field">
            <span>Date</span>
            <input
              className="vf-input"
              type="date"
              value={values.date}
              max={today}
              onChange={(e) => setField("date", e.target.value)}
            />
          </label>
        </div>

        {/* Edit mode badge */}
        {isEditMode && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)",
            borderRadius: "10px", padding: "0.5rem 0.875rem", marginBottom: "0.5rem",
            fontSize: "0.8125rem", color: "#f59e0b", fontWeight: "600"
          }}>
            <Edit3 size={15} />
            {isToday ? "Editing today's report — changes will overwrite" : "Editing saved report"}
          </div>
        )}

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
              className="vf-input"
              value={values.atHomeType}
              onChange={(e) => setField("atHomeType", e.target.value as DailyReportFormValues["atHomeType"])}
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
            <button className="vf-btn vf-btn-ghost calc-btn" type="button" onClick={() => setCalcOpen(true)}>
              <Calculator size={20} />
            </button>
          </div>
        </div>

        <ReportSection title="Enterprise">
          {fieldInput("enterpriseNewAcc", "New Account (Z)")}
          {fieldInput("enterpriseGas", "Gas Lines (Y)")}
        </ReportSection>

        {message && (
          <div className={message.includes("تم") ? "vf-alert vf-alert-success" : "vf-alert vf-alert-error"}>
            {message.includes("تم") ? <CheckCircle2 size={18} /> : null}
            {message}
          </div>
        )}

        <div className="daily-actions">
          <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={clearForm}>
            <Trash2 size={18} />
            Clear
          </button>
          <button
            className="vf-btn vf-btn-primary vf-btn-lg"
            type="button"
            onClick={submitReport}
            disabled={saving || loading}
          >
            {saving ? <Loader2 className="daily-spin" size={18} /> : isEditMode ? <Edit3 size={18} /> : <Send size={18} />}
            {isEditMode ? "Update" : "Submit"}
          </button>
        </div>
      </section>

      {/* ── SMS Preview ── */}
      <section className="vf-card daily-preview">
        <div className="daily-section-title">SMS Preview</div>
        <textarea className="vf-input" value={smsPreview} readOnly />
      </section>

      {/* ── Saved Reports ── */}
      <section className="vf-card daily-history">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
          <div className="daily-section-title" style={{ marginBottom: 0 }}>
            Saved Reports ({reports.length})
          </div>
          {cumulative.daysCount > 0 && (
            <span style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>
              Tap to edit
            </span>
          )}
        </div>
        <div className="daily-history-list">
          {reports.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => setValues(asFormReport(report))}
              style={{
                borderColor: values.date === report.date ? "rgba(196,30,58,0.5)" : undefined,
                background: values.date === report.date ? "rgba(196,30,58,0.08)" : undefined,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "0.125rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--vf-text)" }}>
                  {report.date}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)" }}>
                  Ach: {report.totalDailyAch} · AtHome: {report.atHomeAch}
                </span>
              </div>
              <strong style={{ color: "var(--vf-red-light)" }}>
                {report.totalDailyAch}
              </strong>
            </button>
          ))}
          {!reports.length && (
            <p>{loading ? "Loading..." : "لا توجد تقارير محفوظة"}</p>
          )}
        </div>

        {/* Running cumulative summary at bottom */}
        {cumulative.daysCount > 0 && (
          <div style={{
            marginTop: "1rem",
            padding: "0.875rem",
            background: "var(--vf-surface-2)",
            borderRadius: "12px",
            border: "1px solid var(--vf-border)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.625rem",
          }}>
            <div>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>
                Acquisition ({cumulative.daysCount}d)
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "var(--vf-red-light)" }}>
                {cumulative.acquisition}
              </div>
            </div>
            <div>
              <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", fontWeight: "600" }}>
                At Home ({cumulative.daysCount}d)
              </div>
              <div style={{ fontSize: "1.25rem", fontWeight: "800", color: "#f59e0b" }}>
                {cumulative.atHomeAch}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Terminal Calculator Modal */}
      {calcOpen && (
        <div className="daily-modal" onClick={() => setCalcOpen(false)}>
          <div className="daily-modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Terminal Calculator</h3>
            <textarea
              className="vf-input"
              rows={6}
              value={calcText}
              onChange={(e) => setCalcText(e.target.value)}
              placeholder={"10\n20\n30"}
            />
            <div className="daily-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-lg" onClick={() => setCalcOpen(false)} type="button">Cancel</button>
              <button className="vf-btn vf-btn-primary vf-btn-lg" onClick={applyTerminalSum} type="button">OK</button>
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

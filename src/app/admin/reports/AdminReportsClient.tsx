"use client";

import { DailyReportFormValues, buildSmsMessage } from "@/lib/daily-report";
import { ClipboardCopy, Edit3, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";

type Branch = { id: string; name: string; code: string | null };

type AdminReport = DailyReportFormValues & {
  id: string;
  employeeId: string;
  branchId: string | null;
  submittedAt: string | Date;
  updatedAt: string | Date;
  employee: {
    id: string;
    name: string;
    username: string | null;
    vpnNum: string | null;
    staffId: string | null;
  };
  branch: Branch | null;
};

const editableFields: Array<{ key: keyof DailyReportFormValues; label: string }> = [
  { key: "pre", label: "Pre" },
  { key: "f52", label: "F52" },
  { key: "f80", label: "F80" },
  { key: "aboveF115", label: "F345" },
  { key: "newVmt", label: "New VMT" },
  { key: "exitVmt", label: "Exit VMT" },
  { key: "newRed", label: "New Red" },
  { key: "conRed", label: "Con Red" },
  { key: "mnp", label: "MNP" },
  { key: "atHomeCount", label: "At Home Count" },
  { key: "adslAch", label: "ADSL" },
  { key: "terminalAch", label: "Terminal" },
  { key: "enterpriseNewAcc", label: "New Acc" },
  { key: "enterpriseGas", label: "Gas" },
];

export default function AdminReportsClient({ reports: initialReports, branches }: { reports: AdminReport[]; branches: Branch[] }) {
  const [reports, setReports] = useState(initialReports);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");
  const [editing, setEditing] = useState<AdminReport | null>(null);
  const [draft, setDraft] = useState<AdminReport | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const search = query.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesBranch = branchFilter ? report.branchId === branchFilter : true;
      const haystack = [
        report.employee.name,
        report.employee.username || "",
        report.employee.vpnNum || "",
        report.employee.staffId || "",
        report.storeName,
        report.date,
        report.branch?.name || "",
      ].join(" ").toLowerCase();
      return matchesBranch && (!search || haystack.includes(search));
    });
  }, [reports, query, branchFilter]);

  function openEdit(report: AdminReport) {
    setEditing(report);
    setDraft({ ...report });
    setMessage("");
  }

  function closeEdit() {
    setEditing(null);
    setDraft(null);
  }

  function setDraftNumber(key: keyof DailyReportFormValues, value: string) {
    if (!draft) return;
    const num = value === "" ? 0 : Number(value);
    setDraft({ ...draft, [key]: Number.isFinite(num) ? num : 0 });
  }

  async function saveReport() {
    if (!draft || !editing) return;
    setSaving(true);
    const res = await fetch(`/api/daily-report/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Could not update report");
      setSaving(false);
      return;
    }
    setReports((current) => current.map((report) => report.id === editing.id ? data.report : report));
    setEditing(null);
    setDraft(null);
    setSaving(false);
  }

  async function deleteReport(report: AdminReport) {
    if (!confirm(`Delete report for ${report.employee.name} on ${report.date}?`)) return;
    const res = await fetch(`/api/daily-report/${report.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Could not delete report");
      return;
    }
    setReports((current) => current.filter((item) => item.id !== report.id));
  }

  async function copyReport(report: AdminReport) {
    await navigator.clipboard.writeText(buildSmsMessage(report));
    setMessage("SMS copied");
  }

  return (
    <div className="admin-reports-shell">
      <section className="users-admin-head">
        <div>
          <span>Daily Reports</span>
          <h1>Reports Control</h1>
          <p>{filtered.length} of {reports.length} reports</p>
        </div>
      </section>

      {message && <div className="nox-alert nox-alert-success">{message}</div>}

      <section className="nox-card users-filters">
        <label className="users-search">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search employee, VPN, staff ID, date..." />
        </label>
        <select className="nox-input" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
          ))}
        </select>
      </section>

      <section className="nox-card users-table-card">
        <div className="users-table-wrap">
          <table className="nox-table admin-reports-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Branch</th>
                <th>Total</th>
                <th>At Home</th>
                <th>ADSL</th>
                <th>Terminal</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((report) => (
                <tr key={report.id}>
                  <td>{report.date}</td>
                  <td>
                    <strong>{report.employee.name}</strong>
                    <span className="sms-branch">{report.employee.username || report.employee.vpnNum || "-"}</span>
                  </td>
                  <td>{report.branch?.name || "Unassigned"}</td>
                  <td>{report.totalDailyAch}</td>
                  <td>{report.atHomeAch}</td>
                  <td>{report.adslAch}</td>
                  <td>{report.terminalAch}</td>
                  <td>
                    <div className="users-actions">
                      <button className="nox-btn nox-btn-ghost nox-btn-sm" type="button" onClick={() => openEdit(report)}><Edit3 size={15} /></button>
                      <button className="nox-btn nox-btn-ghost nox-btn-sm" type="button" onClick={() => copyReport(report)}><ClipboardCopy size={15} /></button>
                      <button className="nox-btn nox-btn-ghost nox-btn-sm" type="button" onClick={() => deleteReport(report)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--nox-text-muted)" }}>No reports found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {draft && (
        <div className="users-modal" onClick={closeEdit}>
          <div className="users-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="users-modal-head">
              <div>
                <span>Edit Report</span>
                <h2>{draft.employee.name}</h2>
              </div>
              <button type="button" onClick={closeEdit} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="users-form-grid">
              <label className="users-field">
                <span>Store Name</span>
                <input className="nox-input" value={draft.storeName} onChange={(event) => setDraft({ ...draft, storeName: event.target.value })} />
              </label>
              <label className="users-field">
                <span>At Home Type</span>
                <select className="nox-input" value={draft.atHomeType} onChange={(event) => setDraft({ ...draft, atHomeType: event.target.value as AdminReport["atHomeType"] })}>
                  <option value="FOUR_G">At Home 4G</option>
                  <option value="FIVE_G">At Home 5G</option>
                </select>
              </label>
              {editableFields.map((field) => (
                <label className="users-field" key={field.key}>
                  <span>{field.label}</span>
                  <input className="nox-input" type="number" min="0" value={String(draft[field.key] || "")} onChange={(event) => setDraftNumber(field.key, event.target.value)} />
                </label>
              ))}
            </div>

            <div className="users-modal-actions">
              <button className="nox-btn nox-btn-ghost nox-btn-lg" type="button" onClick={closeEdit}>Cancel</button>
              <button className="nox-btn nox-btn-primary nox-btn-lg" type="button" onClick={saveReport} disabled={saving}>{saving ? "Saving..." : "Save Report"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";

type LogItem = {
  id: string;
  employeeName: string;
  date: string;
  shift: string;
  reason: string;
  editedBy: string;
  editedAt: string;
  changes: Array<{ line: number; oldValue: number; newValue: number }>;
};

export default function EditLogsClient({ logs: initialLogs }: { logs: LogItem[] }) {
  const [logs, setLogs] = useState(initialLogs);
  const [message, setMessage] = useState("");

  async function deleteLog(log: LogItem) {
    if (!confirm(`Delete log for ${log.employeeName} on ${log.date}?`)) return;
    const res = await fetch(`/api/admin/edit-logs/${log.id}`, { method: "DELETE" });
    if (!res.ok) {
      setMessage("Could not delete log");
      return;
    }
    setLogs((current) => current.filter((item) => item.id !== log.id));
    setMessage("Log deleted");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Edit Logs
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-muted)" }}>
          Latest {logs.length} manager/admin edits
        </p>
      </div>

      {message && <div className="vf-alert vf-alert-success">{message}</div>}

      {logs.length === 0 && (
        <div className="vf-card animate-fade-up" style={{
          textAlign: "center",
          padding: "2.5rem",
          borderStyle: "dashed",
          borderColor: "var(--vf-border-light)",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>No edits yet</div>
          <p style={{ color: "var(--vf-text-muted)", fontSize: "0.875rem" }}>
            Audit entries will appear here after a Health Check record is edited.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {logs.map((log, index) => (
          <div key={log.id} className="vf-card animate-fade-up" style={{ animationDelay: `${index * 0.03}s` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.9375rem" }}>{log.employeeName}</div>
                <div style={{ color: "var(--vf-text-muted)", fontSize: "0.75rem", marginTop: "0.125rem" }}>
                  {log.date} | {log.shift}
                </div>
              </div>
              <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => deleteLog(log)} style={{ color: "#f87171" }}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>

            <div style={{ marginTop: "0.875rem", color: "var(--vf-text-2)", fontSize: "0.8125rem" }}>
              <strong style={{ color: "var(--vf-text)" }}>Reason:</strong> {log.reason}
            </div>

            <div style={{ marginTop: "0.875rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {log.changes.length > 0 ? log.changes.map((change) => (
                <span key={change.line} style={{
                  border: "1px solid var(--vf-border)",
                  borderRadius: "999px",
                  padding: "0.25rem 0.625rem",
                  color: "var(--vf-text-2)",
                  fontSize: "0.75rem",
                  background: "var(--vf-surface-2)",
                }}>
                  {change.line}L: {change.oldValue} {"->"} {change.newValue}
                </span>
              )) : (
                <span style={{ color: "var(--vf-text-muted)", fontSize: "0.75rem" }}>No line value changed.</span>
              )}
            </div>

            <div style={{
              marginTop: "0.875rem",
              paddingTop: "0.75rem",
              borderTop: "1px solid var(--vf-border)",
              display: "flex",
              justifyContent: "space-between",
              gap: "0.75rem",
              color: "var(--vf-text-muted)",
              fontSize: "0.75rem",
            }}>
              <span>{log.editedBy}</span>
              <span>{log.editedAt}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

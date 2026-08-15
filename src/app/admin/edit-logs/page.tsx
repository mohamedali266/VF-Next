import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";

const LINE_NUMS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type EditLogView = {
  id: string;
  oldValues: unknown;
  newValues: unknown;
  reason: string;
  editedAt: Date;
  editedBy: { name: string };
  healthCheck: {
    date: Date;
    shift: string;
    employee: {
      name: string;
      department: string | null;
    };
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function asNumber(value: unknown) {
  return typeof value === "number" ? value : 0;
}

function lineChanges(oldValues: unknown, newValues: unknown) {
  const oldRecord = asRecord(oldValues);
  const newRecord = asRecord(newValues);

  return LINE_NUMS.map((n) => {
    const key = `line${n}Nid`;
    const oldValue = asNumber(oldRecord[key]);
    const newValue = asNumber(newRecord[key]);
    if (oldValue === newValue) return null;
    return { line: n, oldValue, newValue };
  }).filter(Boolean) as Array<{ line: number; oldValue: number; newValue: number }>;
}

export default async function AdminEditLogsPage() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const logs = await prisma.editLog.findMany({
    orderBy: { editedAt: "desc" },
    take: 100,
    include: {
      editedBy: { select: { name: true, email: true } },
      healthCheck: {
        include: {
          employee: { select: { name: true, department: true } },
        },
      },
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Edit Logs
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-muted)" }}>
          Latest {logs.length} manager/admin edits
        </p>
      </div>

      {logs.length === 0 && (
        <div className="nox-card animate-fade-up" style={{
          textAlign: "center",
          padding: "2.5rem",
          borderStyle: "dashed",
          borderColor: "var(--nox-border-light)",
        }}>
          <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>No edits yet</div>
          <p style={{ color: "var(--nox-text-muted)", fontSize: "0.875rem" }}>
            Audit entries will appear here after a Health Check record is edited.
          </p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {(logs as EditLogView[]).map((log, index) => {
          const changes = lineChanges(log.oldValues, log.newValues);
          const date = log.healthCheck.date.toISOString().split("T")[0];

          return (
            <div
              key={log.id}
              className="nox-card animate-fade-up"
              style={{ animationDelay: `${index * 0.03}s` }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: "800", color: "#fff", fontSize: "0.9375rem" }}>
                    {log.healthCheck.employee.name}
                  </div>
                  <div style={{ color: "var(--nox-text-muted)", fontSize: "0.75rem", marginTop: "0.125rem" }}>
                    {date} | {log.healthCheck.shift} | {log.healthCheck.employee.department || "No department"}
                  </div>
                </div>
                <span style={{
                  flexShrink: 0,
                  color: "var(--nox-red-light)",
                  background: "var(--nox-red-subtle)",
                  border: "1px solid rgba(196,30,58,0.3)",
                  borderRadius: "999px",
                  padding: "0.125rem 0.625rem",
                  fontSize: "0.75rem",
                  fontWeight: "800",
                }}>
                  {changes.length} changes
                </span>
              </div>

              <div style={{ marginTop: "0.875rem", color: "var(--nox-text-2)", fontSize: "0.8125rem" }}>
                <strong style={{ color: "var(--nox-text)" }}>Reason:</strong> {log.reason}
              </div>

              <div style={{ marginTop: "0.875rem", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {changes.length > 0 ? changes.map((change) => (
                  <span key={change.line} style={{
                    border: "1px solid var(--nox-border)",
                    borderRadius: "999px",
                    padding: "0.25rem 0.625rem",
                    color: "var(--nox-text-2)",
                    fontSize: "0.75rem",
                    background: "var(--nox-surface-2)",
                  }}>
                    {change.line}L: {change.oldValue} {"->"} {change.newValue}
                  </span>
                )) : (
                  <span style={{ color: "var(--nox-text-muted)", fontSize: "0.75rem" }}>
                    No line value changed.
                  </span>
                )}
              </div>

              <div style={{
                marginTop: "0.875rem",
                paddingTop: "0.75rem",
                borderTop: "1px solid var(--nox-border)",
                display: "flex",
                justifyContent: "space-between",
                gap: "0.75rem",
                color: "var(--nox-text-muted)",
                fontSize: "0.75rem",
              }}>
                <span>{log.editedBy.name}</span>
                <span>{log.editedAt.toLocaleString("ar-EG")}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

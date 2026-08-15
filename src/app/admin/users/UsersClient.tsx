"use client";

import { useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

const ROLE_CONFIG = {
  ADMIN:    { label: "أدمن",   color: "var(--nox-red-light)",  bg: "rgba(196,30,58,0.15)",   border: "rgba(196,30,58,0.3)" },
  MANAGER:  { label: "مدير",   color: "var(--shift-pm)",       bg: "rgba(59,130,246,0.1)",   border: "rgba(59,130,246,0.25)" },
  TEAM_LEADER: { label: "تيم ليدر", color: "var(--shift-bw)", bg: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
  EMPLOYEE: { label: "موظف",   color: "var(--shift-am)",       bg: "rgba(245,158,11,0.1)",   border: "rgba(245,158,11,0.25)" },
};

type Branch = {
  id: string;
  name: string;
  code: string | null;
};

type User = {
  id: string; name: string; email: string;
  role: Role; department: string | null;
  branchId: string | null;
  branch: Branch | null;
  isActive: boolean; createdAt: string | Date;
};

type UserForm = {
  name: string;
  email: string;
  password: string;
  role: Role;
  department: string;
  branchId: string;
};

type FormField = {
  label: string;
  key: keyof Pick<UserForm, "name" | "email" | "password" | "department">;
  type: string;
  placeholder: string;
};

export default function UsersClient({ users: initialUsers, branches }: { users: User[]; branches: Branch[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<UserForm>({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", branchId: "" });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  function showMsg(text: string, type: "success" | "error") {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: "", type: "" }), 3000);
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => [data.user, ...prev]);
      setShowAdd(false);
      setForm({ name: "", email: "", password: "", role: "EMPLOYEE", department: "", branchId: "" });
      showMsg("✅ تم إضافة المستخدم بنجاح", "success");
    } catch (error) {
      showMsg("❌ " + (error instanceof Error ? error.message : "Unknown error"), "error");
    }
    setLoading(false);
  }

  async function toggleActive(userId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !currentStatus } : u));
      showMsg(currentStatus ? "⚠️ تم تعطيل الحساب" : "✅ تم تفعيل الحساب", currentStatus ? "error" : "success");
    } catch { showMsg("❌ حدث خطأ", "error"); }
  }

  async function changeRole(userId: string, newRole: Role) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
      showMsg("✅ تم تغيير الصلاحية", "success");
    } catch { showMsg("❌ حدث خطأ", "error"); }
  }

  async function changeBranch(userId: string, branchId: string) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: branchId || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((prev) => prev.map((u) => u.id === userId ? data.user : u));
      showMsg("Branch updated", "success");
    } catch { showMsg("Branch update failed", "error"); }
  }

  const roleOrder = { ADMIN: 0, MANAGER: 1, TEAM_LEADER: 2, EMPLOYEE: 3 };
  const sorted = [...users].sort((a, b) => roleOrder[a.role] - roleOrder[b.role]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }} className="animate-fade-up">
        <div>
          <h1 style={{ fontSize: "1.125rem", fontWeight: "800", color: "#fff" }}>👥 إدارة المستخدمين</h1>
          <p style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>
            {users.length} مستخدم
          </p>
        </div>
        <button className="nox-btn nox-btn-primary nox-btn-sm" onClick={() => setShowAdd(true)}>
          + إضافة
        </button>
      </div>

      {/* Alert */}
      {msg.text && (
        <div className={`nox-alert ${msg.type === "success" ? "nox-alert-success" : "nox-alert-error"} animate-fade-up`}>
          {msg.text}
        </div>
      )}

      {/* Users List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
        {sorted.map((user, i) => {
          const cfg = ROLE_CONFIG[user.role];
          return (
            <div key={user.id} className="nox-card animate-fade-up" style={{
              padding: "1rem",
              opacity: user.isActive ? 1 : 0.5,
              animationDelay: `${i * 0.03}s`
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                {/* Avatar */}
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: cfg.bg, border: `1px solid ${cfg.border}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "1rem", flexShrink: 0
                }}>
                  {user.role === "ADMIN" ? "⚡" : user.role === "MANAGER" ? "👔" : "👤"}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: "700", color: "#fff", fontSize: "0.9375rem" }}>{user.name}</span>
                    <span style={{
                      fontSize: "0.6875rem", fontWeight: "700", padding: "0.125rem 0.5rem",
                      borderRadius: "999px", background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`
                    }}>
                      {cfg.label}
                    </span>
                    {!user.isActive && (
                      <span style={{
                        fontSize: "0.6875rem", fontWeight: "700", padding: "0.125rem 0.5rem",
                        borderRadius: "999px", background: "rgba(239,68,68,0.1)", color: "#f87171",
                        border: "1px solid rgba(239,68,68,0.25)"
                      }}>
                        معطّل
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.25rem" }}>
                    {user.email}
                  </div>
                  <div style={{ fontSize: "0.6875rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>
                    Branch: {user.branch ? `${user.branch.name}${user.branch.code ? ` (${user.branch.code})` : ""}` : "Unassigned"}
                  </div>
                  {user.department && (
                    <div style={{ fontSize: "0.6875rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>
                      🏢 {user.department}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem", flexWrap: "wrap" }}>
                {/* Role Selector */}
                <select
                  className="nox-input"
                  style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", minWidth: "100px" }}
                  value={user.role}
                  onChange={(e) => changeRole(user.id, e.target.value as Role)}
                >
                  <option value="EMPLOYEE">موظف</option>
                  <option value="TEAM_LEADER">تيم ليدر</option>
                  <option value="MANAGER">مدير</option>
                  <option value="ADMIN">أدمن</option>
                </select>

                <select
                  className="nox-input"
                  style={{ flex: 1, padding: "0.375rem 0.625rem", fontSize: "0.8125rem", minWidth: "120px" }}
                  value={user.branchId || ""}
                  onChange={(e) => changeBranch(user.id, e.target.value)}
                >
                  <option value="">No branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}{branch.code ? ` (${branch.code})` : ""}
                    </option>
                  ))}
                </select>

                {/* Toggle Active */}
                <button
                  onClick={() => toggleActive(user.id, user.isActive)}
                  className="nox-btn nox-btn-ghost nox-btn-sm"
                  style={{
                    borderColor: user.isActive ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)",
                    color: user.isActive ? "#f87171" : "#4ade80",
                    fontSize: "0.75rem"
                  }}
                >
                  {user.isActive ? "🔴 تعطيل" : "🟢 تفعيل"}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 200,
          background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "flex-end"
        }}>
          <div style={{
            background: "var(--nox-surface)",
            border: "1px solid rgba(196,30,58,0.3)",
            borderRadius: "24px 24px 0 0",
            padding: "1.5rem 1.25rem",
            width: "100%", maxHeight: "90dvh", overflowY: "auto"
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "800", color: "#fff" }}>➕ إضافة مستخدم</h3>
              <button onClick={() => setShowAdd(false)} style={{
                background: "var(--nox-surface-2)", border: "1px solid var(--nox-border)",
                borderRadius: "50%", width: 32, height: 32, cursor: "pointer", color: "var(--nox-text-2)"
              }}>✕</button>
            </div>

            <form onSubmit={handleAddUser} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {([
                { label: "الاسم الكامل", key: "name", type: "text", placeholder: "محمد أحمد" },
                { label: "البريد الإلكتروني", key: "email", type: "email", placeholder: "user@company.com" },
                { label: "كلمة المرور", key: "password", type: "password", placeholder: "••••••••" },
                { label: "القسم", key: "department", type: "text", placeholder: "Operations" },
              ] as FormField[]).map((field) => (
                <div key={field.key}>
                  <label className="nox-label">{field.label}</label>
                  <input
                    type={field.type}
                    className="nox-input"
                    placeholder={field.placeholder}
                    value={form[field.key]}
                    onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    required={field.key !== "department"}
                  />
                </div>
              ))}

              <div>
                <label className="nox-label">الصلاحية</label>
                <select
                  className="nox-input"
                  value={form.role}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as Role }))}
                >
                  <option value="EMPLOYEE">موظف</option>
                  <option value="MANAGER">مدير</option>
                  <option value="ADMIN">أدمن</option>
                </select>
              </div>

              <div>
                <label className="nox-label">Branch</label>
                <select
                  className="nox-input"
                  value={form.branchId}
                  onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))}
                >
                  <option value="">No branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}{branch.code ? ` (${branch.code})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="button" className="nox-btn nox-btn-ghost nox-btn-md" onClick={() => setShowAdd(false)}>
                  إلغاء
                </button>
                <button type="submit" className="nox-btn nox-btn-primary nox-btn-md" disabled={loading}>
                  {loading ? "جاري الإضافة..." : "إضافة ✅"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

type BranchUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

type Branch = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  users: BranchUser[];
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  EMPLOYEE: "Employee",
};

const ROLE_ORDER: Role[] = ["MANAGER", "TEAM_LEADER", "EMPLOYEE", "ADMIN"];

export default function BranchesClient({ branches: initialBranches }: { branches: Branch[] }) {
  const [branches, setBranches] = useState(initialBranches);
  const [form, setForm] = useState({ name: "", code: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function createBranch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create branch");
      setBranches((prev) => [...prev, data.branch].sort((a, b) => a.name.localeCompare(b.name)));
      setForm({ name: "", code: "" });
      setMessage("Branch created");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create branch");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Branches
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-muted)" }}>
          Create branches and review each branch team.
        </p>
      </div>

      <form onSubmit={createBranch} className="nox-card animate-fade-up animate-fade-up-delay-1" style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        <div>
          <label className="nox-label">Branch name</label>
          <input
            className="nox-input"
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="Cairo Branch"
            required
          />
        </div>
        <div>
          <label className="nox-label">Branch code</label>
          <input
            className="nox-input"
            value={form.code}
            onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
            placeholder="CAI"
          />
        </div>
        {message && <div className="nox-alert nox-alert-success">{message}</div>}
        <button className="nox-btn nox-btn-primary nox-btn-md" disabled={loading}>
          {loading ? "Creating..." : "Create branch"}
        </button>
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
        {branches.map((branch) => (
          <div key={branch.id} className="nox-card animate-fade-up" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{
              padding: "1rem",
              borderBottom: "1px solid var(--nox-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "0.75rem",
            }}>
              <div>
                <div style={{ fontWeight: "800", color: "#fff" }}>{branch.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)" }}>
                  {branch.code || "No code"} | {branch.users.length} users
                </div>
              </div>
              <span style={{
                color: branch.isActive ? "#4ade80" : "#f87171",
                fontSize: "0.75rem",
                fontWeight: "800",
              }}>
                {branch.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {ROLE_ORDER.map((role) => {
                const members = branch.users.filter((user) => user.role === role);
                if (members.length === 0) return null;
                return (
                  <div key={role}>
                    <div style={{ color: "var(--nox-red-light)", fontWeight: "800", fontSize: "0.75rem", marginBottom: "0.375rem" }}>
                      {ROLE_LABELS[role]}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                      {members.map((user) => (
                        <div key={user.id} style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: "0.75rem",
                          padding: "0.625rem 0.75rem",
                          border: "1px solid var(--nox-border)",
                          borderRadius: "10px",
                          background: "var(--nox-surface-2)",
                          opacity: user.isActive ? 1 : 0.5,
                        }}>
                          <span style={{ color: "var(--nox-text)", fontWeight: "700" }}>{user.name}</span>
                          <span style={{ color: "var(--nox-text-muted)", fontSize: "0.75rem" }}>{user.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {branch.users.length === 0 && (
                <div style={{ color: "var(--nox-text-muted)", fontSize: "0.875rem" }}>
                  No users assigned. Assign users to this branch from Admin Users.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

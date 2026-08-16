"use client";

import { Edit3, Plus, Search, UserCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

type Branch = {
  id: string;
  name: string;
  code: string | null;
};

type User = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  vpnNum: string | null;
  staffId: string | null;
  role: Role;
  branchId: string | null;
  branch: Branch | null;
  isActive: boolean;
  createdAt: string | Date;
};

type UserForm = {
  name: string;
  username: string;
  vpnNum: string;
  staffId: string;
  emailLocalPart: string;
  password: string;
  confirmPassword: string;
  role: Role;
  branchId: string;
  isActive: boolean;
};

const emptyForm: UserForm = {
  name: "",
  username: "",
  vpnNum: "",
  staffId: "",
  emailLocalPart: "",
  password: "",
  confirmPassword: "",
  role: "EMPLOYEE",
  branchId: "",
  isActive: true,
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  EMPLOYEE: "Employee",
};

function localPart(email: string) {
  return email.replace(/@vodafone\.com\.eg$/i, "");
}

function userToForm(user: User): UserForm {
  return {
    name: user.name,
    username: user.username || "",
    vpnNum: user.vpnNum || "",
    staffId: user.staffId || "",
    emailLocalPart: localPart(user.email),
    password: "",
    confirmPassword: "",
    role: user.role,
    branchId: user.branchId || "",
    isActive: user.isActive,
  };
}

export default function UsersClient({ users: initialUsers, branches }: { users: User[]; branches: Branch[] }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const filteredUsers = useMemo(() => {
    const search = query.trim().toLowerCase();
    return users.filter((user) => {
      const matchesBranch = branchFilter ? user.branchId === branchFilter : true;
      const haystack = [
        user.name,
        user.email,
        user.username || "",
        user.vpnNum || "",
        user.staffId || "",
        user.branch?.name || "",
      ].join(" ").toLowerCase();
      return matchesBranch && (!search || haystack.includes(search));
    });
  }, [users, query, branchFilter]);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    setForm(userToForm(user));
    setModalOpen(true);
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
    const method = editingUser ? "PATCH" : "POST";
    const body = editingUser && !form.password
      ? { ...form, password: undefined, confirmPassword: undefined }
      : form;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "User save failed");

      setUsers((current) => editingUser
        ? current.map((user) => user.id === editingUser.id ? data.user : user)
        : [data.user, ...current]);
      setModalOpen(false);
      setForm(emptyForm);
      showMessage(editingUser ? "User updated successfully" : "User created successfully", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "User save failed", "error");
    }

    setLoading(false);
  }

  async function toggleActive(user: User) {
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setUsers((current) => current.map((item) => item.id === user.id ? data.user : item));
      showMessage(!user.isActive ? "User activated" : "User disabled", "success");
    } catch {
      showMessage("Could not update user status", "error");
    }
  }

  return (
    <div className="users-admin-shell">
      <section className="users-admin-head">
        <div>
          <span>User Management</span>
          <h1>Users</h1>
          <p>{filteredUsers.length} of {users.length} users</p>
        </div>
        <button className="nox-btn nox-btn-primary nox-btn-md" onClick={openCreate} type="button">
          <Plus size={18} />
          Add User
        </button>
      </section>

      {message && (
        <div className={`nox-alert ${message.type === "success" ? "nox-alert-success" : "nox-alert-error"}`}>
          {message.text}
        </div>
      )}

      <section className="nox-card users-filters">
        <label className="users-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, username, VPN, staff ID, email..."
          />
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
          <table className="nox-table users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>VPN num</th>
                <th>Staff ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong></td>
                  <td>{user.username || "-"}</td>
                  <td>{user.vpnNum || "-"}</td>
                  <td>{user.staffId || "-"}</td>
                  <td>{user.email}</td>
                  <td><span className="users-role-pill">{roleLabels[user.role]}</span></td>
                  <td>{user.branch?.name || "Unassigned"}</td>
                  <td>
                    <span className={user.isActive ? "users-status active" : "users-status disabled"}>
                      {user.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className="users-actions">
                      <button className="nox-btn nox-btn-ghost nox-btn-sm" type="button" onClick={() => openEdit(user)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="nox-btn nox-btn-ghost nox-btn-sm" type="button" onClick={() => toggleActive(user)}>
                        <UserCheck size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", color: "var(--nox-text-muted)" }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="users-modal" onClick={() => setModalOpen(false)}>
          <form className="users-modal-card" onSubmit={submitForm} onClick={(event) => event.stopPropagation()}>
            <div className="users-modal-head">
              <div>
                <span>{editingUser ? "Edit User" : "Create User"}</span>
                <h2>{editingUser ? editingUser.name : "New account"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div className="users-form-grid">
              <FormInput label="Full name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} required />
              <FormInput label="Username" value={form.username} onChange={(value) => setForm((current) => ({ ...current, username: value }))} required />
              <FormInput label="VPN num" value={form.vpnNum} onChange={(value) => setForm((current) => ({ ...current, vpnNum: value }))} required />
              <FormInput label="Staff ID" value={form.staffId} onChange={(value) => setForm((current) => ({ ...current, staffId: value }))} required />

              <label className="users-field">
                <span>Vodafone email</span>
                <div className="users-email-input">
                  <input
                    value={form.emailLocalPart}
                    onChange={(event) => setForm((current) => ({ ...current, emailLocalPart: event.target.value }))}
                    required
                    placeholder="first.last"
                  />
                  <em>@vodafone.com.eg</em>
                </div>
              </label>

              <label className="users-field">
                <span>Role</span>
                <select className="nox-input" value={form.role} onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as Role }))}>
                  <option value="EMPLOYEE">Employee</option>
                  <option value="TEAM_LEADER">Team Leader</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </label>

              <label className="users-field">
                <span>Branch</span>
                <select className="nox-input" value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
                  <option value="">No branch</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
                  ))}
                </select>
              </label>

              <label className="users-field">
                <span>Status</span>
                <select className="nox-input" value={form.isActive ? "active" : "disabled"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>

              <FormInput
                label={editingUser ? "New password" : "Password"}
                type="password"
                value={form.password}
                onChange={(value) => setForm((current) => ({ ...current, password: value }))}
                required={!editingUser}
              />
              <FormInput
                label="Confirm password"
                type="password"
                value={form.confirmPassword}
                onChange={(value) => setForm((current) => ({ ...current, confirmPassword: value }))}
                required={!editingUser || !!form.password}
              />
            </div>

            <div className="users-modal-actions">
              <button className="nox-btn nox-btn-ghost nox-btn-lg" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="nox-btn nox-btn-primary nox-btn-lg" type="submit" disabled={loading}>
                {loading ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label className="users-field">
      <span>{label}</span>
      <input className="nox-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

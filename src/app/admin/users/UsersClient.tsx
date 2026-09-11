"use client";

import { Check, ChevronLeft, ChevronRight, Edit3, Loader2, Plus, Search, ShieldCheck, Trash2, UserCheck, X } from "lucide-react";
import { useMemo, useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";

type Branch = {
  id: string;
  name: string;
  code: string | null;
  areaId?: string | null;
};

type Area = {
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
  areaId: string | null;
  branch: Branch | null;
  area: Area | null;
  isMaster: boolean;
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
  areaId: string;
  isMaster: boolean;
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
  areaId: "",
  isMaster: false,
  isActive: true,
};

const roleLabels: Record<Role, string> = {
  ADMIN: "Admin",
  AREA_MANAGER: "Area Manager",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  EMPLOYEE: "Employee",
};

const steps = [
  { title: "Basic data", subtitle: "Identity and unique account fields" },
  { title: "Role setup", subtitle: "Access scope and store assignment" },
  { title: "Password", subtitle: "Secure account credentials" },
];

const conflictLabels: Record<string, string> = {
  username: "Username",
  vpnNum: "VPN num",
  staffId: "Staff ID",
  email: "Vodafone email",
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
    areaId: user.areaId || "",
    isMaster: user.role === "EMPLOYEE" && user.isMaster,
    isActive: user.isActive,
  };
}

function isIdentityValid(form: UserForm) {
  return Boolean(
    form.name.trim().length >= 2 &&
    /^[a-zA-Z0-9._-]{3,40}$/.test(form.username.trim()) &&
    form.vpnNum.trim() &&
    form.staffId.trim() &&
    /^[a-zA-Z0-9._-]+$/.test(form.emailLocalPart.trim()),
  );
}

function isPasswordValid(form: UserForm, editing: boolean) {
  if (editing && !form.password && !form.confirmPassword) return true;
  return form.password.length >= 6 && form.password === form.confirmPassword;
}

export default function UsersClient({
  users: initialUsers,
  branches,
  areas,
  currentRole = "ADMIN",
  currentAreaId = null,
}: {
  users: User[];
  branches: Branch[];
  areas: Area[];
  currentRole?: Role;
  currentAreaId?: string | null;
}) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [checkingIdentity, setCheckingIdentity] = useState(false);
  const [identityChecked, setIdentityChecked] = useState(false);
  const [identityConflicts, setIdentityConflicts] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [modalMessage, setModalMessage] = useState("");
  const [query, setQuery] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const roleOptions = useMemo<Role[]>(() => (
    currentRole === "ADMIN"
      ? ["EMPLOYEE", "TEAM_LEADER", "MANAGER", "AREA_MANAGER", "ADMIN"]
      : ["EMPLOYEE", "TEAM_LEADER", "MANAGER"]
  ), [currentRole]);

  const selectedBranch = useMemo(
    () => branches.find((branch) => branch.id === form.branchId) || null,
    [branches, form.branchId],
  );

  const selectedAreaId = form.role === "AREA_MANAGER"
    ? form.areaId
    : selectedBranch?.areaId || (currentRole === "AREA_MANAGER" ? currentAreaId || "" : "");

  const selectedArea = useMemo(
    () => areas.find((area) => area.id === selectedAreaId) || null,
    [areas, selectedAreaId],
  );

  const visibleBranches = useMemo(() => (
    branches.filter((branch) => currentRole === "AREA_MANAGER" ? branch.areaId === currentAreaId : true)
  ), [branches, currentAreaId, currentRole]);

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
        user.area?.name || "",
      ].join(" ").toLowerCase();
      return matchesBranch && (!search || haystack.includes(search));
    });
  }, [users, query, branchFilter]);

  function showMessage(text: string, type: "success" | "error") {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  }

  function resetWizard(nextForm = emptyForm) {
    setForm(nextForm);
    setStep(0);
    setIdentityChecked(false);
    setIdentityConflicts([]);
    setModalMessage("");
  }

  function openCreate() {
    setEditingUser(null);
    resetWizard({ ...emptyForm, areaId: currentRole === "AREA_MANAGER" ? currentAreaId || "" : "" });
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setEditingUser(user);
    resetWizard(userToForm(user));
    setModalOpen(true);
  }

  function updateIdentity(patch: Partial<UserForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setIdentityChecked(false);
    setIdentityConflicts([]);
    setModalMessage("");
  }

  function setRole(role: Role) {
    setForm((current) => ({
      ...current,
      role,
      branchId: role === "AREA_MANAGER" || role === "ADMIN" ? "" : current.branchId,
      areaId: role === "AREA_MANAGER" ? current.areaId : "",
      isMaster: role === "EMPLOYEE" ? current.isMaster : false,
    }));
    setModalMessage("");
  }

  async function checkIdentity() {
    if (!isIdentityValid(form)) {
      setModalMessage("Complete name, username, VPN num, Staff ID, and Vodafone email first.");
      return false;
    }

    setCheckingIdentity(true);
    setModalMessage("");
    try {
      const params = new URLSearchParams({
        username: form.username.trim(),
        vpnNum: form.vpnNum.trim(),
        staffId: form.staffId.trim(),
        emailLocalPart: form.emailLocalPart.trim(),
      });
      if (editingUser) params.set("excludeId", editingUser.id);
      const res = await fetch(`/api/admin/users/check?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not validate account data");
      const conflicts = Array.isArray(data.conflicts) ? data.conflicts : [];
      setIdentityConflicts(conflicts);
      setIdentityChecked(conflicts.length === 0);
      if (conflicts.length) {
        setModalMessage(`${conflicts.map((key: string) => conflictLabels[key] || key).join(", ")} already exists.`);
        return false;
      }
      return true;
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : "Could not validate account data");
      return false;
    } finally {
      setCheckingIdentity(false);
    }
  }

  function validateRoleStep() {
    if (form.role === "AREA_MANAGER") {
      if (!form.areaId) {
        setModalMessage("Select the Area for this Area Manager.");
        return false;
      }
      return true;
    }
    if (form.role === "ADMIN") return true;
    if (!form.branchId) {
      setModalMessage("Select the Store for this role.");
      return false;
    }
    return true;
  }

  async function goNext() {
    if (step === 0) {
      const ok = identityChecked && !identityConflicts.length ? true : await checkIdentity();
      if (!ok) return;
    }
    if (step === 1 && !validateRoleStep()) return;
    setModalMessage("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function buildSubmitBody() {
    const branchAreaId = selectedBranch?.areaId || "";
    return {
      ...form,
      username: form.username.trim(),
      vpnNum: form.vpnNum.trim(),
      staffId: form.staffId.trim(),
      emailLocalPart: form.emailLocalPart.trim(),
      branchId: form.role === "AREA_MANAGER" || form.role === "ADMIN" ? "" : form.branchId,
      areaId: form.role === "AREA_MANAGER" ? form.areaId : branchAreaId,
      isMaster: form.role === "EMPLOYEE" ? form.isMaster : false,
    };
  }

  async function submitForm(event: React.FormEvent) {
    event.preventDefault();
    if (!isPasswordValid(form, Boolean(editingUser))) {
      setModalMessage("Password must be at least 6 characters and match confirmation.");
      return;
    }

    setLoading(true);
    setModalMessage("");

    const url = editingUser ? `/api/admin/users/${editingUser.id}` : "/api/admin/users";
    const method = editingUser ? "PATCH" : "POST";
    const prepared = buildSubmitBody();
    const body = editingUser && !prepared.password
      ? { ...prepared, password: undefined, confirmPassword: undefined }
      : prepared;

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
      resetWizard();
      showMessage(editingUser ? "User updated successfully" : "User created successfully", "success");
    } catch (error) {
      setModalMessage(error instanceof Error ? error.message : "User save failed");
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

  async function deleteUser(user: User) {
    if (!confirm(`Delete ${user.name}? This only works if the user has no reports or logs.`)) return;
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not delete user");
      setUsers((current) => current.filter((item) => item.id !== user.id));
      showMessage("User deleted", "success");
    } catch (error) {
      showMessage(error instanceof Error ? error.message : "Could not delete user", "error");
    }
  }

  return (
    <div className="users-admin-shell">
      <section className="users-admin-head">
        <div>
          <span>{currentRole === "AREA_MANAGER" ? "Partners Users" : "User Management"}</span>
          <h1>Users</h1>
          <p>{filteredUsers.length} of {users.length} users</p>
        </div>
        <button className="vf-btn vf-btn-primary vf-btn-md" onClick={openCreate} type="button">
          <Plus size={18} />
          Add User
        </button>
      </section>

      {message && (
        <div className={`vf-alert ${message.type === "success" ? "vf-alert-success" : "vf-alert-error"}`}>
          {message.text}
        </div>
      )}

      <section className="vf-card users-filters">
        <label className="users-search">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, username, VPN, staff ID, email..."
          />
        </label>
        <select className="vf-input" value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
          <option value="">All stores</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
          ))}
        </select>
      </section>

      <section className="vf-card users-table-card">
        <div className="users-table-wrap">
          <table className="vf-table users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Username</th>
                <th>VPN num</th>
                <th>Staff ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Class</th>
                <th>Store</th>
                <th>Area</th>
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
                  <td>
                    {user.role === "EMPLOYEE" && user.isMaster ? (
                      <span className="users-master-pill">Master</span>
                    ) : user.role === "EMPLOYEE" ? (
                      <span className="users-muted-pill">Standard</span>
                    ) : (
                      <span className="users-muted-pill">-</span>
                    )}
                  </td>
                  <td>{user.branch?.name || "Unassigned"}</td>
                  <td>{user.area?.name || "Unassigned"}</td>
                  <td>
                    <span className={user.isActive ? "users-status active" : "users-status disabled"}>
                      {user.isActive ? "Active" : "Disabled"}
                    </span>
                  </td>
                  <td>
                    <div className="users-actions">
                      <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => openEdit(user)}>
                        <Edit3 size={15} />
                      </button>
                      <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => toggleActive(user)}>
                        <UserCheck size={15} />
                      </button>
                      <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => deleteUser(user)} style={{ color: "#f87171" }}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={11} style={{ textAlign: "center", color: "var(--vf-text-muted)" }}>No users found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && (
        <div className="users-modal" onClick={() => setModalOpen(false)}>
          <form className="users-modal-card users-wizard-card" onSubmit={submitForm} onClick={(event) => event.stopPropagation()}>
            <div className="users-modal-head">
              <div>
                <span>{editingUser ? "Edit User" : "Create User"}</span>
                <h2>{editingUser ? editingUser.name : "New account"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            <div
              className="users-stepper"
              aria-label="User creation progress"
              style={{ "--wizard-progress": String(step / Math.max(steps.length - 1, 1)) } as React.CSSProperties}
            >
              {steps.map((item, index) => (
                <div key={item.title} className={`users-step ${index === step ? "active" : ""} ${index < step ? "done" : ""}`}>
                  <span>{index < step ? <Check size={14} /> : index + 1}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <em>{item.subtitle}</em>
                  </div>
                </div>
              ))}
            </div>

            {modalMessage && <div className="vf-alert vf-alert-error">{modalMessage}</div>}

            <div className="users-wizard-panel" key={step}>
              {step === 0 && (
                <div className="users-form-grid">
                  <FormInput label="Full name" value={form.name} onChange={(value) => updateIdentity({ name: value })} required />
                  <FormInput label="Username" value={form.username} onChange={(value) => updateIdentity({ username: value })} required />
                  <FormInput label="VPN num" value={form.vpnNum} onChange={(value) => updateIdentity({ vpnNum: value })} required />
                  <FormInput label="Staff ID" value={form.staffId} onChange={(value) => updateIdentity({ staffId: value })} required />
                  <label className="users-field users-wide-field">
                    <span>Vodafone email</span>
                    <div className="users-email-input">
                      <input
                        value={form.emailLocalPart}
                        onChange={(event) => updateIdentity({ emailLocalPart: event.target.value })}
                        required
                        placeholder="first.last"
                      />
                      <em>@vodafone.com.eg</em>
                    </div>
                  </label>
                  <div className={`users-identity-check ${identityChecked ? "ok" : identityConflicts.length ? "bad" : ""}`}>
                    <ShieldCheck size={18} />
                    <div>
                      <strong>{identityChecked ? "Account data is available" : "Uniqueness check"}</strong>
                      <span>Username, VPN num, Staff ID, and Vodafone email are checked before continuing.</span>
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="users-role-step">
                  <div className="users-role-grid">
                    {roleOptions.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className={`users-role-card ${form.role === role ? "active" : ""}`}
                        onClick={() => setRole(role)}
                      >
                        <strong>{roleLabels[role]}</strong>
                        <span>
                          {role === "AREA_MANAGER"
                            ? "Partners area access without store assignment"
                            : role === "ADMIN"
                              ? "Full system access"
                              : "Store-based access with automatic area scope"}
                        </span>
                      </button>
                    ))}
                  </div>

                  {form.role === "AREA_MANAGER" && (
                    <label className="users-field">
                      <span>Area</span>
                      <select className="vf-input" value={form.areaId} onChange={(event) => setForm((current) => ({ ...current, areaId: event.target.value }))}>
                        <option value="">Select area</option>
                        {areas.map((area) => (
                          <option key={area.id} value={area.id}>{area.name}{area.code ? ` (${area.code})` : ""}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {form.role !== "AREA_MANAGER" && form.role !== "ADMIN" && (
                    <>
                      <label className="users-field">
                        <span>Store</span>
                        <select className="vf-input" value={form.branchId} onChange={(event) => setForm((current) => ({ ...current, branchId: event.target.value }))}>
                          <option value="">Select store</option>
                          {visibleBranches.map((branch) => (
                            <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
                          ))}
                        </select>
                      </label>
                      <div className="users-auto-area">
                        <span>Automatic area</span>
                        <strong>{selectedArea?.name || "Select a store first"}</strong>
                      </div>
                    </>
                  )}

                  {form.role === "EMPLOYEE" && (
                    <label className="users-check-field">
                      <input
                        type="checkbox"
                        checked={form.isMaster}
                        onChange={(event) => setForm((current) => ({ ...current, isMaster: event.target.checked }))}
                      />
                      <span>
                        <strong>Master class</strong>
                        <em>Only employees can be marked as Master for shift schedule rules.</em>
                      </span>
                    </label>
                  )}

                  <label className="users-field">
                    <span>Status</span>
                    <select className="vf-input" value={form.isActive ? "active" : "disabled"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </label>
                </div>
              )}

              {step === 2 && (
                <div className="users-form-grid">
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
                  <div className="users-review-box users-wide-field">
                    <span>Review</span>
                    <strong>{form.name || "New account"} - {roleLabels[form.role]}</strong>
                    <em>
                      {form.role === "AREA_MANAGER"
                        ? `Area: ${selectedArea?.name || "not selected"}`
                        : form.role === "ADMIN"
                          ? "System admin account"
                          : `Store: ${selectedBranch?.name || "not selected"} | Area: ${selectedArea?.name || "not selected"}`}
                    </em>
                  </div>
                </div>
              )}
            </div>

            <div className="users-modal-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={() => step === 0 ? setModalOpen(false) : setStep((current) => current - 1)}>
                {step === 0 ? <X size={18} /> : <ChevronLeft size={18} />}
                {step === 0 ? "Cancel" : "Back"}
              </button>
              {step < steps.length - 1 ? (
                <button className="vf-btn vf-btn-primary vf-btn-lg" type="button" onClick={goNext} disabled={checkingIdentity}>
                  {checkingIdentity ? <Loader2 className="daily-spin" size={18} /> : <ChevronRight size={18} />}
                  {step === 0 ? "Check and continue" : "Continue"}
                </button>
              ) : (
                <button className="vf-btn vf-btn-primary vf-btn-lg" type="submit" disabled={loading}>
                  {loading ? <Loader2 className="daily-spin" size={18} /> : <Check size={18} />}
                  {loading ? "Saving..." : editingUser ? "Save Changes" : "Create User"}
                </button>
              )}
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
      <input className="vf-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} />
    </label>
  );
}

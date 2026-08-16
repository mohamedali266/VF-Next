"use client";

import { Edit3, Plus, Store, Trash2, X } from "lucide-react";
import { useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "ADMIN";

type StoreUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
};

type StoreItem = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  users: StoreUser[];
};

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  MANAGER: "Manager",
  TEAM_LEADER: "Team Leader",
  EMPLOYEE: "Agent",
};

const ROLE_ORDER: Role[] = ["MANAGER", "TEAM_LEADER", "EMPLOYEE", "ADMIN"];

export default function BranchesClient({ branches: initialStores }: { branches: StoreItem[] }) {
  const [stores, setStores] = useState(initialStores);
  const [form, setForm] = useState({ name: "", code: "", isActive: true });
  const [editing, setEditing] = useState<StoreItem | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", isActive: true });
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(store: StoreItem) {
    setEditing(store);
    setForm({ name: store.name, code: store.code || "", isActive: store.isActive });
    setMessage("");
    setModalOpen(true);
  }

  async function saveStore(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch(editing ? `/api/admin/branches/${editing.id}` : "/api/admin/branches", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save store");
      setStores((prev) => {
        const next = editing ? prev.map((store) => store.id === editing.id ? data.branch : store) : [...prev, data.branch];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save store");
    } finally {
      setLoading(false);
    }
  }

  async function deleteStore(store: StoreItem) {
    if (!confirm(`Delete ${store.name}? This only works if no users or reports are linked.`)) return;
    const res = await fetch(`/api/admin/branches/${store.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Failed to delete store");
      return;
    }
    setStores((prev) => prev.filter((item) => item.id !== store.id));
  }

  return (
    <div className="stores-admin-shell">
      <section className="users-admin-head">
        <div>
          <span>Stores</span>
          <h1>Store Management</h1>
          <p>Create stores and review each store team.</p>
        </div>
        <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={openCreate}>
          <Plus size={18} />
          Add Store
        </button>
      </section>

      {message && <div className="vf-alert vf-alert-error">{message}</div>}

      <section className="stores-grid">
        {stores.map((store) => (
          <article key={store.id} className="vf-card store-card">
            <div className="store-card-head">
              <div className="store-icon"><Store size={20} /></div>
              <div>
                <h2>{store.name}</h2>
                <p>{store.code || "No code"} | {store.users.length} users</p>
              </div>
              <span className={store.isActive ? "users-status active" : "users-status disabled"}>
                {store.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="store-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => openEdit(store)}>
                <Edit3 size={15} />
                Edit
              </button>
              <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => deleteStore(store)} style={{ color: "#f87171" }}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>

            <div className="store-team">
              {ROLE_ORDER.map((role) => {
                const members = store.users.filter((user) => user.role === role);
                if (!members.length) return null;
                return (
                  <div key={role}>
                    <strong>{ROLE_LABELS[role]}</strong>
                    {members.map((user) => (
                      <div key={user.id} className="store-member" style={{ opacity: user.isActive ? 1 : 0.5 }}>
                        <span>{user.name}</span>
                        <em>{user.email}</em>
                      </div>
                    ))}
                  </div>
                );
              })}
              {!store.users.length && <p>No users assigned. Assign users from Admin Users.</p>}
            </div>
          </article>
        ))}
      </section>

      {modalOpen && (
        <div className="users-modal" onClick={() => setModalOpen(false)}>
          <form className="users-modal-card" onSubmit={saveStore} onClick={(event) => event.stopPropagation()}>
            <div className="users-modal-head">
              <div>
                <span>{editing ? "Edit Store" : "Create Store"}</span>
                <h2>{editing ? editing.name : "New store"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>

            <div className="users-form-grid">
              <label className="users-field">
                <span>Store name</span>
                <input className="vf-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Amerya Koubry Store" />
              </label>
              <label className="users-field">
                <span>Store code</span>
                <input className="vf-input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="AMR" />
              </label>
              <label className="users-field">
                <span>Status</span>
                <select className="vf-input" value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>

            <div className="users-modal-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="vf-btn vf-btn-primary vf-btn-lg" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Store"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

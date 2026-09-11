"use client";

import { Edit3, Layers3, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

type Area = {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
  branches: BranchOption[];
  users: { id: string; name: string; email: string; role: string; isActive: boolean }[];
};

type BranchOption = {
  id: string;
  name: string;
  code: string | null;
  areaId: string | null;
};

export default function AreasClient({ areas: initialAreas, branches: initialBranches }: { areas: Area[]; branches: BranchOption[] }) {
  const [areas, setAreas] = useState(initialAreas);
  const [branches, setBranches] = useState(initialBranches);
  const [editing, setEditing] = useState<Area | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", isActive: true, branchIds: [] as string[] });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const selectableBranches = branches.filter((branch) => !branch.areaId || branch.areaId === editing?.id);

  function openCreate() {
    setEditing(null);
    setForm({ name: "", code: "", isActive: true, branchIds: [] });
    setMessage("");
    setModalOpen(true);
  }

  function openEdit(area: Area) {
    setEditing(area);
    setForm({ name: area.name, code: area.code || "", isActive: area.isActive, branchIds: area.branches.map((branch) => branch.id) });
    setMessage("");
    setModalOpen(true);
  }

  function toggleBranch(branchId: string) {
    setForm((current) => ({
      ...current,
      branchIds: current.branchIds.includes(branchId)
        ? current.branchIds.filter((id) => id !== branchId)
        : [...current.branchIds, branchId],
    }));
  }

  async function saveArea(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch(editing ? `/api/admin/areas/${editing.id}` : "/api/admin/areas", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save area");
      setAreas((current) => {
        const next = editing ? current.map((area) => area.id === editing.id ? data.area : area) : [...current, data.area];
        return next.sort((a, b) => a.name.localeCompare(b.name));
      });
      setBranches((current) => current.map((branch) => ({
        ...branch,
        areaId: data.area.branches.some((item: BranchOption) => item.id === branch.id)
          ? data.area.id
          : branch.areaId === data.area.id
            ? null
            : branch.areaId,
      })));
      setModalOpen(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to save area");
    } finally {
      setLoading(false);
    }
  }

  async function deleteArea(area: Area) {
    if (!confirm(`Delete ${area.name}? This only works if no stores or users are linked.`)) return;
    const res = await fetch(`/api/admin/areas/${area.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage(data.error || "Failed to delete area");
      return;
    }
    setAreas((current) => current.filter((item) => item.id !== area.id));
  }

  return (
    <div className="stores-admin-shell">
      <section className="users-admin-head">
        <div>
          <span>Partners</span>
          <h1>Area Management</h1>
          <p>Create areas and keep stores separated by area.</p>
        </div>
        <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={openCreate}>
          <Plus size={18} />
          Add Area
        </button>
      </section>

      {message && <div className="vf-alert vf-alert-error">{message}</div>}

      <section className="stores-grid">
        {areas.map((area) => (
          <article key={area.id} className="vf-card store-card">
            <div className="store-card-head">
              <div className="store-icon"><Layers3 size={20} /></div>
              <div>
                <h2>{area.name}</h2>
                <p>{area.code || "No code"} | {area.branches.length} stores | {area.users.length} users</p>
              </div>
              <span className={area.isActive ? "users-status active" : "users-status disabled"}>
                {area.isActive ? "Active" : "Inactive"}
              </span>
            </div>

            <div className="store-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => openEdit(area)}>
                <Edit3 size={15} />
                Edit
              </button>
              <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => deleteArea(area)} style={{ color: "#f87171" }}>
                <Trash2 size={15} />
                Delete
              </button>
            </div>

            <div className="store-team">
              <strong>Stores</strong>
              {area.branches.map((branch) => (
                <div key={branch.id} className="store-member">
                  <span>{branch.name}</span>
                  <em>{branch.code || "No code"}</em>
                </div>
              ))}
              {!area.branches.length && <p>No stores linked to this area.</p>}
            </div>
          </article>
        ))}
      </section>

      {modalOpen && (
        <div className="users-modal" onClick={() => setModalOpen(false)}>
          <form className="users-modal-card" onSubmit={saveArea} onClick={(event) => event.stopPropagation()}>
            <div className="users-modal-head">
              <div>
                <span>{editing ? "Edit Area" : "Create Area"}</span>
                <h2>{editing ? editing.name : "New area"}</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <div className="users-form-grid">
              <label className="users-field">
                <span>Area name</span>
                <input className="vf-input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required placeholder="Alex Partners" />
              </label>
              <label className="users-field">
                <span>Area code</span>
                <input className="vf-input" value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="ALX-P" />
              </label>
              <label className="users-field">
                <span>Status</span>
                <select className="vf-input" value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <div className="area-branch-picker users-wide-field">
                <div className="area-branch-picker-head">
                  <div>
                    <span>Stores inside this area</span>
                    <strong>{form.branchIds.length} selected</strong>
                  </div>
                  <em>Stores linked to another area are hidden.</em>
                </div>
                <div className="area-branch-list">
                  {selectableBranches.map((branch) => (
                    <label key={branch.id} className={`area-branch-option ${form.branchIds.includes(branch.id) ? "selected" : ""}`}>
                      <input
                        type="checkbox"
                        checked={form.branchIds.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                      />
                      <span>{branch.name}</span>
                      <em>{branch.code || "No code"}</em>
                    </label>
                  ))}
                  {!selectableBranches.length && <p>No unassigned stores available.</p>}
                </div>
              </div>
            </div>
            <div className="users-modal-actions">
              <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="vf-btn vf-btn-primary vf-btn-lg" type="submit" disabled={loading}>{loading ? "Saving..." : "Save Area"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

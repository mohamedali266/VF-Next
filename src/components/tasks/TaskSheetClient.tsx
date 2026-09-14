"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CopyPlus, Loader2, Plus, Printer, Save, Trash2 } from "lucide-react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";
type Shift = "AM" | "PM" | "BW";
type ItemStatus = "PENDING" | "DONE" | "MISSED" | "NA";

type BranchOption = { id: string; name: string; code: string | null };
type Member = { id: string; name: string; role: Role; isMaster: boolean; staffId?: string | null; vpnNum?: string | null };
type GroupItem = { id: string; title: string; description: string; sortOrder: number };
type TaskGroup = { id: string; title: string; scope: "BRANCH" | "AREA"; shift: Shift | null; items: GroupItem[] };
type SheetItem = {
  id?: string;
  templateItemId?: string | null;
  title: string;
  description: string;
  assignedToId: string;
  status: ItemStatus;
};

type SheetPayload = {
  id: string;
  date: string;
  shift: Shift;
  status: "DRAFT" | "SUBMITTED";
  shiftLeaderId: string | null;
  sourceGroupId?: string | null;
  shiftLeader?: { id: string; name: string } | null;
  items: Array<{
    id: string;
    templateItemId: string | null;
    title: string;
    description: string;
    assignedToId: string | null;
    status: ItemStatus;
  }>;
};

type TaskResponse = {
  branch: BranchOption;
  members: Member[];
  shiftLeaders: Member[];
  groups: TaskGroup[];
  sheet: SheetPayload | null;
  canManage: boolean;
};

const STATUS_LABELS: Record<ItemStatus, string> = {
  PENDING: "[  ]",
  DONE: "[✓]",
  MISSED: "[x]",
  NA: "[n/a]",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(date: string) {
  const [year, month, day] = date.split("-");
  return `${Number(day)} / ${Number(month)} / ${year}`;
}

function blankTask(): SheetItem {
  return { title: "", description: "", assignedToId: "", status: "PENDING" };
}

export default function TaskSheetClient({
  branches,
  defaultBranchId,
  currentRole,
}: {
  branches: BranchOption[];
  defaultBranchId: string;
  currentRole: Role;
}) {
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [date, setDate] = useState(todayKey());
  const [shift, setShift] = useState<Shift>("PM");
  const [data, setData] = useState<TaskResponse | null>(null);
  const [items, setItems] = useState<SheetItem[]>([]);
  const [shiftLeaderId, setShiftLeaderId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedBranch = data?.branch || branches.find((branch) => branch.id === branchId) || null;
  const selectedGroup = data?.groups.find((group) => group.id === selectedGroupId) || null;
  const canEdit = Boolean(data?.canManage);
  const completedCount = items.filter((item) => item.status === "DONE").length;

  const memberMap = useMemo(() => {
    const map = new Map<string, Member>();
    (data?.members || []).forEach((member) => map.set(member.id, member));
    return map;
  }, [data?.members]);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      setMessage("No store is available for task sheets.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const params = new URLSearchParams({ branchId, date, shift });
      const res = await fetch(`/api/tasks?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load tasks");
      setData(json);
      setSelectedGroupId(json.sheet?.sourceGroupId || json.groups[0]?.id || "");
      setShiftLeaderId(json.sheet?.shiftLeaderId || "");
      setItems(json.sheet
        ? json.sheet.items.map((item: SheetPayload["items"][number]) => ({
            id: item.id,
            templateItemId: item.templateItemId,
            title: item.title,
            description: item.description,
            assignedToId: item.assignedToId || "",
            status: item.status,
          }))
        : (json.groups[0]?.items || []).map((item: GroupItem) => ({
            templateItemId: item.id,
            title: item.title,
            description: item.description,
            assignedToId: "",
            status: "PENDING",
          })));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load tasks");
    } finally {
      setLoading(false);
    }
  }, [branchId, date, shift]);

  useEffect(() => { void load(); }, [load]);

  function applyGroup(groupId: string) {
    const group = data?.groups.find((item) => item.id === groupId);
    setSelectedGroupId(groupId);
    if (!group) return;
    setItems(group.items.map((item) => ({
      templateItemId: item.id,
      title: item.title,
      description: item.description,
      assignedToId: "",
      status: "PENDING",
    })));
  }

  function updateItem(index: number, patch: Partial<SheetItem>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function addItem() {
    setItems((current) => [...current, blankTask()]);
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function saveSheet(submit = false) {
    if (!branchId) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId,
          date,
          shift,
          shiftLeaderId,
          sourceGroupId: selectedGroupId,
          submit,
          items: items.filter((item) => item.title.trim()).map((item) => ({
            templateItemId: item.templateItemId,
            title: item.title,
            description: item.description,
            assignedToId: item.assignedToId,
            status: item.status,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save task sheet");
      setMessage(submit ? "Task sheet submitted successfully." : "Task sheet saved.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save task sheet");
    } finally {
      setSaving(false);
    }
  }

  async function saveAsGroup() {
    const title = prompt("Task group name", selectedGroup?.title || `${selectedBranch?.name || "Store"} ${shift} Tasks`);
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch("/api/task-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          scope: currentRole === "AREA_MANAGER" ? "AREA" : "BRANCH",
          branchId,
          shift,
          items: items.filter((item) => item.title.trim()).map((item) => ({ title: item.title, description: item.description })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save task group");
      setMessage("Task group saved. Reloading templates...");
      await load();
      if (json.group?.id) setSelectedGroupId(json.group.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save task group");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="task-shell">
      <section className="daily-hero task-hero">
        <div>
          <p>Daily Tasks</p>
          <h1>Tasks Checklist</h1>
          <span>All store employees can view the full daily task sheet. Authorized leaders can assign and edit tasks.</span>
        </div>
        <div className="daily-score">
          <strong>{completedCount}/{items.length || 0}</strong>
          <span>Completed</span>
        </div>
      </section>

      <section className="vf-card task-controls">
        <label>
          <span>Store</span>
          <select className="vf-input" value={branchId} onChange={(event) => setBranchId(event.target.value)} disabled={branches.length <= 1}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Date</span>
          <input className="vf-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label>
          <span>Shift</span>
          <select className="vf-input" value={shift} onChange={(event) => setShift(event.target.value as Shift)}>
            <option value="AM">AM</option>
            <option value="PM">PM</option>
            <option value="BW">BW</option>
          </select>
        </label>
        <label>
          <span>Task group</span>
          <select className="vf-input" value={selectedGroupId} onChange={(event) => applyGroup(event.target.value)} disabled={!canEdit}>
            {(data?.groups || []).map((group) => (
              <option key={group.id} value={group.id}>{group.title}{group.scope === "AREA" ? " - Area" : ""}</option>
            ))}
          </select>
        </label>
      </section>

      {message && <div className={`vf-alert ${message.includes("Could") || message.includes("outside") || message.includes("Invalid") ? "vf-alert-error" : "vf-alert-success"}`}>{message}</div>}

      {loading ? (
        <div className="vf-card task-loading"><Loader2 className="daily-spin" /> Loading tasks...</div>
      ) : (
        <>
          <section className="vf-card task-editor">
            <div className="task-editor-head">
              <div>
                <span>{data?.sheet?.status || "DRAFT"}</span>
                <h2>{selectedBranch?.name || "Store"} - {shift} Tasks</h2>
                <p>{formatDisplayDate(date)}</p>
              </div>
              <div className="task-actions">
                <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => window.print()}>
                  <Printer size={17} /> Print
                </button>
                {canEdit && (
                  <>
                    <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={saveAsGroup} disabled={saving}>
                      <CopyPlus size={17} /> Save group
                    </button>
                    <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => saveSheet(false)} disabled={saving}>
                      <Save size={17} /> Save
                    </button>
                    <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={() => saveSheet(true)} disabled={saving}>
                      <Check size={17} /> Submit
                    </button>
                  </>
                )}
              </div>
            </div>

            <label className="task-shift-leader">
              <span>Shift Leader</span>
              <select className="vf-input" value={shiftLeaderId} onChange={(event) => setShiftLeaderId(event.target.value)} disabled={!canEdit}>
                <option value="">Select Master employee</option>
                {(data?.shiftLeaders || []).map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </select>
            </label>

            <div className="task-list">
              {items.map((item, index) => (
                <div key={`${item.id || item.templateItemId || "new"}-${index}`} className="task-row-card">
                  <div className="task-row-index">{index + 1}</div>
                  <div className="task-row-body">
                    {canEdit ? (
                      <>
                        <input className="vf-input" value={item.title} onChange={(event) => updateItem(index, { title: event.target.value })} placeholder="Task title" />
                        <textarea className="vf-input" value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} placeholder="Task standard or instructions" />
                      </>
                    ) : (
                      <>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </>
                    )}
                  </div>
                  <div className="task-row-side">
                    <select className="vf-input" value={item.assignedToId} onChange={(event) => updateItem(index, { assignedToId: event.target.value })} disabled={!canEdit}>
                      <option value="">Unassigned</option>
                      {(data?.members || []).map((member) => (
                        <option key={member.id} value={member.id}>{member.name}{member.isMaster ? " - Master" : ""}</option>
                      ))}
                    </select>
                    <select className="vf-input" value={item.status} onChange={(event) => updateItem(index, { status: event.target.value as ItemStatus })} disabled={!canEdit}>
                      <option value="PENDING">Pending</option>
                      <option value="DONE">Done</option>
                      <option value="MISSED">Missed</option>
                      <option value="NA">N/A</option>
                    </select>
                    {canEdit && (
                      <button className="vf-btn vf-btn-ghost vf-btn-sm" type="button" onClick={() => removeItem(index)} style={{ color: "#f87171" }}>
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {canEdit && (
              <button className="vf-btn vf-btn-ghost vf-btn-lg task-add-btn" type="button" onClick={addItem}>
                <Plus size={18} /> Add task
              </button>
            )}
          </section>

          <section className="task-print-sheet">
            <div className="task-print-top">
              <div>
                <h1>DAILY TASKS CHECKLIST</h1>
                <p>Daily Operational & Compliance Task Sign-Off Sheet</p>
              </div>
              <div>
                <strong>VODAFONE</strong>
                <span>STORE OPERATIONS</span>
              </div>
            </div>
            <div className="task-print-meta">
              <b>Date:</b><span>{formatDisplayDate(date)}</span>
              <b>Shift:</b><span>{shift}</span>
              <b>Store:</b><span>{selectedBranch?.name || ""}</span>
              <b>Shift Leader:</b><span>{memberMap.get(shiftLeaderId)?.name || ""}</span>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Task Description & Standard</th>
                  <th>Assigned Employee Name</th>
                  <th>Status</th>
                  <th>Employee Signature</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={`print-${index}`}>
                    <td>{index + 1}</td>
                    <td><strong>{item.title}</strong><span>{item.description}</span></td>
                    <td>{memberMap.get(item.assignedToId)?.name || ""}</td>
                    <td>{STATUS_LABELS[item.status]}</td>
                    <td />
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="task-print-footer">
              <div>
                <p>Shift Leader :</p>
                <p>Name: _________________________</p>
                <p>Signature: ______________________</p>
              </div>
              <div>
                <p>Daily Verification Summary:</p>
                <p>Total Tasks Completed: [ {completedCount} / {items.length} ]</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

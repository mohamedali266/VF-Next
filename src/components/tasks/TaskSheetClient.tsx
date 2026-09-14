"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CopyPlus, Loader2, Plus, Printer, Save, Trash2, X } from "lucide-react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";
type Shift = "AM" | "PM" | "BW";
type ItemStatus = "PENDING" | "DONE" | "MISSED" | "NA";

type BranchOption = { id: string; name: string; code: string | null };
type Member = { id: string; name: string; role: Role; isMaster: boolean; staffId?: string | null; vpnNum?: string | null };
type GroupItem = { id: string; title: string; description: string; sortOrder: number };
type TaskGroup = { id: string; title: string; scope: "BRANCH" | "AREA"; shift: Shift | null; branchId?: string | null; areaId?: string | null; items: GroupItem[] };
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

function taskPrintStyles() {
  return `
    @page { size: A4 portrait; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; }
    .task-print-sheet {
      display: block;
      width: 210mm;
      height: 297mm;
      overflow: hidden;
      padding: 15mm 15mm 12mm;
      background: #fff;
      color: #000;
    }
    .task-print-top { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; margin-bottom: 18px; }
    .task-print-top h1 { color: #000; font-size: 26px; font-weight: 900; letter-spacing: 0; margin: 0 0 6px; }
    .task-print-top p { margin: 0; color: #555; font-size: 13px; font-style: italic; }
    .task-print-top strong { display: block; color: #000; font-size: 25px; font-weight: 900; text-align: end; }
    .task-print-top span { display: block; color: #666; font-size: 12px; font-weight: 800; text-align: end; margin-top: 5px; }
    .task-print-meta {
      display: grid;
      grid-template-columns: 78px 1fr 78px 1fr;
      border-top: 1px solid #bbb;
      border-bottom: 1px solid #bbb;
      margin-bottom: 18px;
    }
    .task-print-meta b,
    .task-print-meta span {
      min-height: 28px;
      display: flex;
      align-items: center;
      border-bottom: 1px solid #ccc;
      padding: 0 8px;
      color: #000;
      font-size: 13px;
    }
    .task-print-meta b { font-weight: 900; }
    .task-print-meta span { border-left: 1px solid #ccc; }
    .task-print-sheet table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    .task-print-sheet th {
      background: #000 !important;
      color: #fff !important;
      box-shadow: inset 0 0 0 9999px #000;
      font-size: 12px;
      font-weight: 900;
      padding: 9px 7px;
      text-align: center;
    }
    .task-print-sheet th:nth-child(1) { width: 7%; }
    .task-print-sheet th:nth-child(2) { width: 34%; }
    .task-print-sheet th:nth-child(3) { width: 22%; }
    .task-print-sheet th:nth-child(4) { width: 12%; }
    .task-print-sheet th:nth-child(5) { width: 25%; }
    .task-print-sheet td {
      border: 1.5px solid #000;
      padding: 7px 8px;
      color: #000;
      vertical-align: middle;
      font-size: 11.5px;
      line-height: 1.22;
    }
    .task-print-sheet tbody tr { height: 24mm; break-inside: avoid; page-break-inside: avoid; }
    .task-print-sheet tbody tr:nth-child(even) td { background: #f4f4f4; }
    .task-print-sheet td:nth-child(1),
    .task-print-sheet td:nth-child(3),
    .task-print-sheet td:nth-child(4) {
      text-align: center;
      font-weight: 900;
      font-size: 14px;
    }
    .task-print-sheet td:nth-child(2) strong { display: block; color: #000; font-size: 13.5px; font-weight: 900; margin-bottom: 4px; }
    .task-print-sheet td:nth-child(2) span { display: block; color: #444; line-height: 1.2; }
    .task-print-footer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-top: 22px;
      border-top: 2px solid #888;
      border-bottom: 2px solid #888;
    }
    .task-print-footer > div { min-height: 82px; padding: 9px; border-right: 1px solid #888; }
    .task-print-footer p { color: #000; font-size: 13px; margin: 0 0 13px; }
    @media print {
      html, body { width: 210mm; height: 297mm; overflow: hidden; }
      .task-print-sheet { break-after: avoid; page-break-after: avoid; }
    }
  `;
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
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupScope, setGroupScope] = useState<"BRANCH" | "AREA">("BRANCH");
  const [groupSelection, setGroupSelection] = useState<number[]>([]);

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

  function openGroupModal() {
    const validIndexes = items
      .map((item, index) => item.title.trim() ? index : -1)
      .filter((index) => index >= 0);
    setGroupTitle(selectedGroup && selectedGroup.id !== "default-operations" ? selectedGroup.title : `${selectedBranch?.name || "Store"} ${shift} Tasks`);
    setGroupScope(currentRole === "AREA_MANAGER" ? "AREA" : "BRANCH");
    setGroupSelection(validIndexes);
    setGroupModalOpen(true);
  }

  function toggleGroupTask(index: number) {
    setGroupSelection((current) => current.includes(index)
      ? current.filter((item) => item !== index)
      : [...current, index].sort((a, b) => a - b));
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
    const selectedItems = groupSelection
      .map((index) => items[index])
      .filter((item) => item?.title.trim());
    if (!groupTitle.trim()) {
      setMessage("Task group name is required.");
      return;
    }
    if (!selectedItems.length) {
      setMessage("Select at least one task to save in the group.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/task-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: groupTitle.trim(),
          scope: groupScope,
          branchId,
          shift,
          items: selectedItems.map((item) => ({ title: item.title, description: item.description })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not save task group");
      setMessage("Task group saved. Reloading templates...");
      setGroupModalOpen(false);
      await load();
      if (json.group?.id) setSelectedGroupId(json.group.id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save task group");
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelectedGroup() {
    if (!selectedGroup || selectedGroup.id === "default-operations") return;
    if (!confirm(`Delete task group "${selectedGroup.title}"? Existing daily sheets will keep their copied tasks.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch(`/api/task-groups/${selectedGroup.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Could not delete task group");
      setMessage("Task group deleted.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not delete task group");
    } finally {
      setSaving(false);
    }
  }

  function printTaskSheet() {
    const printable = document.querySelector(".task-print-sheet");
    if (!printable) return;
    const printWindow = window.open("", "_blank", "width=900,height=1200");
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Daily Tasks Checklist</title>
          <style>${taskPrintStyles()}</style>
        </head>
        <body>${printable.outerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
              <option key={group.id} value={group.id}>{group.title}{group.scope === "AREA" ? " - Area task" : ""}</option>
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
                <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={printTaskSheet}>
                  <Printer size={17} /> Print
                </button>
                {canEdit && (
                  <>
                    <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={openGroupModal} disabled={saving}>
                      <CopyPlus size={17} /> Save group
                    </button>
                    {selectedGroup && selectedGroup.id !== "default-operations" && (
                      <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={deleteSelectedGroup} disabled={saving} style={{ color: "#f87171" }}>
                        <Trash2 size={17} /> Delete group
                      </button>
                    )}
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

          {groupModalOpen && (
            <div className="users-modal" onClick={() => setGroupModalOpen(false)}>
              <div className="users-modal-card task-group-modal" onClick={(event) => event.stopPropagation()}>
                <div className="users-modal-head">
                  <div>
                    <span>Task Group</span>
                    <h2>Save selected tasks</h2>
                  </div>
                  <button type="button" onClick={() => setGroupModalOpen(false)} aria-label="Close">
                    <X size={18} />
                  </button>
                </div>

                <div className="task-group-form">
                  <label className="users-field users-wide-field">
                    <span>Group name</span>
                    <input className="vf-input" value={groupTitle} onChange={(event) => setGroupTitle(event.target.value)} placeholder="Daily PM operations" />
                  </label>

                  <label className="users-field">
                    <span>Group type</span>
                    <select className="vf-input" value={groupScope} onChange={(event) => setGroupScope(event.target.value as "BRANCH" | "AREA")} disabled={currentRole === "AREA_MANAGER"}>
                      <option value="BRANCH">Branch group - for this store</option>
                      {(currentRole === "AREA_MANAGER" || currentRole === "ADMIN") && (
                        <option value="AREA">Area task - targeted to selected store</option>
                      )}
                    </select>
                    <em>
                      {groupScope === "AREA"
                        ? `This area task targets ${selectedBranch?.name || "the selected store"} and appears for its Manager and Team Leader.`
                        : `This branch group is reusable inside ${selectedBranch?.name || "the selected store"}.`}
                    </em>
                  </label>

                  <div className="task-group-selection">
                    <div className="task-group-selection-head">
                      <strong>Select tasks to include</strong>
                      <span>{groupSelection.length} selected</span>
                    </div>
                    {items.map((item, index) => item.title.trim() && (
                      <label key={`${item.id || item.templateItemId || "group"}-${index}`} className={groupSelection.includes(index) ? "selected" : ""}>
                        <input
                          type="checkbox"
                          checked={groupSelection.includes(index)}
                          onChange={() => toggleGroupTask(index)}
                        />
                        <span>{item.title}</span>
                        <em>{item.description || "No description"}</em>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="users-modal-actions">
                  <button className="vf-btn vf-btn-ghost vf-btn-lg" type="button" onClick={() => setGroupModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="vf-btn vf-btn-primary vf-btn-lg" type="button" onClick={saveAsGroup} disabled={saving}>
                    {saving ? <Loader2 className="daily-spin" size={18} /> : <Check size={18} />}
                    Save selected group
                  </button>
                </div>
              </div>
            </div>
          )}

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

"use client";

import {
  buildEntryMap,
  countMemberShifts,
  getMonthDays,
  monthKeyFromDate,
  SHIFT_LABELS,
  SCHEDULE_SHIFTS,
  sortScheduleMembers,
  validateScheduleDays,
  type DayValidation,
  type ScheduleEntryInput,
  type ScheduleMember,
  type ScheduleShiftValue,
} from "@/lib/shift-schedule";
import { CalendarDays, CheckCircle2, Edit3, Lock, Printer, Save, ShieldAlert, Unlock, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type StoreOption = {
  id: string;
  name: string;
  code: string | null;
  terminalCount: number;
};

type SchedulePayload = {
  branch: StoreOption;
  month: string;
  days: ReturnType<typeof getMonthDays>;
  members: ScheduleMember[];
  schedule: {
    id: string;
    status: "DRAFT" | "SUBMITTED";
    approvalStatus?: "PENDING" | "APPROVED" | "REJECTED";
    submittedAt: string | null;
    submittedBy?: { id: string; name: string } | null;
    updatedAt: string;
    updatedBy?: { id: string; name: string } | null;
    version: number;
    lastAction?: string | null;
    lastActionAt?: string | null;
    lockExpiresAt?: string | null;
    lockedBy?: { id: string; name: string; role: string } | null;
    lockOwnedByCurrentUser?: boolean;
    lockedByOtherUser?: boolean;
    reviewComment?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: { id: string; name: string } | null;
  } | null;
  entries: ScheduleEntryInput[];
  validations: DayValidation[];
};

type Props = {
  title: string;
  description: string;
  branches: StoreOption[];
  defaultBranchId: string | null;
  defaultMonth?: string;
  canEdit: boolean;
  canReopenSubmitted?: boolean;
  canApprove?: boolean;
  editableMonth?: string | null;
  isAdmin?: boolean;
  viewerEmployeeId?: string | null;
};

type EditableShiftValue = ScheduleShiftValue | "";

function weekdayClass(weekday: string) {
  return weekday === "FR" ? "schedule-day-friday" : "";
}

function nameParts(name: string) {
  return name.trim().split(/\s+/).filter(Boolean);
}

function buildDisplayNameMap(members: ScheduleMember[]) {
  const firstNameCounts = new Map<string, number>();

  for (const member of members) {
    const first = nameParts(member.name)[0] || member.name;
    firstNameCounts.set(first.toLowerCase(), (firstNameCounts.get(first.toLowerCase()) || 0) + 1);
  }

  return new Map(members.map((member) => {
    const parts = nameParts(member.name);
    const first = parts[0] || member.name;
    const second = parts[1];
    const hasDuplicateFirstName = (firstNameCounts.get(first.toLowerCase()) || 0) > 1;
    const displayName = hasDuplicateFirstName && second ? `${first.charAt(0)}. ${second}` : first;
    return [member.id, displayName];
  }));
}

function todayKey() {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function shiftSortRank(shift: EditableShiftValue) {
  const order: Record<EditableShiftValue, number> = {
    AM: 0,
    FULL: 1,
    PM: 2,
    BW: 3,
    ANN: 4,
    OFF: 5,
    "": 6,
  };
  return order[shift];
}

function memberRoleLabel(member: ScheduleMember) {
  if (member.role === "MANAGER") return "Manager";
  if (member.role === "TEAM_LEADER") return "TL";
  if (member.role === "EMPLOYEE" && member.isMaster) return "Master";
  return "";
}

function formatMetaDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function actionLabel(action?: string | null) {
  if (action === "SUBMITTED") return "Submitted";
  if (action === "REOPENED") return "Reopened";
  if (action === "SAVED") return "Saved";
  return "Updated";
}

export default function ShiftScheduleClient({
  title,
  description,
  branches,
  defaultBranchId,
  defaultMonth,
  canEdit,
  canReopenSubmitted = canEdit,
  canApprove = false,
  editableMonth = null,
  isAdmin = false,
  viewerEmployeeId = null,
}: Props) {
  const [branchId, setBranchId] = useState(defaultBranchId || branches[0]?.id || "");
  const [month, setMonth] = useState(defaultMonth || monthKeyFromDate());
  const [data, setData] = useState<SchedulePayload | null>(null);
  const [entries, setEntries] = useState<ScheduleEntryInput[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<"save" | "submit" | "edit" | null>(null);
  const [lockBusy, setLockBusy] = useState(false);
  const [reviewing, setReviewing] = useState<"approve" | "reject" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<"mine" | "store">(viewerEmployeeId && !canEdit ? "mine" : "store");
  const lockRef = useRef<{ branchId: string; month: string; version?: number; owned: boolean; submitted: boolean }>({
    branchId,
    month,
    owned: false,
    submitted: false,
  });

  useEffect(() => {
    if (!branchId || !month) return;
    const controller = new AbortController();

    fetch(`/api/schedules/month?branchId=${encodeURIComponent(branchId)}&month=${encodeURIComponent(month)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to load schedule");
        return payload as SchedulePayload;
      })
      .then((payload) => {
        const members = sortScheduleMembers(payload.members);
        const days = payload.days.length ? payload.days : getMonthDays(month);
        setData({ ...payload, members, days });
        setEntries(payload.entries);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setData(null);
          setEntries([]);
          setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to load schedule" });
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [branchId, month]);

  const days = useMemo(() => data?.days || getMonthDays(month), [data?.days, month]);
  const displayDays = useMemo(() => {
    const currentMonth = monthKeyFromDate();
    const today = todayKey();
    if (month !== currentMonth) return days;
    return days.filter((day) => day.date >= today);
  }, [days, month]);
  const members = useMemo(() => data?.members || [], [data?.members]);
  const visibleMembers = useMemo(() => (
    viewerEmployeeId && viewMode === "mine"
      ? members.filter((member) => member.id === viewerEmployeeId)
      : members
  ), [members, viewMode, viewerEmployeeId]);
  const displayNameMap = useMemo(() => buildDisplayNameMap(members), [members]);
  const entryMap = useMemo(() => buildEntryMap(entries), [entries]);
  const validations = useMemo(() => (
    data ? validateScheduleDays(days, members, entries, data.branch.terminalCount) : []
  ), [data, days, entries, members]);
  const validationMap = useMemo(() => new Map(validations.map((item) => [item.date, item])), [validations]);
  const canEditThisMonth = canEdit && (!editableMonth || month === editableMonth);
  const invalidDays = canEditThisMonth ? validations.filter((day) => !day.valid) : [];
  const locked = data?.schedule?.status === "SUBMITTED";
  const lockedByOtherUser = Boolean(data?.schedule?.lockedByOtherUser);
  const lockOwnedByCurrentUser = Boolean(data?.schedule?.lockOwnedByCurrentUser);
  const editable = canEditThisMonth && !locked && lockOwnedByCurrentUser && !lockedByOtherUser;

  useEffect(() => {
    lockRef.current = {
      branchId,
      month,
      version: data?.schedule?.version,
      owned: lockOwnedByCurrentUser,
      submitted: locked,
    };
  }, [branchId, month, data?.schedule?.version, lockOwnedByCurrentUser, locked]);

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function setCell(employeeId: string, date: string, shift: EditableShiftValue) {
    setEntries((current) => {
      const key = `${date}:${employeeId}`;
      const next = current.filter((entry) => `${entry.date}:${entry.employeeId}` !== key);
      if (!shift) return next;
      return [...next, { employeeId, date, shift }];
    });
  }

  async function sendLockAction(action: "lock" | "unlock" | "forceUnlock", showResult = false) {
    if (!branchId || lockBusy) return;
    setLockBusy(true);
    if (showResult) setMessage(null);
    try {
      const res = await fetch("/api/schedules/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: action === "unlock",
        body: JSON.stringify({ branchId, month, action, version: data?.schedule?.version }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Schedule lock action failed");
      const nextPayload = payload as SchedulePayload;
      const nextMembers = sortScheduleMembers(nextPayload.members);
      const nextDays = nextPayload.days.length ? nextPayload.days : getMonthDays(month);
      setData({ ...nextPayload, members: nextMembers, days: nextDays });
      setEntries(nextPayload.entries);
      if (showResult) showMessage("success", action === "forceUnlock" ? "Schedule unlocked" : action === "unlock" ? "Editing lock released" : "Editing lock acquired");
    } catch (error) {
      if (showResult) showMessage("error", error instanceof Error ? error.message : "Schedule lock action failed");
    } finally {
      setLockBusy(false);
    }
  }

  async function sendAction(action: "save" | "submit" | "edit") {
    if (!branchId) return;
    setSaving(action);
    setMessage(null);
    try {
      const res = await fetch("/api/schedules/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, month, action, entries, version: data?.schedule?.version }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Schedule action failed");
      const nextPayload = payload as SchedulePayload;
      const nextMembers = sortScheduleMembers(nextPayload.members);
      const nextDays = nextPayload.days.length ? nextPayload.days : getMonthDays(month);
      setData({ ...nextPayload, members: nextMembers, days: nextDays });
      setEntries(nextPayload.entries);
      showMessage("success", action === "submit" ? "Schedule submitted" : action === "edit" ? "Schedule opened for editing" : "Schedule saved");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Schedule action failed");
    } finally {
      setSaving(null);
    }
  }

  async function sendReview(action: "approve" | "reject") {
    if (!branchId) return;
    if (action === "reject" && !reviewComment.trim()) {
      showMessage("error", "Rejection comment is required.");
      return;
    }
    setReviewing(action);
    setMessage(null);
    try {
      const res = await fetch("/api/schedules/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, month, action, reviewComment }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Schedule review failed");
      const nextPayload = payload as SchedulePayload;
      const nextMembers = sortScheduleMembers(nextPayload.members);
      const nextDays = nextPayload.days.length ? nextPayload.days : getMonthDays(month);
      setData({ ...nextPayload, members: nextMembers, days: nextDays });
      setEntries(nextPayload.entries);
      setReviewComment("");
      showMessage("success", action === "approve" ? "Schedule approved" : "Schedule rejected");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Schedule review failed");
    } finally {
      setReviewing(null);
    }
  }

  function printSchedule() {
    window.print();
  }

  useEffect(() => {
    if (!data || !canEditThisMonth || locked || lockedByOtherUser || lockOwnedByCurrentUser) return;
    void sendLockAction("lock");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.schedule?.id, data?.schedule?.status, branchId, month, canEditThisMonth, locked, lockedByOtherUser, lockOwnedByCurrentUser]);

  useEffect(() => {
    if (!lockOwnedByCurrentUser || locked) return;
    const timer = window.setInterval(() => {
      void sendLockAction("lock");
    }, 4 * 60 * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockOwnedByCurrentUser, locked, branchId, month, data?.schedule?.version]);

  useEffect(() => {
    const unlockBeforeClose = () => {
      const lock = lockRef.current;
      if (!lock.owned || lock.submitted) return;
      fetch("/api/schedules/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({ branchId: lock.branchId, month: lock.month, action: "unlock", version: lock.version }),
      }).catch(() => undefined);
    };
    window.addEventListener("beforeunload", unlockBeforeClose);
    return () => window.removeEventListener("beforeunload", unlockBeforeClose);
  }, []);

  return (
    <div className="schedule-shell">
      <section className="users-admin-head schedule-no-print">
        <div>
          <span>Shift Schedule</span>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="schedule-head-actions">
          {canReopenSubmitted && locked && (
            <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => sendAction("edit")} disabled={saving !== null}>
              <Edit3 size={18} />
              {saving === "edit" ? "Opening..." : "Edit"}
            </button>
          )}
          {canEditThisMonth && !locked && (
            <>
              {lockedByOtherUser && canReopenSubmitted && (
                <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => sendLockAction("forceUnlock", true)} disabled={lockBusy}>
                  <Unlock size={18} />
                  {lockBusy ? "Unlocking..." : "Force unlock"}
                </button>
              )}
              <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => sendAction("save")} disabled={saving !== null || loading || !editable}>
                <Save size={18} />
                {saving === "save" ? "Saving..." : "Save"}
              </button>
              <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={() => sendAction("submit")} disabled={saving !== null || loading || invalidDays.length > 0 || !editable}>
                <CheckCircle2 size={18} />
                {saving === "submit" ? "Submitting..." : "Submit"}
              </button>
            </>
          )}
          <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={printSchedule} disabled={!data}>
            <Printer size={18} />
            Print
          </button>
        </div>
      </section>

      <section className="vf-card schedule-filters schedule-no-print">
        {isAdmin && (
          <label className="users-field">
            <span>Store</span>
            <select
              className="vf-input"
              value={branchId}
              onChange={(event) => {
                setLoading(true);
                setMessage(null);
                setBranchId(event.target.value);
              }}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}{branch.code ? ` (${branch.code})` : ""}</option>
              ))}
            </select>
          </label>
        )}
        <label className="users-field">
          <span>Month</span>
          <input
            className="vf-input"
            type="month"
            value={month}
            onChange={(event) => {
              setLoading(true);
              setMessage(null);
              setMonth(event.target.value);
            }}
          />
          {editableMonth && (
            <small>Editable month: {editableMonth}. Current month: {monthKeyFromDate()}.</small>
          )}
        </label>
        <div className="schedule-status-card">
          <CalendarDays size={18} />
          <div>
            <strong>{data?.branch.name || "No store"}</strong>
            <span>
              {data ? `${data.branch.terminalCount} terminals | ${data.schedule?.status || "DRAFT"}` : "Loading schedule"}
              {data?.schedule?.approvalStatus ? ` | ${data.schedule.approvalStatus}` : ""}
              {editableMonth && month !== editableMonth ? ` | Editing opens for ${editableMonth}` : ""}
            </span>
            {data?.schedule && (
              <span>
                {data.schedule.lastActionAt && data.schedule.updatedBy
                  ? `${actionLabel(data.schedule.lastAction)} by ${data.schedule.updatedBy.name} at ${formatMetaDate(data.schedule.lastActionAt)}`
                  : "No saved changes yet"}
                {data.schedule.submittedAt && data.schedule.submittedBy
                  ? ` | Submitted by ${data.schedule.submittedBy.name} at ${formatMetaDate(data.schedule.submittedAt)}`
                  : ""}
              </span>
            )}
          </div>
        </div>
        {viewerEmployeeId && data?.schedule?.status === "SUBMITTED" && (
          <div className="schedule-view-toggle">
            <button type="button" className={viewMode === "mine" ? "active" : ""} onClick={() => setViewMode("mine")}>
              My Schedule
            </button>
            <button type="button" className={viewMode === "store" ? "active" : ""} onClick={() => setViewMode("store")}>
              Store Schedule
            </button>
          </div>
        )}
      </section>

      {message && <div className={`vf-alert ${message.type === "success" ? "vf-alert-success" : "vf-alert-error"} schedule-no-print`}>{message.text}</div>}

      {canEditThisMonth && !locked && (
        <section className={`vf-card schedule-warning schedule-no-print ${lockedByOtherUser ? "schedule-lock-blocked" : ""}`}>
          <Lock size={20} />
          <div>
            {lockedByOtherUser ? (
              <>
                <strong>This schedule is currently being edited by {data?.schedule?.lockedBy?.name || "another user"}</strong>
                <span>You can view the table, but editing is locked until {formatMetaDate(data?.schedule?.lockExpiresAt)} or until the lock is released.</span>
              </>
            ) : lockOwnedByCurrentUser ? (
              <>
                <strong>You are editing this schedule</strong>
                <span>Your lock renews automatically. Save or submit when finished.</span>
              </>
            ) : (
              <>
                <strong>Preparing edit lock</strong>
                <span>Editing will open as soon as the schedule lock is acquired.</span>
              </>
            )}
          </div>
        </section>
      )}

      {!!invalidDays.length && (
        <section className="vf-card schedule-warning schedule-no-print">
          <ShieldAlert size={20} />
          <div>
            <strong>{invalidDays.length} day(s) need attention</strong>
            <span>Regular days need valid AM and PM coverage. Friday needs one working shift with at least 3 employees including 1 Master.</span>
          </div>
        </section>
      )}

      {canApprove && data?.schedule?.status === "SUBMITTED" && (
        <section className="vf-card schedule-warning schedule-no-print">
          <CheckCircle2 size={20} />
          <div style={{ flex: 1 }}>
            <strong>Area review</strong>
            <span>
              Current status: {data.schedule.approvalStatus || "PENDING"}
              {data.schedule.reviewComment ? ` | Last comment: ${data.schedule.reviewComment}` : ""}
            </span>
            <textarea
              className="vf-input"
              rows={3}
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder="Write approval or rejection comment..."
              style={{ marginTop: "0.75rem", resize: "vertical" }}
            />
            <div className="schedule-head-actions" style={{ marginTop: "0.75rem" }}>
              <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={() => sendReview("approve")} disabled={reviewing !== null}>
                <CheckCircle2 size={18} />
                {reviewing === "approve" ? "Approving..." : "Approve"}
              </button>
              <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => sendReview("reject")} disabled={reviewing !== null}>
                <XCircle size={18} />
                {reviewing === "reject" ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        </section>
      )}

      <section className="vf-card schedule-print-area">
        <div className="schedule-print-title">
          <div>
            <span>VF-Next Monthly Schedule</span>
            <h2>{data?.branch.name || "Store Schedule"}</h2>
          </div>
          <strong>{month}</strong>
        </div>

        {loading ? (
          <div className="schedule-loading">Loading schedule...</div>
        ) : !data ? (
          <div className="schedule-loading">Select a store and month.</div>
        ) : viewerEmployeeId && !editable && data.schedule?.status !== "SUBMITTED" ? (
          <div className="schedule-loading">Monthly schedule is not submitted yet.</div>
        ) : (
          <>
            <div className="schedule-table-wrap">
              <table className="schedule-table">
                <thead>
                  <tr>
                    <th className="schedule-date-col" colSpan={2}>DATE</th>
                    {visibleMembers.map((member) => (
                      <th key={member.id} className="schedule-person-head">
                        <span>{member.role === "MANAGER" ? "S.M" : member.role === "TEAM_LEADER" ? "TL" : "AGENT"}</span>
                        <strong title={member.name}>{displayNameMap.get(member.id) || member.name}</strong>
                        {member.role === "EMPLOYEE" && member.isMaster && <em>Master</em>}
                      </th>
                    ))}
                    <th>AM</th>
                    <th>PM</th>
                    <th>BW</th>
                    <th>SUM</th>
                    <th>OFF</th>
                  </tr>
                </thead>
                <tbody>
                  {displayDays.map((day) => {
                    const validation = validationMap.get(day.date);
                    const rowInvalid = validation && !validation.valid;
                    return (
                      <tr key={day.date} className={`${weekdayClass(day.weekday)} ${rowInvalid ? "schedule-invalid-row" : ""}`}>
                        <td className="schedule-day-num">{day.day}</td>
                        <td className="schedule-weekday">{day.weekday}</td>
                        {visibleMembers.map((member) => {
                          const shift = entryMap.get(`${day.date}:${member.id}`) || "";
                          return (
                            <td key={`${day.date}:${member.id}`} className={`schedule-shift-cell ${shift ? `shift-cell-${shift.toLowerCase()}` : "shift-cell-empty"}`}>
                              {editable ? (
                                <>
                                  <select
                                    className={`schedule-shift-select ${shift ? "" : "is-blank"}`}
                                    value={shift}
                                    onChange={(event) => setCell(member.id, day.date, event.target.value as EditableShiftValue)}
                                    aria-label={`${displayNameMap.get(member.id) || member.name} ${day.date}`}
                                  >
                                    <option value="">Blank</option>
                                    {SCHEDULE_SHIFTS.map((option) => (
                                      <option key={option} value={option}>{SHIFT_LABELS[option]}</option>
                                    ))}
                                  </select>
                                  <span className="schedule-print-shift">{shift ? SHIFT_LABELS[shift] : ""}</span>
                                </>
                              ) : (
                                <span>{shift ? SHIFT_LABELS[shift] : ""}</span>
                              )}
                            </td>
                          );
                        })}
                        <td className={day.isFriday ? validation?.fridayValid ? "" : "schedule-count-bad" : validation?.amValid ? "" : "schedule-count-bad"}>{validation?.amCount || 0}</td>
                        <td className={day.isFriday ? validation?.fridayValid ? "" : "schedule-count-bad" : validation?.pmValid ? "" : "schedule-count-bad"}>{validation?.pmCount || 0}</td>
                        <td>{validation?.bwCount || 0}</td>
                        <td>{validation?.sumCount || 0}</td>
                        <td>{validation?.offCount || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  {(["ANN", "AM", "PM", "BW", "OFF"] as const).map((shiftKey) => (
                    <tr key={shiftKey}>
                      <td colSpan={2}>{shiftKey}</td>
                      {visibleMembers.map((member) => {
                        const totals = countMemberShifts(member.id, entries);
                        return <td key={`${shiftKey}:${member.id}`}>{totals[shiftKey]}</td>;
                      })}
                      <td colSpan={5}></td>
                    </tr>
                  ))}
                </tfoot>
              </table>
            </div>

            <div className="schedule-mobile-list schedule-no-print">
              {displayDays.map((day) => {
                const validation = validationMap.get(day.date);
                const mobileMembers = [...visibleMembers].sort((a, b) => {
                  const aShift = entryMap.get(`${day.date}:${a.id}`) || "";
                  const bShift = entryMap.get(`${day.date}:${b.id}`) || "";
                  const shiftDelta = shiftSortRank(aShift) - shiftSortRank(bShift);
                  if (shiftDelta) return shiftDelta;
                  if (a.role !== b.role) {
                    const roleOrder: Record<ScheduleMember["role"], number> = { MANAGER: 0, TEAM_LEADER: 1, EMPLOYEE: 2, AREA_MANAGER: 3, ADMIN: 4 };
                    return roleOrder[a.role] - roleOrder[b.role];
                  }
                  if (a.isMaster !== b.isMaster) return a.isMaster ? -1 : 1;
                  return a.name.localeCompare(b.name);
                });
                return (
                  <article key={day.date} className={`schedule-day-card ${validation && !validation.valid ? "is-invalid" : ""}`}>
                    <header>
                      <strong>{day.day} {day.weekday}</strong>
                      <span>AM {validation?.amCount || 0} | PM {validation?.pmCount || 0} | OFF {validation?.offCount || 0}</span>
                    </header>
                    <div className="schedule-day-card-grid">
                      {mobileMembers.map((member) => {
                        const shift = entryMap.get(`${day.date}:${member.id}`) || "";
                        const badge = memberRoleLabel(member);
                        return (
                          <label key={`${day.date}:mobile:${member.id}`}>
                            <span title={member.name}>
                              {displayNameMap.get(member.id) || member.name}
                              {badge && <small>{badge}</small>}
                            </span>
                            {editable ? (
                              <select className={shift ? "" : "is-blank"} value={shift} onChange={(event) => setCell(member.id, day.date, event.target.value as EditableShiftValue)}>
                                <option value="">Blank</option>
                                {SCHEDULE_SHIFTS.map((option) => <option key={option} value={option}>{SHIFT_LABELS[option]}</option>)}
                              </select>
                            ) : (
                              <em>{shift ? SHIFT_LABELS[shift] : ""}</em>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

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
import { CalendarDays, CheckCircle2, Edit3, Printer, Save, ShieldAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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
    submittedAt: string | null;
    updatedAt: string;
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
  editableMonth?: string | null;
  isAdmin?: boolean;
  viewerEmployeeId?: string | null;
};

function emptyEntries(days: { date: string }[], members: ScheduleMember[]) {
  return days.flatMap((day) => (
    members.map((member) => ({ employeeId: member.id, date: day.date, shift: "OFF" as ScheduleShiftValue }))
  ));
}

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

export default function ShiftScheduleClient({
  title,
  description,
  branches,
  defaultBranchId,
  defaultMonth,
  canEdit,
  canReopenSubmitted = canEdit,
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<"mine" | "store">(viewerEmployeeId && !canEdit ? "mine" : "store");

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
        setEntries(payload.entries.length ? payload.entries : emptyEntries(days, members));
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
  const editable = canEditThisMonth && !locked;

  function showMessage(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function setCell(employeeId: string, date: string, shift: ScheduleShiftValue) {
    setEntries((current) => {
      const key = `${date}:${employeeId}`;
      const next = current.filter((entry) => `${entry.date}:${entry.employeeId}` !== key);
      return [...next, { employeeId, date, shift }];
    });
  }

  async function sendAction(action: "save" | "submit" | "edit") {
    if (!branchId) return;
    setSaving(action);
    setMessage(null);
    try {
      const res = await fetch("/api/schedules/month", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId, month, action, entries }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Schedule action failed");
      const nextPayload = payload as SchedulePayload;
      const nextMembers = sortScheduleMembers(nextPayload.members);
      const nextDays = nextPayload.days.length ? nextPayload.days : getMonthDays(month);
      setData({ ...nextPayload, members: nextMembers, days: nextDays });
      setEntries(nextPayload.entries.length ? nextPayload.entries : emptyEntries(nextDays, nextMembers));
      showMessage("success", action === "submit" ? "Schedule submitted" : action === "edit" ? "Schedule opened for editing" : "Schedule saved");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Schedule action failed");
    } finally {
      setSaving(null);
    }
  }

  function printSchedule() {
    window.print();
  }

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
              <button className="vf-btn vf-btn-ghost vf-btn-md" type="button" onClick={() => sendAction("save")} disabled={saving !== null || loading}>
                <Save size={18} />
                {saving === "save" ? "Saving..." : "Save"}
              </button>
              <button className="vf-btn vf-btn-primary vf-btn-md" type="button" onClick={() => sendAction("submit")} disabled={saving !== null || loading || invalidDays.length > 0}>
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
              {editableMonth && month !== editableMonth ? ` | Editing opens for ${editableMonth}` : ""}
            </span>
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

      {!!invalidDays.length && (
        <section className="vf-card schedule-warning schedule-no-print">
          <ShieldAlert size={20} />
          <div>
            <strong>{invalidDays.length} day(s) need attention</strong>
            <span>Regular days need valid AM and PM coverage. Friday needs one working shift with at least 3 employees including 1 Master.</span>
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
                  {days.map((day) => {
                    const validation = validationMap.get(day.date);
                    const rowInvalid = validation && !validation.valid;
                    return (
                      <tr key={day.date} className={`${weekdayClass(day.weekday)} ${rowInvalid ? "schedule-invalid-row" : ""}`}>
                        <td className="schedule-day-num">{day.day}</td>
                        <td className="schedule-weekday">{day.weekday}</td>
                        {visibleMembers.map((member) => {
                          const shift = entryMap.get(`${day.date}:${member.id}`) || "OFF";
                          return (
                            <td key={`${day.date}:${member.id}`} className={`schedule-shift-cell shift-cell-${shift.toLowerCase()}`}>
                              {editable ? (
                                <>
                                  <select
                                    className="schedule-shift-select"
                                    value={shift}
                                    onChange={(event) => setCell(member.id, day.date, event.target.value as ScheduleShiftValue)}
                                    aria-label={`${displayNameMap.get(member.id) || member.name} ${day.date}`}
                                  >
                                    {SCHEDULE_SHIFTS.map((option) => (
                                      <option key={option} value={option}>{SHIFT_LABELS[option]}</option>
                                    ))}
                                  </select>
                                  <span className="schedule-print-shift">{SHIFT_LABELS[shift]}</span>
                                </>
                              ) : (
                                <span>{SHIFT_LABELS[shift]}</span>
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
              {days.map((day) => {
                const validation = validationMap.get(day.date);
                return (
                  <article key={day.date} className={`schedule-day-card ${validation && !validation.valid ? "is-invalid" : ""}`}>
                    <header>
                      <strong>{day.day} {day.weekday}</strong>
                      <span>AM {validation?.amCount || 0} | PM {validation?.pmCount || 0} | OFF {validation?.offCount || 0}</span>
                    </header>
                    <div className="schedule-day-card-grid">
                      {visibleMembers.map((member) => {
                        const shift = entryMap.get(`${day.date}:${member.id}`) || "OFF";
                        return (
                          <label key={`${day.date}:mobile:${member.id}`}>
                            <span title={member.name}>{displayNameMap.get(member.id) || member.name}</span>
                            {editable ? (
                              <select value={shift} onChange={(event) => setCell(member.id, day.date, event.target.value as ScheduleShiftValue)}>
                                {SCHEDULE_SHIFTS.map((option) => <option key={option} value={option}>{SHIFT_LABELS[option]}</option>)}
                              </select>
                            ) : (
                              <em>{SHIFT_LABELS[shift]}</em>
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

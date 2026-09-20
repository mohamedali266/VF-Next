"use client";

import { BellRing, CheckCircle2, RadioTower, Send, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

type Role = "EMPLOYEE" | "TEAM_LEADER" | "MANAGER" | "AREA_MANAGER" | "ADMIN";
type SmartTargetType =
  | "SMART_MISSING_HEALTH_TODAY"
  | "SMART_MISSING_REPORT_TODAY"
  | "SMART_PENDING_TASKS_TODAY"
  | "SMART_MANAGERS_TEAM_LEADERS"
  | "SMART_EMPLOYEES_WITHOUT_PUSH";
type TargetType = "ALL" | "ROLE" | "USER" | "BRANCH" | "AREA" | SmartTargetType;
type Priority = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

type UserOption = {
  id: string;
  name: string;
  username: string | null;
  role: Role;
  branch: { name: string } | null;
  area: { name: string } | null;
};

type BranchOption = {
  id: string;
  name: string;
  code: string | null;
  area: { name: string } | null;
};

type AreaOption = {
  id: string;
  name: string;
  code: string | null;
};

type RecentNotification = {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  targetType: TargetType;
  targetRole: Role | null;
  createdAt: string;
  recipient: { name: string } | null;
  branch: { name: string } | null;
  area: { name: string } | null;
};

type Props = {
  users: UserOption[];
  branches: BranchOption[];
  areas: AreaOption[];
  notifications: RecentNotification[];
};

const roles: { value: Role; label: string }[] = [
  { value: "EMPLOYEE", label: "Employees" },
  { value: "TEAM_LEADER", label: "Team Leaders" },
  { value: "MANAGER", label: "Managers" },
  { value: "AREA_MANAGER", label: "Area Managers" },
  { value: "ADMIN", label: "Admins" },
];

const priorities: { value: Priority; label: string; icon: typeof BellRing }[] = [
  { value: "INFO", label: "Info", icon: BellRing },
  { value: "SUCCESS", label: "Success", icon: CheckCircle2 },
  { value: "WARNING", label: "Warning", icon: RadioTower },
  { value: "CRITICAL", label: "Critical", icon: ShieldAlert },
];

const smartTargets: { value: SmartTargetType; label: string; hint: string }[] = [
  { value: "SMART_MISSING_HEALTH_TODAY", label: "Missing Health today", hint: "Employees who have not submitted any Health Check today." },
  { value: "SMART_MISSING_REPORT_TODAY", label: "Missing Daily Report today", hint: "Employees who have not submitted today's Daily Report." },
  { value: "SMART_PENDING_TASKS_TODAY", label: "Pending Tasks today", hint: "Employees with pending submitted tasks for today." },
  { value: "SMART_MANAGERS_TEAM_LEADERS", label: "Managers & Team Leaders", hint: "Store managers and team leaders only." },
  { value: "SMART_EMPLOYEES_WITHOUT_PUSH", label: "Users without phone alerts", hint: "Active users who did not enable device notifications yet." },
];

const actionPresets = [
  {
    label: "Health reminder",
    title: "Health Check required",
    body: "Please submit your Health Check now so today's store report stays complete.",
    priority: "WARNING" as Priority,
    targetType: "SMART_MISSING_HEALTH_TODAY" as TargetType,
    link: "/employee/health-check",
  },
  {
    label: "Daily report reminder",
    title: "Daily Report required",
    body: "Please submit your Daily Report after finishing the Health Check.",
    priority: "WARNING" as Priority,
    targetType: "SMART_MISSING_REPORT_TODAY" as TargetType,
    link: "/employee/daily-report",
  },
  {
    label: "Task follow-up",
    title: "Pending task follow-up",
    body: "You still have pending tasks for today. Open your task checklist and update the status.",
    priority: "INFO" as Priority,
    targetType: "SMART_PENDING_TASKS_TODAY" as TargetType,
    link: "/employee/tasks",
  },
  {
    label: "Schedule review",
    title: "Schedule update",
    body: "Please review the latest shift schedule update.",
    priority: "INFO" as Priority,
    targetType: "ALL" as TargetType,
    link: "/employee/schedule",
  },
  {
    label: "Enable phone alerts",
    title: "Enable VF-Next phone alerts",
    body: "Turn on notifications to receive urgent updates even when VF-Next is running in the background.",
    priority: "INFO" as Priority,
    targetType: "SMART_EMPLOYEES_WITHOUT_PUSH" as TargetType,
    link: "/employee",
  },
];

function isSmartTarget(targetType: TargetType) {
  return targetType.startsWith("SMART_");
}

function SearchableTargetSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const selected = options.find((option) => option.value === value);
  const filteredOptions = options.filter((option) => option.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <label className="notification-combobox-label">
      {label}
      <div className="notification-combobox">
        <input
          value={open ? query : selected?.label ?? ""}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder="Search and choose target"
          required
        />
        <button type="button" onClick={() => setOpen((current) => !current)} aria-label="Open target options">
          ▾
        </button>
        {open && (
          <div className="notification-combobox-menu">
            {filteredOptions.length === 0 ? (
              <div className="notification-combobox-empty">No matches found</div>
            ) : filteredOptions.map((option) => (
              <button
                type="button"
                key={option.value}
                className={option.value === value ? "selected" : ""}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onChange(option.value);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}

function targetLabel(notification: RecentNotification) {
  if (notification.targetType === "ALL") return "All users";
  if (notification.targetType === "ROLE") return roles.find((role) => role.value === notification.targetRole)?.label ?? "Role";
  if (notification.targetType === "USER") return notification.recipient?.name ?? "User";
  if (notification.targetType === "BRANCH") return notification.branch?.name ?? "Store";
  return notification.area?.name ?? "Area";
}

export default function NotificationsAdminClient({ users, branches, areas, notifications }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("INFO");
  const [targetType, setTargetType] = useState<TargetType>("ALL");
  const [targetRole, setTargetRole] = useState<Role>("EMPLOYEE");
  const [targetId, setTargetId] = useState("");
  const [link, setLink] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error"; text: string } | null>(null);

  function applyActionPreset(presetLabel: string) {
    const preset = actionPresets.find((item) => item.label === presetLabel);
    if (!preset) return;
    setTitle(preset.title);
    setBody(preset.body);
    setPriority(preset.priority);
    setTargetType(preset.targetType);
    setTargetId("");
    setLink(preset.link);
  }

  const targetOptions = useMemo(() => {
    if (targetType === "USER") {
      return users.map((user) => ({
        value: user.id,
        label: `${user.name}${user.username ? ` (${user.username})` : ""} - ${user.branch?.name ?? user.area?.name ?? user.role}`,
      }));
    }
    if (targetType === "BRANCH") {
      return branches.map((branch) => ({
        value: branch.id,
        label: `${branch.name}${branch.code ? ` (${branch.code})` : ""}${branch.area?.name ? ` - ${branch.area.name}` : ""}`,
      }));
    }
    if (targetType === "AREA") {
      return areas.map((area) => ({
        value: area.id,
        label: `${area.name}${area.code ? ` (${area.code})` : ""}`,
      }));
    }
    return [];
  }, [areas, branches, targetType, users]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setStatus(null);

    const response = await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        body,
        priority,
        targetType,
        targetRole: targetType === "ROLE" ? targetRole : null,
        targetId: ["USER", "BRANCH", "AREA"].includes(targetType) ? targetId : null,
        link: link.trim() || null,
      }),
    });

    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      const pushText = data.push?.skipped
        ? " Push delivery is waiting for VAPID keys."
        : ` Push sent to ${data.push?.sent ?? 0} device(s).`;
      const savedText = data.notificationsCreated ? ` ${data.notificationsCreated} targeted notification(s) saved.` : "";
      setStatus({ type: "success", text: `Notification sent and saved successfully.${savedText}${pushText}` });
      setTitle("");
      setBody("");
      setLink("");
      setTargetId("");
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      setStatus({ type: "error", text: data.error ?? "Failed to send notification." });
    }

    setSending(false);
  }

  return (
    <div className="admin-notifications">
      <section className="admin-notifications-hero">
        <div>
          <span className="vf-section-kicker">Notification Center</span>
          <h1>Send reliable in-app alerts</h1>
          <p>Target all users, one role, a single user, one store, or a full area. Alerts are stored in the system and delivered as soon as the user is online.</p>
        </div>
        <div className="notification-hero-stat">
          <BellRing size={24} />
          <strong>{notifications.length}</strong>
          <span>recent alerts</span>
        </div>
      </section>

      <div className="admin-notifications-grid">
        <form className="notification-composer" onSubmit={submit}>
          <label>
            Action preset
            <select defaultValue="" onChange={(event) => applyActionPreset(event.target.value)}>
              <option value="">Custom notification</option>
              {actionPresets.map((preset) => <option value={preset.label} key={preset.label}>{preset.label}</option>)}
            </select>
          </label>

          <div className="notification-form-row">
            <label>
              Title
              <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short notification title" required minLength={2} maxLength={90} />
            </label>
          </div>

          <label>
            Message
            <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Write the message users should see..." required minLength={2} maxLength={700} rows={5} />
          </label>

          <div className="priority-picker">
            {priorities.map(({ value, label, icon: Icon }) => (
              <button className={priority === value ? "active" : ""} type="button" key={value} onClick={() => setPriority(value)}>
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          <div className="notification-form-grid">
            <label>
              Target type
              <select
                value={targetType}
                onChange={(event) => {
                  setTargetType(event.target.value as TargetType);
                  setTargetId("");
                }}
              >
                <option value="ALL">All users</option>
                <option value="ROLE">Role</option>
                <option value="USER">Single user</option>
                <option value="BRANCH">Store</option>
                <option value="AREA">Area</option>
                {smartTargets.map((target) => (
                  <option value={target.value} key={target.value}>{target.label}</option>
                ))}
              </select>
              {isSmartTarget(targetType) && (
                <span className="notification-smart-hint">
                  {smartTargets.find((target) => target.value === targetType)?.hint}
                </span>
              )}
            </label>

            {targetType === "ROLE" && (
              <label>
                Role
                <select value={targetRole} onChange={(event) => setTargetRole(event.target.value as Role)}>
                  {roles.map((role) => <option value={role.value} key={role.value}>{role.label}</option>)}
                </select>
              </label>
            )}

            {["USER", "BRANCH", "AREA"].includes(targetType) && (
              <SearchableTargetSelect
                label="Target"
                value={targetId}
                options={targetOptions}
                onChange={setTargetId}
              />
            )}
          </div>

          <label>
            Optional link
            <input value={link} onChange={(event) => setLink(event.target.value)} placeholder="/employee/schedule or https://..." />
          </label>

          {status && <div className={`notification-status ${status.type}`}>{status.text}</div>}

          <button className="notification-submit" type="submit" disabled={sending}>
            <Send size={18} />
            {sending ? "Sending..." : "Send Notification"}
          </button>
        </form>

        <aside className="notification-recent">
          <div className="notification-recent-head">
            <span>Recent</span>
            <strong>Last notifications</strong>
          </div>
          <div className="notification-recent-list">
            {notifications.length === 0 ? (
              <div className="notification-recent-empty">No notifications have been sent yet.</div>
            ) : notifications.map((notification) => (
              <article className={`notification-recent-card is-${notification.priority.toLowerCase()}`} key={notification.id}>
                <div>
                  <strong>{notification.title}</strong>
                  <span>{targetLabel(notification)}</span>
                </div>
                <p>{notification.body}</p>
                <time>{new Date(notification.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

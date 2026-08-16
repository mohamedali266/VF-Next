import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const session = await auth();
  const user = session?.user;
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [totalUsers, totalEmployees, totalManagers, todayChecks, todayReports] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.user.count({ where: { role: "MANAGER", isActive: true } }),
    prisma.healthCheck.count({ where: { date: { gte: todayStart } } }),
    prisma.dailyReport.count({ where: { date: { gte: todayStart } } }),
  ]);

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = [
    { icon: "Users", label: "Active Users", value: totalUsers, color: "var(--vf-red-light)" },
    { icon: "Emp", label: "Employees", value: totalEmployees, color: "var(--shift-am)" },
    { icon: "Mgr", label: "Managers", value: totalManagers, color: "var(--shift-pm)" },
    { icon: "SMS", label: "Daily Reports", value: todayReports, color: "var(--shift-bw)" },
    { icon: "HC", label: "Health Checks", value: todayChecks, color: "var(--vf-success)" },
  ];

  const actions = [
    { icon: "Users", title: "Users", sub: "Create, edit, activate, and assign users", href: "/admin/users", color: "rgba(196,30,58,0.15)", border: "rgba(196,30,58,0.3)" },
    { icon: "Reports", title: "Daily Reports", sub: "Edit, copy, and delete submitted SMS reports", href: "/admin/reports", color: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    { icon: "Stores", title: "Stores", sub: "Create stores and review teams", href: "/admin/branches", color: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
    { icon: "Health", title: "Health Check", sub: "Review and edit shift health check data", href: "/admin/health-check", color: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
    { icon: "Logs", title: "Edit Logs", sub: "Review and delete audit log entries", href: "/admin/edit-logs", color: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Admin Dashboard
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-muted)" }}>{today}</p>
      </div>

      <div className="vf-card animate-fade-up animate-fade-up-delay-1" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.2) 0%, rgba(26,26,26,1) 60%)",
        borderColor: "rgba(196,30,58,0.35)",
        position: "relative",
        overflow: "hidden",
      }}>
        <p style={{ fontSize: "1.125rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Welcome, {user?.name}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)" }}>
          You have full VF-Next administration permissions.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "0.75rem" }}>
        {stats.map((stat, i) => (
          <div key={stat.label} className={`vf-card animate-fade-up animate-fade-up-delay-${i + 1}`} style={{ textAlign: "center", padding: "1.25rem 0.75rem" }}>
            <div style={{ fontSize: "0.78rem", fontWeight: "800", color: "var(--vf-text-muted)", marginBottom: "0.5rem" }}>{stat.icon}</div>
            <div style={{ fontSize: "2rem", fontWeight: "800", color: stat.color, lineHeight: 1 }}>{stat.value}</div>
            <div style={{ fontSize: "0.6875rem", color: "var(--vf-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div>
        <div className="vf-section-header">
          <span className="vf-section-title">Quick Actions</span>
          <div className="vf-section-line" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {actions.map((item) => (
            <a key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className="vf-card animate-fade-up" style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                background: item.color,
                borderColor: item.border,
                padding: "1rem 1.25rem",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: "0.82rem", minWidth: 58, color: "var(--vf-red-light)", fontWeight: 800 }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: "#fff", fontSize: "0.9375rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.125rem" }}>{item.sub}</div>
                </div>
                <span style={{ color: "var(--vf-text-muted)", fontSize: "1.25rem" }}>←</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

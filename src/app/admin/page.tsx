import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AdminDashboard() {
  const session = await auth();
  const user = session?.user;

  // Get stats
  const [totalUsers, totalEmployees, totalManagers, todayChecks] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.user.count({ where: { role: "MANAGER", isActive: true } }),
    prisma.healthCheck.count({
      where: { date: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
    }),
  ]);

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const stats = [
    { icon: "👥", label: "إجمالي المستخدمين", value: totalUsers, color: "var(--nox-red-light)" },
    { icon: "👤", label: "الموظفون", value: totalEmployees, color: "var(--shift-am)" },
    { icon: "👔", label: "المديرون", value: totalManagers, color: "var(--shift-pm)" },
    { icon: "📊", label: "إدخالات اليوم", value: todayChecks, color: "var(--shift-bw)" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {/* Title */}
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          ⚡ لوحة الأدمن
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-muted)" }}>{today}</p>
      </div>

      {/* Welcome */}
      <div className="nox-card animate-fade-up animate-fade-up-delay-1" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.2) 0%, rgba(26,26,26,1) 60%)",
        borderColor: "rgba(196,30,58,0.35)",
        position: "relative", overflow: "hidden"
      }}>
        <div style={{
          position: "absolute", top: -30, left: -30,
          width: 150, height: 150, borderRadius: "50%",
          background: "var(--nox-red)", opacity: 0.05, filter: "blur(40px)"
        }} />
        <p style={{ fontSize: "1.125rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          أهلاً، {user?.name} ⚡
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--nox-text-2)" }}>
          لديك صلاحيات كاملة على النظام
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        {stats.map((stat, i) => (
          <div
            key={i}
            className={`nox-card animate-fade-up animate-fade-up-delay-${i + 1}`}
            style={{ textAlign: "center", padding: "1.25rem 0.75rem" }}
          >
            <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{stat.icon}</div>
            <div style={{ fontSize: "2rem", fontWeight: "800", color: stat.color, lineHeight: 1 }}>
              {stat.value}
            </div>
            <div style={{ fontSize: "0.6875rem", color: "var(--nox-text-muted)", marginTop: "0.375rem", fontWeight: "600" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <div className="nox-section-header">
          <span className="nox-section-title">إجراءات سريعة</span>
          <div className="nox-section-line" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {[
            { icon: "👥", title: "إدارة المستخدمين", sub: "إضافة وتعديل وتعطيل المستخدمين", href: "/admin/users", color: "rgba(196,30,58,0.15)", border: "rgba(196,30,58,0.3)" },
            { icon: "Branch", title: "Branches", sub: "Create branches and review teams", href: "/admin/branches", color: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
            { icon: "📊", title: "Health Check — كامل", sub: "عرض بيانات الشيفتات وتعديلها", href: "/admin/health-check", color: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
            { icon: "Audit", title: "Edit Logs", sub: "Review all Health Check edits and reasons", href: "/admin/edit-logs", color: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
          ].map((item, i) => (
            <a key={i} href={item.href} style={{ textDecoration: "none" }}>
              <div className="nox-card animate-fade-up" style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: item.color, borderColor: item.border,
                padding: "1rem 1.25rem", cursor: "pointer"
              }}>
                <span style={{ fontSize: "1.75rem" }}>{item.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", color: "#fff", fontSize: "0.9375rem" }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--nox-text-muted)", marginTop: "0.125rem" }}>{item.sub}</div>
                </div>
                <span style={{ color: "var(--nox-text-muted)", fontSize: "1.25rem" }}>←</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

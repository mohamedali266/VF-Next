import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function EmployeeDashboard() {
  const session = await auth();
  const user = session?.user;

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const actions = [
    {
      icon: "SMS",
      title: "Daily Report",
      sub: "Submit daily SMS values",
      href: "/employee/daily-report",
    },
    {
      icon: "HC",
      title: "Health Check",
      sub: "Submit NID lines",
      href: "/employee/health-check",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="vf-card animate-fade-up" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.15) 0%, rgba(26,26,26,1) 60%)",
        borderColor: "rgba(196,30,58,0.25)",
      }}>
        <p style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginBottom: "0.25rem" }}>{today}</p>
        <h2 style={{ fontSize: "1.375rem", fontWeight: "800", color: "#fff", marginBottom: "0.375rem" }}>
          Welcome, {user?.name}
        </h2>
        <p style={{ fontSize: "0.875rem", color: "var(--vf-text-2)" }}>
          Choose the report you want to submit today.
        </p>
      </div>

      <div>
        <div className="vf-section-header">
          <span className="vf-section-title">Quick Access</span>
          <div className="vf-section-line" />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.875rem" }}>
          {actions.map((item, index) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
              <div className={`vf-card animate-fade-up animate-fade-up-delay-${index + 1}`} style={{
                minHeight: 150,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderColor: "rgba(196,30,58,0.2)",
              }}>
                <div className="vf-number-badge" style={{ width: 42, height: 42 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: "800", color: "var(--vf-text)" }}>{item.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--vf-text-muted)", marginTop: "0.25rem" }}>{item.sub}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import { auth } from "@/lib/auth";
import Link from "next/link";

export default async function ManagerDashboard() {
  const session = await auth();
  const user = session?.user;
  const branchId = user?.branchId;

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const actions = [
    {
      icon: "SMS",
      title: "SMS",
      sub: "Daily report aggregation",
      href: "/manager/sms",
    },
    {
      icon: "HC",
      title: "Health Check",
      sub: "NID shift monitoring",
      href: "/manager/health-check",
    },
    ...(branchId ? [{
      icon: "🏪",
      title: "My Store",
      sub: "Team, SMS & health view",
      href: `/store/${branchId}`,
    }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <div className="animate-fade-up">
        <h1 style={{ fontSize: "1.25rem", fontWeight: "800", color: "#fff", marginBottom: "0.25rem" }}>
          Manager Dashboard
        </h1>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-muted)" }}>{today}</p>
      </div>

      <div className="vf-card animate-fade-up animate-fade-up-delay-1" style={{
        background: "linear-gradient(135deg, rgba(196,30,58,0.15) 0%, rgba(26,26,26,1) 70%)",
        borderColor: "rgba(196,30,58,0.25)",
      }}>
        <p style={{ fontSize: "1rem", fontWeight: "700", color: "#fff", marginBottom: "0.375rem" }}>
          Welcome, {user?.name}
        </p>
        <p style={{ fontSize: "0.8125rem", color: "var(--vf-text-2)" }}>
          Follow team submissions and copy the final SMS from one place.
        </p>
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
  );
}

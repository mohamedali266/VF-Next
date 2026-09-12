import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import AreaBottomNav from "@/components/layout/AreaBottomNav";
import NotificationBell from "@/components/notifications/NotificationBell";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user;
  if (user.role !== "AREA_MANAGER" && user.role !== "ADMIN") redirect("/employee");

  return (
    <div className="vf-page">
      <header className="vf-header-gradient vf-safe-top" style={{ padding: "1rem 1.25rem 0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(196,30,58,0.2)",
              border: "1px solid rgba(196,30,58,0.4)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden"
            }}>
              <Image src="/vf-icon.svg" alt="VF-Next" width={28} height={28} />
            </div>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>VF-Next</div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--vf-text)" }}>{user.name}</div>
            </div>
          </div>
          <div className="vf-header-actions">
            <NotificationBell />
            <div style={{
              background: "linear-gradient(135deg, rgba(196,30,58,0.2), rgba(196,30,58,0.1))",
              border: "1px solid rgba(196,30,58,0.4)",
              borderRadius: "20px",
              padding: "0.25rem 0.75rem",
              fontSize: "0.6875rem",
              color: "var(--vf-red-light)",
              fontWeight: "700",
              letterSpacing: "0.05em"
            }}>
              PARTNERS
            </div>
          </div>
        </div>
      </header>
      <main style={{ padding: "1.25rem" }}>{children}</main>
      <AreaBottomNav />
    </div>
  );
}

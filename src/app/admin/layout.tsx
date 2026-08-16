import { auth } from "@/lib/auth";
import AdminBottomNav from "@/components/layout/AdminBottomNav";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  const user = session.user;
  if (user.role !== "ADMIN") redirect("/employee");

  return (
    <div className="vf-page">
      <header className="vf-header-gradient vf-safe-top" style={{ padding: "1rem 1.25rem 0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(196,30,58,0.25)",
              border: "1px solid rgba(196,30,58,0.5)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.125rem",
              overflow: "hidden"
            }}><Image src="/vf-icon.svg" alt="VF-Next" width={28} height={28} /></div>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>VF-Next</div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--vf-text)" }}>{user.name}</div>
            </div>
          </div>
          <div style={{
            background: "linear-gradient(135deg, var(--vf-red), var(--vf-red-dark))",
            borderRadius: "20px",
            padding: "0.25rem 0.875rem",
            fontSize: "0.6875rem",
            color: "#fff",
            fontWeight: "800",
            letterSpacing: "0.08em",
            boxShadow: "0 2px 12px var(--vf-red-glow)"
          }}>
            ADMIN
          </div>
        </div>
      </header>
      <main style={{ padding: "1.25rem" }}>{children}</main>
      <AdminBottomNav />
    </div>
  );
}

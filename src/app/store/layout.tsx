import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StoreBottomNav from "@/components/layout/StoreBottomNav";
import Image from "next/image";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const role = session.user.role;

  // Where to go when pressing Home based on role
  const homeHref =
    role === "ADMIN" ? "/admin" :
    role === "MANAGER" || role === "TEAM_LEADER" ? "/manager" :
    "/employee";

  return (
    <div className="vf-page">
      {/* Header with safe-area-top */}
      <header
        className="vf-header-gradient vf-safe-top"
        style={{ padding: "1rem 1.25rem 0.875rem" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(196,30,58,0.2)",
              border: "1px solid rgba(196,30,58,0.4)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              overflow: "hidden",
            }}>
              <Image src="/vf-icon.svg" alt="VF" width={28} height={28} />
            </div>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                VF-Next
              </div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--vf-text)" }}>
                {session.user.name}
              </div>
            </div>
          </div>
          <a
            href={homeHref}
            style={{
              background: "rgba(196,30,58,0.1)",
              border: "1px solid rgba(196,30,58,0.3)",
              borderRadius: "20px",
              padding: "0.25rem 0.875rem",
              fontSize: "0.6875rem",
              color: "var(--vf-red-light)",
              fontWeight: "700",
              textDecoration: "none",
            }}
          >
            ← Home
          </a>
        </div>
      </header>

      <main style={{ padding: "1.25rem" }}>{children}</main>
      <StoreBottomNav homeHref={homeHref} />
    </div>
  );
}

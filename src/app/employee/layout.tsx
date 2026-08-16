import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import EmployeeBottomNav from "@/components/layout/EmployeeBottomNav";

export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  const user = session.user;
  if (user.role !== "EMPLOYEE") redirect("/unauthorized");

  return (
    <div className="vf-page">
      {/* Top Header */}
      <header className="vf-header-gradient vf-safe-top" style={{ padding: "1rem 1.25rem 0.875rem" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <div style={{
              width: "36px", height: "36px",
              background: "rgba(196,30,58,0.2)",
              border: "1px solid rgba(196,30,58,0.4)",
              borderRadius: "10px",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.125rem",
              overflow: "hidden"
            }}>
              <Image src="/vf-icon.svg" alt="VF-Next" width={28} height={28} />
            </div>
            <div>
              <div style={{ fontSize: "0.625rem", color: "var(--vf-text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>VF-Next</div>
              <div style={{ fontSize: "0.875rem", fontWeight: "700", color: "var(--vf-text)", lineHeight: "1.2" }}>
                {user.name}
              </div>
            </div>
          </div>
          <div style={{
            background: "rgba(196,30,58,0.1)",
            border: "1px solid rgba(196,30,58,0.25)",
            borderRadius: "20px",
            padding: "0.25rem 0.75rem",
            fontSize: "0.6875rem",
            color: "var(--vf-red-light)",
            fontWeight: "600",
            letterSpacing: "0.05em"
          }}>
            موظف
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main style={{ padding: "1.25rem" }}>
        {children}
      </main>

      <EmployeeBottomNav />
    </div>
  );
}

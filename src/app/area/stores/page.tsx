import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, Users } from "lucide-react";

export default async function AreaStoresPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/unauthorized");
  if (!session.user.areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      ...(session.user.role === "AREA_MANAGER" ? { areaId: session.user.areaId || "" } : {}),
    },
    orderBy: [{ area: { name: "asc" } }, { name: "asc" }],
    include: {
      area: { select: { name: true, code: true } },
      _count: {
        select: {
          users: true,
          dailyReports: true,
        },
      },
    },
  });

  return (
    <div className="daily-shell">
      <section className="daily-hero">
        <div>
          <p>Partners Stores</p>
          <h1>Area Store Reports</h1>
          <span>Open a store to review SMS, Health, Store RPM, and each employee breakdown.</span>
        </div>
        <div className="daily-score">
          <strong>{branches.length}</strong>
          <span>Stores</span>
        </div>
      </section>

      <section className="stores-grid">
        {branches.map((branch) => (
          <Link key={branch.id} href={`/store/${branch.id}`} className="vf-card store-card area-store-card" style={{ textDecoration: "none" }}>
            <div className="store-card-head">
              <span className="store-icon"><Building2 size={18} /></span>
              <div>
                <h2>{branch.name}</h2>
                <p>{branch.code || "No code"} · {branch.area?.name || "Unassigned area"}</p>
              </div>
            </div>
            <div className="area-store-metrics">
              <span><Users size={15} /> {branch._count.users} users</span>
              <span>{branch.terminalCount} Terminal</span>
              <span>{branch._count.dailyReports} reports</span>
            </div>
            <div className="area-store-open">
              Open store
              <ArrowRight size={16} />
            </div>
          </Link>
        ))}

        {!branches.length && (
          <div className="vf-card" style={{ color: "var(--vf-text-muted)", textAlign: "center", padding: "2rem" }}>
            No stores are assigned to this area yet.
          </div>
        )}
      </section>
    </div>
  );
}

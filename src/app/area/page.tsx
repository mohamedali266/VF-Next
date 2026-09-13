import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { areaManagedUserWhere } from "@/lib/area-scope";
import { redirect } from "next/navigation";
import { ArrowRight, Building2, CalendarDays, ClipboardCheck, MessageSquareText, Users } from "lucide-react";

export default async function AreaDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/employee");

  const areaId = session.user.areaId;
  if (!areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const [area, usersCount] = areaId
    ? await Promise.all([
        prisma.area.findUnique({
          where: { id: areaId },
          select: {
            name: true,
            branches: {
              where: { isActive: true },
              orderBy: { name: "asc" },
              select: {
                id: true,
                name: true,
                code: true,
                terminalCount: true,
                _count: {
                  select: {
                    users: { where: { isActive: true, role: { in: ["EMPLOYEE", "TEAM_LEADER", "MANAGER"] } } },
                  },
                },
              },
            },
          },
        }),
        prisma.user.count({ where: areaManagedUserWhere(areaId, true) }),
      ])
    : [null, 0] as const;

  const cards = [
    { href: "/area/stores", icon: Building2, label: "Stores", value: area?.branches.length ?? 0 },
    { href: "/area/users", icon: Users, label: "Users", value: usersCount },
    { href: "/area/sms", icon: MessageSquareText, label: "SMS & RPM", value: "Open" },
    { href: "/area/health-check", icon: ClipboardCheck, label: "Health", value: "Open" },
    { href: "/area/schedule", icon: CalendarDays, label: "Schedules", value: "Review" },
  ];

  return (
    <div className="daily-shell">
      <section className="daily-hero">
        <div>
          <p>Partners Area</p>
          <h1>{area?.name || "Area Dashboard"}</h1>
          <span>Manage users, review submitted schedules, and follow area-wide reports.</span>
        </div>
        <div className="daily-score">
          <strong>{area?.branches.length ?? 0}</strong>
          <span>Stores</span>
        </div>
      </section>

      <section className="sms-summary-grid">
        {cards.map(({ href, icon: Icon, label, value }) => (
          <Link key={href} href={href} className="vf-card sms-summary-card" style={{ textDecoration: "none" }}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </Link>
        ))}
      </section>

      <section className="stores-section">
        <div className="users-admin-head">
          <div>
            <span>Area Stores</span>
            <h1>Store Reports</h1>
            <p>Open any store to review SMS, Health, RPM, and employee breakdowns.</p>
          </div>
          <Link className="vf-btn vf-btn-ghost vf-btn-md" href="/area/stores">
            View all
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="stores-grid">
          {(area?.branches || []).slice(0, 4).map((branch) => (
            <Link key={branch.id} href={`/store/${branch.id}`} className="vf-card store-card" style={{ textDecoration: "none" }}>
              <div className="store-card-head">
                <span className="store-icon"><Building2 size={18} /></span>
                <div>
                  <h2>{branch.name}</h2>
                  <p>{branch.code || "No code"} · {branch.terminalCount} Terminal · {branch._count.users} users</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

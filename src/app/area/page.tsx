import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { CalendarDays, ClipboardCheck, MessageSquareText, Users } from "lucide-react";

export default async function AreaDashboardPage() {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.role !== "AREA_MANAGER" && session.user.role !== "ADMIN") redirect("/employee");

  const areaId = session.user.areaId;
  if (!areaId && session.user.role !== "ADMIN") redirect("/unauthorized");

  const area = areaId
    ? await prisma.area.findUnique({
        where: { id: areaId },
        select: {
          name: true,
          branches: { where: { isActive: true }, select: { id: true } },
          users: { where: { isActive: true }, select: { id: true } },
        },
      })
    : null;

  const cards = [
    { href: "/area/users", icon: Users, label: "Users", value: area?.users.length ?? 0 },
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
    </div>
  );
}

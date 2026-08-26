import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminDashboard() {
  const session = await auth();
  const user = session?.user;
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0));

  const [totalUsers, totalEmployees, totalManagers, todayChecks, todayReports] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: "EMPLOYEE", isActive: true } }),
    prisma.user.count({ where: { role: "MANAGER", isActive: true } }),
    prisma.healthCheck.count({ where: { date: { gte: todayStart } } }),
    prisma.dailyReport.count({ where: { date: { gte: todayStart } } }),
  ]);

  const today = new Date().toLocaleDateString("ar-EG", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const stats = [
    { icon: "Users", label: "Active Users", value: totalUsers, color: "var(--vf-red-light)" },
    { icon: "Emp", label: "Employees", value: totalEmployees, color: "var(--shift-am)" },
    { icon: "Mgr", label: "Managers", value: totalManagers, color: "var(--shift-pm)" },
    { icon: "SMS", label: "Daily Reports", value: todayReports, color: "var(--shift-bw)" },
    { icon: "HC", label: "Health Checks", value: todayChecks, color: "var(--vf-success)" },
  ];

  const actions = [
    { icon: "Users", title: "Users", sub: "Create, edit, activate, and assign users", href: "/admin/users", color: "rgba(196,30,58,0.15)", border: "rgba(196,30,58,0.3)" },
    { icon: "Reports", title: "Daily Reports", sub: "Edit, copy, and delete submitted SMS reports", href: "/admin/reports", color: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    { icon: "Stores", title: "Stores", sub: "Create stores and review teams", href: "/admin/branches", color: "rgba(139,92,246,0.1)", border: "rgba(139,92,246,0.25)" },
    { icon: "Health", title: "Health Check", sub: "Review and edit shift health check data", href: "/admin/health-check", color: "rgba(59,130,246,0.1)", border: "rgba(59,130,246,0.25)" },
    { icon: "Logs", title: "Edit Logs", sub: "Review and delete audit log entries", href: "/admin/edit-logs", color: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)" },
  ];

  return (
    <AdminDashboardClient
      userName={user?.name || "Admin"}
      todayText={today}
      stats={stats}
      actions={actions}
    />
  );
}

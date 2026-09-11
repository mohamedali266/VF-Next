"use client";

import { Building2, CalendarDays, ClipboardCheck, FileText, Home, Layers3, ScrollText, Users } from "lucide-react";
import AppBottomNav from "./AppBottomNav";

const navItems = [
  { href: "/admin", Icon: Home, label: "Home" },
  { href: "/admin/users", Icon: Users, label: "Users" },
  { href: "/admin/areas", Icon: Layers3, label: "Areas" },
  { href: "/admin/reports", Icon: FileText, label: "Reports" },
  { href: "/admin/branches", Icon: Building2, label: "Stores" },
  { href: "/admin/schedule", Icon: CalendarDays, label: "Schedule" },
  { href: "/admin/health-check", Icon: ClipboardCheck, label: "Health" },
  { href: "/admin/edit-logs", Icon: ScrollText, label: "Logs" },
];

export default function AdminBottomNav() {
  return <AppBottomNav items={navItems} primaryCount={3} />;
}

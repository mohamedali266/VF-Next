"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { CalendarDays, ClipboardCheck, LayoutDashboard, MessageSquareText, Store } from "lucide-react";
import AppBottomNav from "./AppBottomNav";

export default function ManagerBottomNav() {
  const { data: session } = useSession();
  const [branchId, setBranchId] = useState<string | null | undefined>(
    session?.user?.branchId
  );

  // Fetch fresh branchId from DB in case JWT is stale (user didn't re-login)
  useEffect(() => {
    if (branchId) return;
    fetch("/api/me/branch")
      .then((r) => r.json())
      .then((d) => { if (d.branchId) setBranchId(d.branchId); })
      .catch(() => {});
  }, [branchId]);

  useEffect(() => {
    if (session?.user?.branchId) setBranchId(session.user.branchId);
  }, [session]);

  const navItems = [
    { href: "/manager",              Icon: LayoutDashboard,   label: "Dashboard" },
    { href: "/manager/sms",          Icon: MessageSquareText, label: "SMS" },
    { href: "/manager/schedule",     Icon: CalendarDays,      label: "Schedule" },
    { href: "/manager/health-check", Icon: ClipboardCheck,    label: "Health" },
    ...(branchId ? [{ href: `/store/${branchId}`, Icon: Store, label: "Store", match: (path: string) => path.startsWith("/store") }] : []),
  ];

  return <AppBottomNav items={navItems} primaryCount={3} />;
}

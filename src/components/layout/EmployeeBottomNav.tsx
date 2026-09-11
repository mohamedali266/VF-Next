"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, Home, MessageSquareText, Store, Users } from "lucide-react";
import AppBottomNav from "./AppBottomNav";

export default function EmployeeBottomNav() {
  const { data: session } = useSession();
  const [branchId, setBranchId] = useState<string | null | undefined>(
    session?.user?.branchId
  );

  // Fetch fresh branchId from DB in case JWT is stale (user didn't re-login)
  useEffect(() => {
    if (branchId) return; // already have it from JWT
    fetch("/api/me/branch")
      .then((r) => r.json())
      .then((d) => { if (d.branchId) setBranchId(d.branchId); })
      .catch(() => {});
  }, [branchId]);

  // Also update when session changes
  useEffect(() => {
    if (session?.user?.branchId) setBranchId(session.user.branchId);
  }, [session]);

  const navItems = [
    { href: "/employee", Icon: Home, label: "Home" },
    { href: "/employee/daily-report", Icon: MessageSquareText, label: "Daily" },
    { href: "/employee/health-check", Icon: ClipboardCheck, label: "Health" },
    ...(branchId ? [{ href: `/store/${branchId}`, Icon: Store, label: "Store", match: (path: string) => path.startsWith("/store") }] : []),
    { href: "/employee/cst", Icon: Users, label: "CST" },
    { href: "/employee/sr-sku", Icon: FileText, label: "SR/SKU" },
  ];

  return <AppBottomNav items={navItems} primaryCount={3} />;
}

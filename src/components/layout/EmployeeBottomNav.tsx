"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ClipboardCheck, FileText, Home, LogOut, MessageSquareText, Store, Users } from "lucide-react";

export default function EmployeeBottomNav() {
  const pathname = usePathname();
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
    { href: "/employee",              Icon: Home,              label: "Home" },
    { href: "/employee/daily-report", Icon: MessageSquareText, label: "Daily" },
    { href: "/employee/health-check", Icon: ClipboardCheck,    label: "Health" },
    { href: "/employee/cst",          Icon: Users,             label: "CST" },
    { href: "/employee/sr-sku",       Icon: FileText,          label: "SR/SKU" },
    ...(branchId ? [{ href: `/store/${branchId}`, Icon: Store, label: "Store" }] : []),
  ];

  return (
    <nav className="vf-bottom-nav">
      {navItems.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`vf-bottom-nav-item ${pathname === href || (href.startsWith("/store") && pathname.startsWith("/store")) ? "active" : ""}`}
        >
          <Icon className="nav-icon" size={22} strokeWidth={2.2} />
          <span>{label}</span>
        </Link>
      ))}
      <button
        className="vf-bottom-nav-item"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="nav-icon" size={22} strokeWidth={2.2} />
        <span>Logout</span>
      </button>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { ClipboardCheck, LayoutDashboard, LogOut, MessageSquareText, Store } from "lucide-react";

export default function ManagerBottomNav() {
  const pathname = usePathname();
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
    { href: "/manager/health-check", Icon: ClipboardCheck,    label: "Health" },
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

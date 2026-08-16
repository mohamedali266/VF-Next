"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Building2, ClipboardCheck, FileText, Home, LogOut, ScrollText, Users } from "lucide-react";

const navItems = [
  { href: "/admin", icon: Home, label: "Home" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/reports", icon: FileText, label: "Reports" },
  { href: "/admin/branches", icon: Building2, label: "Branches" },
  { href: "/admin/health-check", icon: ClipboardCheck, label: "Health" },
  { href: "/admin/edit-logs", icon: ScrollText, label: "Logs" },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nox-bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nox-bottom-nav-item ${pathname === item.href ? "active" : ""}`}
          >
            <Icon className="nav-icon" size={21} strokeWidth={2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button className="nox-bottom-nav-item" onClick={() => signOut({ callbackUrl: "/login" })}>
        <LogOut className="nav-icon" size={21} strokeWidth={2.2} />
        <span>Logout</span>
      </button>
    </nav>
  );
}

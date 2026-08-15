"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/admin",               icon: "⚡", label: "الرئيسية" },
  { href: "/admin/users",         icon: "👥", label: "المستخدمون" },
  { href: "/admin/branches",      icon: "Branch", label: "Branches" },
  { href: "/admin/health-check",  icon: "📊", label: "Health Check" },
  { href: "/admin/edit-logs",     icon: "Audit", label: "Logs" },
];

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="nox-bottom-nav">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`nox-bottom-nav-item ${pathname === item.href ? "active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ))}
      <button
        className="nox-bottom-nav-item"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <span className="nav-icon">🚪</span>
        <span>خروج</span>
      </button>
    </nav>
  );
}

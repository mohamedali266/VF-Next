"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ClipboardCheck, Home, LogOut, MessageSquareText } from "lucide-react";

const navItems = [
  { href: "/employee", icon: Home, label: "Home" },
  { href: "/employee/daily-report", icon: MessageSquareText, label: "Daily" },
  { href: "/employee/health-check", icon: ClipboardCheck, label: "Health" },
];

export default function EmployeeBottomNav() {
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
            <Icon className="nav-icon" size={22} strokeWidth={2.2} />
            <span>{item.label}</span>
          </Link>
        );
      })}
      <button
        className="nox-bottom-nav-item"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="nav-icon" size={22} strokeWidth={2.2} />
        <span>Logout</span>
      </button>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { CalendarDays, ClipboardCheck, LayoutDashboard, LogOut, MessageSquareText, Users } from "lucide-react";

const navItems = [
  { href: "/area", Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/area/users", Icon: Users, label: "Users" },
  { href: "/area/sms", Icon: MessageSquareText, label: "SMS" },
  { href: "/area/schedule", Icon: CalendarDays, label: "Schedule" },
  { href: "/area/health-check", Icon: ClipboardCheck, label: "Health" },
];

export default function AreaBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="vf-bottom-nav">
      {navItems.map(({ href, Icon, label }) => (
        <Link
          key={href}
          href={href}
          className={`vf-bottom-nav-item ${pathname === href ? "active" : ""}`}
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

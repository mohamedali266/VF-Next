"use client";

import { CalendarDays, ClipboardCheck, LayoutDashboard, MessageSquareText, Users } from "lucide-react";
import AppBottomNav from "./AppBottomNav";

const navItems = [
  { href: "/area", Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/area/users", Icon: Users, label: "Users" },
  { href: "/area/sms", Icon: MessageSquareText, label: "SMS" },
  { href: "/area/schedule", Icon: CalendarDays, label: "Schedule" },
  { href: "/area/health-check", Icon: ClipboardCheck, label: "Health" },
];

export default function AreaBottomNav() {
  return <AppBottomNav items={navItems} primaryCount={3} />;
}

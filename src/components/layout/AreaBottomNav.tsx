"use client";

import { Building2, CalendarDays, ClipboardCheck, ClipboardList, LayoutDashboard, MessageSquareText, Users } from "lucide-react";
import AppBottomNav from "./AppBottomNav";

const navItems = [
  { href: "/area", Icon: LayoutDashboard, label: "Dashboard" },
  { href: "/area/stores", Icon: Building2, label: "Stores" },
  { href: "/area/users", Icon: Users, label: "Users" },
  { href: "/area/tasks", Icon: ClipboardList, label: "Tasks" },
  { href: "/area/sms", Icon: MessageSquareText, label: "SMS" },
  { href: "/area/schedule", Icon: CalendarDays, label: "Schedule" },
  { href: "/area/health-check", Icon: ClipboardCheck, label: "Health" },
];

export default function AreaBottomNav() {
  return <AppBottomNav items={navItems} primaryCount={3} />;
}

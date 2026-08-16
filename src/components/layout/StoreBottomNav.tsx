"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Home, LogOut, Store } from "lucide-react";

export default function StoreBottomNav({ homeHref }: { homeHref: string }) {
  const pathname = usePathname();

  return (
    <nav className="vf-bottom-nav">
      <Link
        href={homeHref}
        className="vf-bottom-nav-item"
      >
        <Home className="nav-icon" size={22} strokeWidth={2.2} />
        <span>Home</span>
      </Link>

      <Link
        href={pathname}
        className="vf-bottom-nav-item active"
      >
        <Store className="nav-icon" size={22} strokeWidth={2.2} />
        <span>Store</span>
      </Link>

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

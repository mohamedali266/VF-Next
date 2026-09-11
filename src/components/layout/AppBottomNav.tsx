"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";

export type AppNavItem = {
  href: string;
  Icon: LucideIcon;
  label: string;
  match?: (pathname: string) => boolean;
};

type Props = {
  items: AppNavItem[];
  primaryCount?: number;
};

function isActive(item: AppNavItem, pathname: string) {
  return item.match ? item.match(pathname) : pathname === item.href;
}

export default function AppBottomNav({ items, primaryCount = 3 }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primaryItems = items.slice(0, primaryCount);
  const menuItems = items.slice(primaryCount);
  const activeMenuItem = useMemo(() => menuItems.some((item) => isActive(item, pathname)), [menuItems, pathname]);

  return (
    <>
      {open && (
        <div className="vf-nav-scrim" onClick={() => setOpen(false)}>
          <aside className="vf-nav-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="vf-nav-drawer-head">
              <div>
                <span>Quick menu</span>
                <strong>VF-Next</strong>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>

            <div className="vf-nav-drawer-list">
              {menuItems.map(({ href, Icon, label, match }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`vf-nav-drawer-link ${(match ? match(pathname) : pathname === href) ? "active" : ""}`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </Link>
              ))}
              <button className="vf-nav-drawer-link danger" type="button" onClick={() => signOut({ callbackUrl: "/login" })}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      <nav className="vf-bottom-nav vf-bottom-nav-mobile">
        {primaryItems.map(({ href, Icon, label, match }) => (
          <Link
            key={href}
            href={href}
            className={`vf-bottom-nav-item ${(match ? match(pathname) : pathname === href) ? "active" : ""}`}
          >
            <Icon className="nav-icon" size={22} strokeWidth={2.3} />
            <span>{label}</span>
          </Link>
        ))}
        <button
          className={`vf-bottom-nav-item vf-menu-trigger ${open || activeMenuItem ? "active" : ""}`}
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          <Menu className="nav-icon" size={22} strokeWidth={2.3} />
          <span>Menu</span>
        </button>
      </nav>

      <nav className="vf-bottom-nav vf-bottom-nav-desktop">
        {items.map(({ href, Icon, label, match }) => (
          <Link
            key={href}
            href={href}
            className={`vf-bottom-nav-item ${(match ? match(pathname) : pathname === href) ? "active" : ""}`}
          >
            <Icon className="nav-icon" size={21} strokeWidth={2.25} />
            <span>{label}</span>
          </Link>
        ))}
        <button
          className="vf-bottom-nav-item"
          type="button"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="nav-icon" size={21} strokeWidth={2.25} />
          <span>Logout</span>
        </button>
      </nav>
    </>
  );
}

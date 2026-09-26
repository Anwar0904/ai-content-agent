"use client";

import {
  Clapperboard,
  Command,
  FolderKanban,
  LayoutDashboard,
  Bell,
  Menu,
  Send,
  Share2,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const navigationGroups = [
  {
    label: "COMMAND CENTER",
    links: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "CONTENT",
    links: [
      { label: "Campaigns", href: "/campaigns", icon: FolderKanban },
      { label: "Videos", href: "/videos", icon: Clapperboard },
    ],
  },
  {
    label: "PUBLISHING",
    links: [
      { label: "Publishing", href: "/publishing", icon: Send },
      { label: "Social accounts", href: "/social-accounts", icon: Share2 },
    ],
  },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/campaigns": "Campaigns",
  "/campaigns/new": "New campaign",
  "/videos": "Videos",
  "/publishing": "Publishing",
  "/social-accounts": "Social accounts",
};

function isCurrentPath(pathname: string, href: string): boolean {
  return pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = pageTitles[pathname] ?? "Content operations";

  return (
    <div className="workspace-frame">
      {mobileOpen && (
        <button
          aria-label="Dismiss navigation overlay"
          className="mobile-nav-backdrop"
          onClick={() => setMobileOpen(false)}
          type="button"
        />
      )}

      <aside
        aria-label="Main navigation"
        className={`workspace-sidebar${mobileOpen ? " is-open" : ""}`}
      >
        <Link
          aria-label="Studio dashboard"
          className="sidebar-brand"
          href="/dashboard"
          onClick={() => setMobileOpen(false)}
        >
          <span className="brand-mark"><Command aria-hidden="true" size={17} /></span>
          <span className="brand-copy">
            <span className="brand-name">Studio</span>
            <span className="brand-caption">Content operations</span>
          </span>
        </Link>
        <button
          aria-label="Close navigation"
          className="sidebar-close-button"
          onClick={() => setMobileOpen(false)}
          type="button"
        >
          <X aria-hidden="true" size={17} />
        </button>

        <nav className="sidebar-nav">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <span className="nav-label">{group.label}</span>
              {group.links.map(({ href, icon: Icon, label }) => {
                const active = isCurrentPath(pathname, href);
                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`nav-link${active ? " is-active" : ""}`}
                    href={href}
                    key={href}
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="workspace-name">Workspace</div>
          <div className="workspace-caption">Content team</div>
        </div>
      </aside>

      <div className="workspace-main">
        <header className="top-header">
          <div className="header-left">
            <button
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
              className="mobile-menu-button"
              onClick={() => setMobileOpen((isOpen) => !isOpen)}
              type="button"
            >
              {mobileOpen ? <X aria-hidden="true" size={17} /> : <Menu aria-hidden="true" size={17} />}
            </button>
            <div className="header-context">
              <span>Workspace</span>
              <span aria-hidden="true" className="header-separator">/</span>
              <span className="header-page">{currentTitle}</span>
            </div>
          </div>
          <div className="header-actions" aria-label="Workspace member">
            <button
              aria-label="Notifications are not available yet"
              className="header-notifications"
              disabled
              title="Notifications are not available yet"
              type="button"
            >
              <Bell aria-hidden="true" size={16} strokeWidth={1.8} />
            </button>
            <span className="header-avatar" aria-hidden="true">S</span>
            <span className="header-user">Studio member</span>
          </div>
        </header>
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}
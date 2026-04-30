import Link from "next/link";

import { miniAppTheme } from "@/app/_components/mini-app-theme";

export type MiniAppView = "home" | "report" | "activities" | "settings";

type BottomBarProps = {
  active: MiniAppView;
  groupId?: string | null;
};

type NavItem = {
  label: string;
  view: MiniAppView;
  icon: "home" | "report" | "stat" | "settings";
};

const navItems: NavItem[] = [
  { label: "หน้าแรก", view: "home", icon: "home" },
  { label: "รายงาน", view: "report", icon: "report" },
  { label: "กิจกรรม", view: "activities", icon: "stat" },
  { label: "ตั้งค่า", view: "settings", icon: "settings" },
];

function iconPath(icon: NavItem["icon"]) {
  if (icon === "home") {
    return (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v10h5v-6h4v6h5V10" />
      </>
    );
  }

  if (icon === "report") {
    return (
      <>
        <path d="M8 4h8l3 3v13H5V4z" />
        <path d="M16 4v4h4M8 12h8M8 16h5" />
      </>
    );
  }

  if (icon === "stat") {
    return (
      <>
        <path d="M4 20h16" />
        <path d="M7 20V10" />
        <path d="M12 20V5" />
        <path d="M17 20v-7" />
      </>
    );
  }

  return (
    <>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2.1 2.1 0 0 1-2.97 2.97l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.1 1.66V21.3a2.1 2.1 0 0 1-4.2 0v-.06a1.8 1.8 0 0 0-1.1-1.66 1.8 1.8 0 0 0-1.98.36l-.04.04a2.1 2.1 0 1 1-2.97-2.97l.04-.04A1.8 1.8 0 0 0 3.6 15a1.8 1.8 0 0 0-1.66-1.1H1.9a2.1 2.1 0 0 1 0-4.2h.06A1.8 1.8 0 0 0 3.6 8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2.1 2.1 0 0 1 2.97-2.97l.04.04A1.8 1.8 0 0 0 8.2 3.4a1.8 1.8 0 0 0 1.1-1.66V1.7a2.1 2.1 0 0 1 4.2 0v.06a1.8 1.8 0 0 0 1.1 1.66 1.8 1.8 0 0 0 1.98-.36l.04-.04a2.1 2.1 0 0 1 2.97 2.97l-.04.04A1.8 1.8 0 0 0 19.4 8a1.8 1.8 0 0 0 1.66 1.1h.06a2.1 2.1 0 0 1 0 4.2h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </>
  );
}

function buildHref(view: MiniAppView, groupId?: string | null) {
  const params = new URLSearchParams({ view });

  if (groupId) {
    params.set("groupId", groupId);
  }

  return `/mini-app?${params.toString()}`;
}

export function BottomBar({ active, groupId }: BottomBarProps) {
  return (
    <nav className={miniAppTheme.bottomNav.shell} aria-label="Mini app navigation">
      <div className="grid grid-cols-4 gap-1">
        {navItems.map((item) => {
          const isActive = item.view === active;

          return (
            <Link
              key={item.view}
              href={buildHref(item.view, groupId)}
              aria-current={isActive ? "page" : undefined}
              className={`${miniAppTheme.bottomNav.item} ${
                isActive ? miniAppTheme.bottomNav.active : miniAppTheme.bottomNav.inactive
              }`}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.25"
                className={miniAppTheme.icon.nav}
                aria-hidden="true"
              >
                {iconPath(item.icon)}
              </svg>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

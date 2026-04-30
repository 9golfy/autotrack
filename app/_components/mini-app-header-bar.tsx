import type { ReactNode } from "react";

import { miniAppTheme } from "@/app/_components/mini-app-theme";

type HeaderBarProps = {
  title: string;
  subtitle?: string;
  groupName?: string | null;
  patientName?: string;
  avatarUrl?: string | null;
  currentDateLabel?: string;
  rightAction?: ReactNode;
};

function HeaderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.25"
      className={miniAppTheme.icon.brand}
      aria-hidden="true"
    >
      <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" />
      <path d="M9 12h6M12 9v6" />
    </svg>
  );
}

export function HeaderBar({
  title,
  rightAction,
}: HeaderBarProps) {
  return (
    <header className={miniAppTheme.layout.header}>
      <div className={miniAppTheme.layout.headerInner}>
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] bg-[#1976D2] text-white shadow-[0_8px_18px_rgba(25,118,210,0.18)]">
            <HeaderIcon />
          </div>
          <h1 className={`${miniAppTheme.typography.brandTitle} truncate text-[#082B5F]`}>{title}</h1>
        </div>

        {rightAction ? <div className="absolute right-4 shrink-0">{rightAction}</div> : null}
      </div>
    </header>
  );
}

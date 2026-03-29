"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Building2, HelpCircle } from "lucide-react";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

export function SettingsNavIcon({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const homeActive = pathname === "/dashboard";
  const propertiesActive = pathname.startsWith("/properties");
  const settingsActive = pathname.startsWith("/settings");
  const helpActive = pathname.startsWith("/help");

  const linkClass = (active: boolean) =>
    `tap-feedback-touch active:opacity-75 flex flex-col items-center gap-1 py-1 ${
      active ? "text-[#008bff]" : "text-gray-400 hover:text-[#008bff]"
    }`;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 w-full border-t border-gray-200 bg-white px-4 py-2 safe-area-pb lg:hidden"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <div className="mx-auto flex max-w-[720px] items-center justify-around">
        <Link href="/dashboard" className={linkClass(homeActive)}>
          <Home size={24} />
          <span className="text-xs font-medium" style={fontStyle}>
            Home
          </span>
        </Link>
        <Link href="/properties" className={linkClass(propertiesActive)}>
          <Building2 size={24} />
          <span className="text-xs font-medium" style={fontStyle}>
            Properties
          </span>
        </Link>
        <Link href="/settings" className={linkClass(settingsActive)}>
          <SettingsNavIcon size={24} />
          <span className="text-xs font-medium" style={fontStyle}>
            Settings
          </span>
        </Link>
        <Link href="/help" className={linkClass(helpActive)}>
          <HelpCircle size={24} />
          <span className="text-xs font-medium" style={fontStyle}>
            Help
          </span>
        </Link>
      </div>
    </nav>
  );
}

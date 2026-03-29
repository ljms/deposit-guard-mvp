"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, Building2, HelpCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SettingsNavIcon } from "./BottomNav";

const fontStyle = { fontFamily: "var(--font-poppins), Poppins, sans-serif" };

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type NavItem = { href: string; label: string; icon: "home" | "properties" | "settings" | "help" };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/properties", label: "Properties", icon: "properties" },
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/help", label: "Help", icon: "help" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type DesktopSidebarProps = {
  userDisplayName: string;
};

export function DesktopSidebar({ userDisplayName }: DesktopSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside
      className="fixed left-0 top-0 z-50 hidden h-screen w-[240px] flex-col overflow-hidden bg-[#0d1117] lg:flex"
      style={fontStyle}
    >
      <div className="w-full shrink-0 px-5 pt-5">
        <Image
          src="/dg-logo-light.png"
          alt="Deposit Guard"
          width={240}
          height={78}
          sizes="120px"
          className="mx-auto mb-5 block h-auto w-full max-w-[120px] object-contain"
        />
      </div>

      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-2">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-0.5 flex items-center gap-2 rounded-md px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-[rgba(0,139,255,0.15)] font-medium text-[#008bff]"
                  : "text-white/[0.6] hover:bg-white/[0.05]"
              }`}
            >
              {item.icon === "home" && <Home size={18} strokeWidth={2} className="shrink-0 opacity-90" />}
              {item.icon === "properties" && <Building2 size={18} strokeWidth={2} className="shrink-0 opacity-90" />}
              {item.icon === "settings" && <SettingsNavIcon size={18} className="shrink-0 opacity-90" />}
              {item.icon === "help" && <HelpCircle size={18} strokeWidth={2} className="shrink-0 opacity-90" />}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex shrink-0 gap-2 px-5 pb-5 pt-3">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a86] text-[11px] font-medium text-white"
          aria-hidden
        >
          {initialsFromName(userDisplayName)}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-xs font-medium leading-tight text-white">{userDisplayName || "Account"}</p>
          {/* Use span, not <button>: globals.css sets `button { color: #0f172a }` which matches the sidebar bg */}
          <span
            role="button"
            tabIndex={0}
            onClick={handleLogout}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void handleLogout();
              }
            }}
            className="w-fit cursor-pointer text-left text-[11px] text-[#cbd5e1] underline-offset-2 hover:text-white hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#008bff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0d1117]"
          >
            Log out
          </span>
        </div>
      </div>
    </aside>
  );
}

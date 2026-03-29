"use client";

import { DesktopSidebar } from "./DesktopSidebar";

type AppLayoutProps = {
  children: React.ReactNode;
  userDisplayName: string;
  userAvatarUrl?: string | null;
};

export function AppLayout({ children, userDisplayName, userAvatarUrl }: AppLayoutProps) {
  return (
    <div className="min-h-screen w-full lg:flex">
      <DesktopSidebar userDisplayName={userDisplayName} userAvatarUrl={userAvatarUrl} />
      {/* pl-[240px] reserves space for fixed sidebar; inner max-w + mx-auto centres content in that region */}
      <div className="min-h-screen min-w-0 flex-1 lg:bg-white lg:pl-[240px]">
        <div className="mx-auto min-h-screen w-full max-w-[960px] lg:px-10 lg:py-8">
          {children}
        </div>
      </div>
    </div>
  );
}

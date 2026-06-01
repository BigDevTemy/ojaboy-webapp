"use client";

import { useState } from "react";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#fbfbfb] text-black">
      <div className="flex min-h-screen">
        <DashboardSidebar
          isCollapsed={isSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
          onToggleCollapse={() => setIsSidebarCollapsed((value) => !value)}
        />
        <section className="min-w-0 flex-1">
          <DashboardTopbar
            isSidebarCollapsed={isSidebarCollapsed}
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            onToggleDesktopSidebar={() => setIsSidebarCollapsed((value) => !value)}
          />
          <div className="px-5 py-7 sm:px-8 lg:px-10">{children}</div>
        </section>
      </div>
    </main>
  );
}

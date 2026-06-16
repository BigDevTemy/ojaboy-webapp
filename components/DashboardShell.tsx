"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { CustomerMobileAiAssistant } from "@/components/CustomerMobileAiAssistant";
import { CustomerMobileHome } from "@/components/CustomerMobileHome";
import { CustomerMobileOrders } from "@/components/CustomerMobileOrders";
import { CustomerMobilePriceAlerts } from "@/components/CustomerMobilePriceAlerts";
import { CustomerMobileShell } from "@/components/CustomerMobileShell";
import { CustomerMobileWishlist } from "@/components/CustomerMobileWishlist";
import { DashboardAddresses } from "@/components/DashboardAddresses";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopbar } from "@/components/DashboardTopbar";
import { requiresDefaultAddress } from "@/lib/authSession";
import { useAuthSession } from "@/lib/useAuthSession";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const session = useAuthSession();
  const pathname = usePathname();
  const isCustomer = session?.user.role?.toLowerCase() === "user";

  if (requiresDefaultAddress(session)) {
    const addressSetup = (
      <div className="mx-auto max-w-4xl">
        <DashboardAddresses forceAddAddress />
      </div>
    );

    if (isCustomer) {
      return (
        <CustomerMobileShell showNavigation={false}>
          {addressSetup}
        </CustomerMobileShell>
      );
    }

    return (
      <main className="min-h-screen bg-[#fbfbfb] px-5 py-8 text-black sm:px-8">
        {addressSetup}
      </main>
    );
  }

  if (isCustomer) {
    const customerContent =
      pathname === "/dashboard" ? (
        <CustomerMobileHome />
      ) : pathname === "/dashboard/orders" ? (
        <CustomerMobileOrders />
      ) : pathname === "/dashboard/ai-assistant" ? (
        <CustomerMobileAiAssistant />
      ) : pathname === "/dashboard/watchlist" ? (
        <CustomerMobileWishlist />
      ) : pathname === "/dashboard/price-alerts" ? (
        <CustomerMobilePriceAlerts />
      ) : (
        children
      );

    return (
      <CustomerMobileShell>
        {customerContent}
      </CustomerMobileShell>
    );
  }

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

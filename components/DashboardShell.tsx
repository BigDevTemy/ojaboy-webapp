"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CustomerMobileAiAssistant } from "@/components/CustomerMobileAiAssistant";
import { CustomerMobileHome } from "@/components/CustomerMobileHome";
import { CustomerMobileMarketWatch } from "@/components/CustomerMobileMarketWatch";
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
  const hasMounted = useSyncExternalStore(
    subscribeToClientHydration,
    getClientHydrationSnapshot,
    getServerHydrationSnapshot,
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const session = useAuthSession();
  const pathname = usePathname();
  const router = useRouter();
  const role = session?.user.role?.trim().toLowerCase() ?? "";
  const hasKnownRole = role.length > 0;
  const isCustomer = role === "user";
  const isMarketAgent = role.replace(/[\s_-]/g, "") === "marketagent";

  useEffect(() => {
    if (hasMounted && !session) {
      router.replace("/login");
    }
  }, [hasMounted, router, session]);

  useEffect(() => {
    if (hasMounted && session && isMarketAgent && pathname !== "/dashboard/market-prices") {
      router.replace("/dashboard/market-prices");
    }
  }, [hasMounted, isMarketAgent, pathname, router, session]);

  if (!hasMounted || !session || !hasKnownRole) {
    return <DashboardAccessCheck isRedirecting={hasMounted && !session} />;
  }

  if (isCustomer && requiresDefaultAddress(session)) {
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
      ) : pathname === "/dashboard/market-prices" ? (
        <CustomerMobileMarketWatch />
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

  if (isMarketAgent && pathname !== "/dashboard/market-prices") {
    return <DashboardAccessCheck isRedirecting />;
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

function subscribeToClientHydration(listener: () => void) {
  const timeoutId = window.setTimeout(listener, 0);

  return () => window.clearTimeout(timeoutId);
}

function getClientHydrationSnapshot() {
  return true;
}

function getServerHydrationSnapshot() {
  return false;
}

function DashboardAccessCheck({ isRedirecting }: { isRedirecting: boolean }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfbfb] px-5 text-center text-black">
      <section className="w-full max-w-sm rounded-xl border border-black/10 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.06)]">
        <div className="mx-auto h-10 w-10 animate-pulse rounded-full bg-[#fff0f0]" />
        <p className="mt-4 text-sm font-black text-black">
          {isRedirecting ? "Opening login..." : "Checking your account access..."}
        </p>
        <p className="mt-2 text-xs font-medium leading-5 text-black/50">
          Please wait while we confirm your dashboard role.
        </p>
      </section>
    </main>
  );
}

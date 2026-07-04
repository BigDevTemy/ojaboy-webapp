"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  ChevronLeft,
  House,
  MessageCircle,
  MessageSquare,
  ReceiptText,
  UserRound,
} from "lucide-react";

const routeTitles: Record<string, string> = {
  "/dashboard": "Home",
  "/dashboard/market-prices": "Market Prices",
  "/dashboard/markets": "Markets",
  "/dashboard/watchlist": "Watchlist",
  "/dashboard/price-alerts": "Price Alerts",
  "/dashboard/ai-assistant": "AI Assistant",
  "/dashboard/reports": "Reports",
  "/dashboard/orders": "Orders",
  "/dashboard/messages": "Messages",
  "/dashboard/profile": "Profile",
  "/dashboard/addresses": "Addresses",
  "/dashboard/notifications": "Notifications",
  "/dashboard/support": "Support",
  "/dashboard/settings": "Settings",
};

const customerNavItems = [
  { label: "Home", href: "/dashboard", icon: House },
  { label: "Orders", href: "/dashboard/orders", icon: ReceiptText },
  { label: "AI", href: "/dashboard/ai-assistant", icon: Bot },
  { label: "Support", href: "/dashboard/support", icon: MessageCircle },
  { label: "Profile", href: "/dashboard/profile", icon: UserRound },
] as const;

function getRouteTitle(pathname: string) {
  const exactTitle = routeTitles[pathname];

  if (exactTitle) {
    return exactTitle;
  }

  const matchingRoute = Object.keys(routeTitles)
    .filter((route) => route !== "/dashboard")
    .find((route) => pathname.startsWith(route));

  return matchingRoute ? routeTitles[matchingRoute] : "Ojaboy";
}

export function CustomerMobileShell({
  children,
  showNavigation = true,
}: {
  children: React.ReactNode;
  showNavigation?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isHome = pathname === "/dashboard";
  const isAiAssistant = pathname === "/dashboard/ai-assistant";

  function handleBack() {
    if (window.history.length > 1) {
      router.back();
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="customer-app-background min-h-dvh bg-[#f3f3f3] text-black">
      <div className="customer-app-shell mx-auto min-h-dvh w-full bg-[#fbfbfb] shadow-[0_0_60px_rgba(0,0,0,0.08)]">
        {!isHome ? (
          <header className="customer-app-safe-top sticky top-0 z-30 border-b border-black/[0.06] bg-white/95 px-4 pb-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  aria-label="Go back"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black"
                  type="button"
                  onClick={handleBack}
                >
                  <ChevronLeft size={19} />
                </button>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#f10606]">
                    Ojaboy
                  </p>
                  <h1 className="truncate text-sm font-black text-black">
                    {getRouteTitle(pathname)}
                  </h1>
                </div>
              </div>
              <Link
                aria-label="Open profile"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff0f0] text-[#f10606] transition active:scale-95"
                href="/dashboard/profile"
              >
                <UserRound size={18} strokeWidth={2.4} />
              </Link>
            </div>
          </header>
        ) : null}

        <div
          className={`customer-app-content ${
            isHome
              ? "customer-app-safe-top mx-auto w-full max-w-6xl px-4 pb-5 sm:px-6 lg:px-8"
              : isAiAssistant
                ? "mx-auto w-full max-w-6xl p-0"
                : "mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 lg:px-8"
          } ${
            showNavigation
              ? isAiAssistant
                ? "pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
                : "pb-28 sm:pb-32"
              : "customer-app-safe-bottom"
          }`}
        >
          {children}
        </div>

        {showNavigation ? (
          <>
            {!isAiAssistant ? (
              <Link
                aria-label="Open AI Assistant"
                className="customer-mobile-ai-link fixed z-[100] flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-[#f10606] text-white shadow-[0_18px_45px_rgba(241,6,6,0.48)] transition active:scale-95"
                href="/dashboard/ai-assistant"
              >
                <MessageSquare size={27} strokeWidth={2.4} />
                <span className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-white bg-[#36c96d]" />
              </Link>
            ) : null}
            <nav
              aria-label="Customer navigation"
              className="customer-app-navigation fixed inset-x-0 bottom-0 z-40 mx-auto w-full border-t border-black/[0.08] bg-white/96 px-2 pt-2 shadow-[0_-12px_30px_rgba(0,0,0,0.07)] backdrop-blur-xl sm:px-4"
            >
              <div className="mx-auto grid w-full max-w-6xl grid-cols-5 gap-1">
                {customerNavItems.map((item) => {
                  const isActive =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);

                  return (
                    <Link
                      aria-current={isActive ? "page" : undefined}
                      className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[9px] font-black transition sm:text-[10px] md:text-xs ${
                        isActive
                          ? "text-[#f10606]"
                          : "text-black/42 active:bg-black/[0.04]"
                      }`}
                      href={item.href}
                      key={item.href}
                    >
                      <span
                        className={`flex h-7 w-10 items-center justify-center rounded-full ${
                          isActive ? "bg-[#fff0f0]" : ""
                        }`}
                      >
                        <item.icon size={18} strokeWidth={isActive ? 2.6 : 2} />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </>
        ) : null}
      </div>
    </main>
  );
}

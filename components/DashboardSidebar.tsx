"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/authSession";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  Bell,
  Bot,
  ChevronDown,
  Crown,
  FileText,
  LayoutDashboard,
  LineChart,
  LogOut,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingCart,
  Star,
  Store,
  X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Market Prices", icon: LineChart, href: "/dashboard/market-prices" },
  { label: "Markets", icon: Store, href: "/dashboard/markets" },
  { label: "Watchlist", icon: Star, href: "/dashboard/watchlist" },
  { label: "Price Alerts", icon: Bell, href: "/dashboard/price-alerts" },
  { label: "AI Assistant", icon: Bot, href: "/dashboard/ai-assistant" },
  { label: "Reports & Insights", icon: FileText, href: "/dashboard/reports" },
  { label: "Orders", icon: ShoppingCart, href: "/dashboard/orders", badge: "3" },
  { label: "Support", icon: MessageSquare, href: "/dashboard/support" },
  { label: "Settings", icon: Settings, href: "/dashboard/settings" },
];

type DashboardSidebarProps = {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
};

export function DashboardSidebar({
  isCollapsed,
  isMobileOpen,
  onCloseMobile,
  onToggleCollapse,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthSession()?.user ?? null;

  function handleLogout() {
    clearAuthSession();
    router.replace("/login");
  }

  const displayName = user?.fullName ?? "User";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const planLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Account` : "Free Plan";

  return (
    <>
      <button
        className={`fixed inset-0 z-40 bg-black/35 transition lg:hidden ${isMobileOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
        type="button"
        aria-label="Close dashboard menu"
        onClick={onCloseMobile}
      />

      <aside
        className={`dashboard-sidebar-scroll fixed inset-y-0 left-0 z-50 flex h-screen w-[270px] shrink-0 flex-col overflow-y-auto border-r border-black/10 bg-white py-7 transition-all duration-300 lg:sticky lg:top-0 lg:z-auto ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "lg:w-[88px] lg:px-4" : "lg:w-[270px] lg:px-6"} lg:translate-x-0 px-6`}
      >
      <div className={`flex h-12 items-center ${isCollapsed ? "lg:justify-center" : "justify-between"}`}>
        <Link className={`${isCollapsed ? "lg:hidden" : ""} block h-12 w-[170px]`} href="/" aria-label="Ojaboy home" onClick={onCloseMobile}>
          <Image
            src="/logo/ojaboy-logo.svg"
            alt="Ojaboy"
            width={170}
            height={46}
            priority
            unoptimized
            className="h-full w-full object-contain object-left"
          />
        </Link>
        <Link
          className={`hidden h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606] ${isCollapsed ? "lg:flex" : ""}`}
          href="/"
          aria-label="Ojaboy home"
        >
          <Store size={22} />
        </Link>
        <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-black/70 lg:hidden" type="button" aria-label="Close dashboard menu" onClick={onCloseMobile}>
          <X size={19} />
        </button>
      </div>

      <nav className="mt-9 flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              className={`flex h-12 w-full items-center rounded-lg px-3 text-left text-sm font-black transition ${
                isActive ? "bg-[#fff0f0] text-[#f10606]" : "text-black/82 hover:bg-black/[0.03] hover:text-[#f10606]"
              } ${isCollapsed ? "lg:justify-center lg:gap-0" : "gap-4"}`}
              href={item.href}
              key={item.label}
              onClick={onCloseMobile}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={20} strokeWidth={2.2} />
              <span className={`min-w-0 flex-1 truncate ${isCollapsed ? "lg:hidden" : ""}`}>{item.label}</span>
              {item.badge ? (
                <span className={`flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f10606] px-2 text-xs font-black text-white ${isCollapsed ? "lg:hidden" : ""}`}>
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <button
        className="mt-4 hidden h-11 items-center justify-center gap-2 rounded-lg border border-black/10 text-xs font-black text-black/70 transition hover:text-[#f10606] lg:flex"
        type="button"
        onClick={onToggleCollapse}
      >
        {isCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
        <span className={isCollapsed ? "hidden" : ""}>{isCollapsed ? "Open" : "Collapse"}</span>
      </button>

      <div className={`mt-4 rounded-xl border border-[#ffcaca] bg-[#fff7f7] p-5 ${isCollapsed ? "lg:hidden" : ""}`}>
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#f10606] shadow-sm">
          <Crown size={20} />
        </div>
        <h2 className="text-lg font-black text-black">Go Premium</h2>
        <p className="mt-2 text-xs font-medium leading-5 text-black/62">
          Unlock advanced insights, price predictions and smarter reports.
        </p>
        <button className="mt-5 h-11 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_14px_28px_rgba(241,6,6,0.22)]" type="button">
          Upgrade Now
        </button>
      </div>

      <button className={`mt-4 flex h-16 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 text-left shadow-sm ${isCollapsed ? "lg:justify-center lg:px-0" : ""}`} type="button">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe5e5] text-sm font-black text-[#f10606]">{displayInitial}</span>
        <span className={`min-w-0 flex-1 ${isCollapsed ? "lg:hidden" : ""}`}>
          <span className="block truncate text-sm font-black text-black">{displayName}</span>
          <span className="block text-xs font-medium text-black/55">{user?.email ?? planLabel}</span>
        </span>
        <ChevronDown className={isCollapsed ? "lg:hidden" : ""} size={16} />
      </button>

      <button
        className={`mt-3 flex h-12 items-center justify-center gap-3 rounded-lg border border-black/10 text-sm font-black text-[#f10606] transition hover:bg-[#fff7f7] ${isCollapsed ? "lg:px-0" : "px-3"}`}
        type="button"
        onClick={handleLogout}
        title={isCollapsed ? "Logout" : undefined}
      >
        <LogOut size={18} />
        <span className={isCollapsed ? "lg:hidden" : ""}>Logout</span>
      </button>
    </aside>
    </>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Bot,
  ChevronDown,
  Crown,
  FileText,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Settings,
  ShoppingCart,
  Star,
  Store,
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

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="dashboard-sidebar-scroll hidden h-screen w-[270px] shrink-0 overflow-y-auto border-r border-black/10 bg-white px-6 py-7 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link className="relative block h-12 w-[170px]" href="/" aria-label="Ojaboy home">
        <Image src="/logo/ojaboy-logo.svg" alt="Ojaboy" fill priority className="object-contain object-left" sizes="170px" />
      </Link>

      <nav className="mt-9 flex-1 space-y-2">
        {navItems.map((item) => {
          const isActive = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);

          return (
            <Link
              className={`flex h-12 w-full items-center gap-4 rounded-lg px-3 text-left text-sm font-black transition ${
                isActive ? "bg-[#fff0f0] text-[#f10606]" : "text-black/82 hover:bg-black/[0.03] hover:text-[#f10606]"
              }`}
              href={item.href}
              key={item.label}
            >
              <item.icon size={20} strokeWidth={2.2} />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f10606] px-2 text-xs font-black text-white">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="rounded-xl border border-[#ffcaca] bg-[#fff7f7] p-5 mt-4">
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

      <button className="mt-4 flex h-16 items-center gap-3 rounded-xl border border-black/10 bg-white px-3 text-left shadow-sm" type="button">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe5e5] text-sm font-black text-[#f10606]">T</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-black">Temiloluwa</span>
          <span className="block text-xs font-medium text-black/55">Free Plan</span>
        </span>
        <ChevronDown size={16} />
      </button>
    </aside>
  );
}

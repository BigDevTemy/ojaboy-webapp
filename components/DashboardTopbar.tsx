"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { logout } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  CheckCircle2,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  TrendingDown,
} from "lucide-react";

type DashboardTopbarProps = {
  isSidebarCollapsed: boolean;
  onOpenMobileSidebar: () => void;
  onToggleDesktopSidebar: () => void;
};

const latestNotifications = [
  {
    title: "Tomatoes dropped by 8%",
    body: "Oyingbo Market now has baskets from N18,500.",
    time: "12 mins ago",
    icon: TrendingDown,
    tone: "green",
  },
  {
    title: "Pepper alert triggered",
    body: "Basket prices rose above your N20,000 target.",
    time: "38 mins ago",
    icon: AlertTriangle,
    tone: "red",
  },
  {
    title: "Order ORD-24591 updated",
    body: "Your order is now out for delivery.",
    time: "1 hour ago",
    icon: CheckCircle2,
    tone: "green",
  },
];

export function DashboardTopbar({
  isSidebarCollapsed,
  onOpenMobileSidebar,
  onToggleDesktopSidebar,
}: DashboardTopbarProps) {
  const router = useRouter();
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const user = useAuthSession()?.user ?? null;

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const displayName = user?.fullName ?? "User";
  const displayInitial = displayName.trim().charAt(0).toUpperCase() || "U";
  const planLabel = user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)} Account` : "Free Plan";

  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/92 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-5 sm:px-8 lg:px-10">
        <button
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white lg:hidden"
          type="button"
          aria-label="Open dashboard menu"
          onClick={onOpenMobileSidebar}
        >
          <Menu size={22} />
        </button>
        <button
          className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-black/72 transition hover:text-[#f10606] lg:flex"
          type="button"
          aria-label={isSidebarCollapsed ? "Expand dashboard sidebar" : "Collapse dashboard sidebar"}
          onClick={onToggleDesktopSidebar}
        >
          {isSidebarCollapsed ? <PanelLeftOpen size={21} /> : <PanelLeftClose size={21} />}
        </button>

        <div className="relative max-w-3xl flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#f10606]" size={18} />
          <input
            className="h-12 w-full rounded-xl border border-black/10 bg-white pl-12 pr-16 text-sm font-medium text-black outline-none shadow-[0_10px_30px_rgba(0,0,0,0.05)] placeholder:text-black/42"
            placeholder="Ask Ojaboy anything about the market..."
          />
          <button className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.26)]" type="button" aria-label="Send market question">
            <Sparkles size={17} />
          </button>
        </div>

        <div className="ml-auto hidden items-center gap-5 md:flex">
          <div className="relative">
            <button
              className="relative text-black/72 hover:text-[#f10606]"
              type="button"
              aria-label="Notifications"
              aria-expanded={isNotificationsOpen}
              onClick={() => {
                setIsNotificationsOpen((value) => !value);
                setIsUserMenuOpen(false);
              }}
            >
              <Bell size={22} />
              <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f10606] px-1 text-[10px] font-black text-white">3</span>
            </button>

            {isNotificationsOpen ? (
              <div className="absolute right-0 top-10 w-80 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
                  <h2 className="text-sm font-black text-black">Notifications</h2>
                  <span className="rounded-full bg-[#fff0f0] px-2 py-1 text-[10px] font-black text-[#f10606]">Latest</span>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {latestNotifications.map((item) => {
                    const isGreen = item.tone === "green";

                    return (
                      <div className="flex gap-3 border-b border-black/10 px-4 py-3 last:border-b-0" key={`${item.title}-${item.time}`}>
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${isGreen ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                          <item.icon size={17} />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black text-black">{item.title}</p>
                          <p className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-black/55">{item.body}</p>
                          <p className="mt-1 text-[10px] font-bold text-black/38">{item.time}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Link
                  className="block border-t border-black/10 px-4 py-3 text-center text-xs font-black text-[#f10606] transition hover:bg-[#fff7f7]"
                  href="/dashboard/notifications"
                  onClick={() => setIsNotificationsOpen(false)}
                >
                  View all notifications
                </Link>
              </div>
            ) : null}
          </div>
          <button className="text-black/72 hover:text-[#f10606]" type="button" aria-label="Messages">
            <MessageSquare size={22} />
          </button>
          <div className="relative">
            <button
              className="flex items-center gap-3"
              type="button"
              aria-expanded={isUserMenuOpen}
              onClick={() => {
                setIsUserMenuOpen((value) => !value);
                setIsNotificationsOpen(false);
              }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe5e5] text-sm font-black text-[#f10606]">{displayInitial}</span>
              <span className="text-sm font-black text-black">{displayName}</span>
              <ChevronDown className={`transition ${isUserMenuOpen ? "rotate-180" : ""}`} size={16} />
            </button>

            {isUserMenuOpen ? (
              <div className="absolute right-0 top-12 w-56 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.12)]">
                <div className="border-b border-black/10 px-4 py-3">
                  <p className="truncate text-sm font-black text-black">{displayName}</p>
                  <p className="mt-1 truncate text-xs font-medium text-black/50">{user?.email ?? planLabel}</p>
                </div>
                <button className="flex h-11 w-full items-center gap-3 px-4 text-left text-sm font-black text-[#f10606] transition hover:bg-[#fff7f7]" type="button" onClick={() => void handleLogout()}>
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  Bell,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Crown,
  FileText,
  HeartPulse,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Star,
  Store,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Market Prices", icon: LineChart },
  { label: "Markets", icon: Store },
  { label: "Watchlist", icon: Star },
  { label: "Price Alerts", icon: Bell },
  { label: "AI Assistant", icon: Bot },
  { label: "Reports & Insights", icon: FileText },
  { label: "Orders", icon: ShoppingCart, badge: "3" },
  { label: "Messages", icon: MessageSquare },
  { label: "Settings", icon: Settings },
];

const summaryCards = [
  {
    title: "Market Pulse",
    subtitle: "Today",
    icon: HeartPulse,
    footer: "View full pulse",
    content: (
      <div className="grid grid-cols-3 gap-3">
        <div>
          <p className="text-lg font-black text-[#0ba64b]">12</p>
          <p className="mt-1 text-xs font-semibold text-black/58">Down</p>
        </div>
        <div>
          <p className="text-lg font-black text-[#f10606]">8</p>
          <p className="mt-1 text-xs font-semibold text-black/58">Up</p>
        </div>
        <div>
          <p className="text-lg font-black text-black/62">5</p>
          <p className="mt-1 text-xs font-semibold text-black/58">Constant</p>
        </div>
      </div>
    ),
  },
  {
    title: "Best Market Today",
    subtitle: "Cheapest prices overall",
    icon: Award,
    footer: "View markets",
    content: (
      <div>
        <p className="text-lg font-black text-black">Mile 12 Market</p>
        <span className="mt-3 inline-flex h-7 items-center rounded-full bg-[#dff8e7] px-3 text-xs font-black text-[#078b39]">
          Top Rated
        </span>
      </div>
    ),
  },
  {
    title: "Highest Increase",
    subtitle: "vs yesterday",
    icon: ArrowUpRight,
    footer: "View details",
    content: (
      <div>
        <p className="text-base text-lg font-bold text-black">Pepper (Basket)</p>
        <p className="mt-3 text-xl font-black text-[#f10606]">+15%</p>
      </div>
    ),
  },
  {
    title: "Biggest Drop",
    subtitle: "vs yesterday",
    icon: ArrowDownRight,
    footer: "View details",
    content: (
      <div>
        <p className="text-base text-lg font-bold text-black">Tomatoes (Basket)</p>
        <p className="mt-3 text-xl font-black text-[#0ba64b]">-8%</p>
      </div>
    ),
  },
];

function SummaryCard({ card }: { card: (typeof summaryCards)[number] }) {
  return (
    <article className="flex min-h-36 flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className="flex-1 p-2">
        <div className="mb-4 flex items-start gap-3">
          <card.icon className="mt-0.5 shrink-0 text-[#f10606]" size={18} strokeWidth={2.3} />
          <div className="min-w-0">
            <h2 className="text-sm font-black text-black">{card.title}</h2>
            <p className="mt-1 text-xs font-medium text-black/56">{card.subtitle}</p>
            <div className="w-full mt-2">
              {card.content}
            </div> 
          </div>
         
          
        </div>
        
      </div>
      <button className="flex h-10 items-center justify-between border-t border-black/10 px-4 text-xs font-bold text-black transition hover:bg-black/[0.02] hover:text-[#f10606]" type="button">
        {card.footer}
        <ChevronRight size={17} />
      </button>
    </article>
  );
}

function Sidebar() {
  return (
    <aside className="hidden h-screen w-[270px] shrink-0 border-r border-black/10 bg-white px-6 py-7 lg:sticky lg:top-0 lg:flex lg:flex-col">
      <Link className="relative block h-12 w-[170px]" href="/" aria-label="Ojaboy home">
        <Image src="/logo/ojaboy-logo.svg" alt="Ojaboy" fill priority className="object-contain object-left" sizes="170px" />
      </Link>

      <nav className="mt-9 flex-1 space-y-2">
        {navItems.map((item) => (
          <button
            className={`flex h-12 w-full items-center gap-4 rounded-lg px-3 text-left text-sm font-black transition ${
              item.active ? "bg-[#fff0f0] text-[#f10606]" : "text-black/82 hover:bg-black/[0.03] hover:text-[#f10606]"
            }`}
            key={item.label}
            type="button"
          >
            <item.icon size={20} strokeWidth={2.2} />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge ? (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#f10606] px-2 text-xs font-black text-white">
                {item.badge}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      <div className="rounded-xl border border-[#ffcaca] bg-[#fff7f7] p-5">
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

function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-black/10 bg-white/92 backdrop-blur-xl">
      <div className="flex h-20 items-center gap-4 px-5 sm:px-8 lg:px-10">
        <button className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white lg:hidden" type="button" aria-label="Open dashboard menu">
          <Menu size={22} />
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
          <button className="relative text-black/72 hover:text-[#f10606]" type="button" aria-label="Notifications">
            <Bell size={22} />
            <span className="absolute -right-1 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f10606] px-1 text-[10px] font-black text-white">2</span>
          </button>
          <button className="text-black/72 hover:text-[#f10606]" type="button" aria-label="Messages">
            <MessageSquare size={22} />
          </button>
          <button className="flex items-center gap-3" type="button">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe5e5] text-sm font-black text-[#f10606]">T</span>
            <span className="text-sm font-black text-black">Temiloluwa</span>
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[#fbfbfb] text-black">
      <div className="flex min-h-screen">
        <Sidebar />
        <section className="min-w-0 flex-1">
          <Topbar />
          <div className="px-5 py-7 sm:px-8 lg:px-10">
            <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-black tracking-normal text-black">Good morning, Temiloluwa!</h1>
                <p className="mt-2 text-sm font-medium text-black/58">Here&apos;s what&apos;s happening in the market today.</p>
              </div>
              <div className="flex items-center gap-2 text-sm font-bold text-black/62">
                <CalendarDays size={18} />
                May 24, 2025
              </div>
            </div>

            <div className="space-y-5">
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <SummaryCard card={card} key={card.title} />
                ))}
              </div>

              <div className="grid gap-5 xl:grid-cols-[1fr_350px]">
                <div className="space-y-5">
                <div className="h-56 rounded-xl border border-[#ffd6d6] bg-[#fff4f4] shadow-[0_14px_35px_rgba(241,6,6,0.05)]" />
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="h-64 rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]" />
                  <div className="h-64 rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]" />
                </div>
              </div>

                <aside className="space-y-5">
                  <div className="h-80 rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]" />
                  <div className="h-64 rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]" />
                </aside>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

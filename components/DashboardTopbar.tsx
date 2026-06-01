import {
  Bell,
  ChevronDown,
  Menu,
  MessageSquare,
  Search,
  Sparkles,
} from "lucide-react";

export function DashboardTopbar() {
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

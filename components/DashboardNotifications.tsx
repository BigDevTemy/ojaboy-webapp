import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Settings,
  TrendingDown,
} from "lucide-react";

const notifications = [
  {
    title: "Tomatoes dropped by 8%",
    body: "Oyingbo Market now has baskets from N18,500. This is below yesterday's average.",
    time: "12 mins ago",
    category: "Price Drop",
    icon: TrendingDown,
    tone: "green",
    unread: true,
  },
  {
    title: "Pepper alert triggered",
    body: "Pepper basket prices rose above your N20,000 target in Daleko Market.",
    time: "38 mins ago",
    category: "Price Alert",
    icon: AlertTriangle,
    tone: "red",
    unread: true,
  },
  {
    title: "Order ORD-24591 updated",
    body: "Your order from Mile 12 Market is now out for delivery.",
    time: "1 hour ago",
    category: "Order",
    icon: PackageCheck,
    tone: "green",
    unread: true,
  },
  {
    title: "Weekly report is ready",
    body: "Your Lagos staples market report has been generated.",
    time: "Yesterday",
    category: "Report",
    icon: CheckCircle2,
    tone: "green",
    unread: false,
  },
  {
    title: "Palm oil target almost reached",
    body: "Palm Oil (25L) is now N42,000, only N2,000 above your target.",
    time: "2 days ago",
    category: "Watchlist",
    icon: Clock3,
    tone: "red",
    unread: false,
  },
];

const filters = ["All", "Unread", "Price Alerts", "Orders", "Reports"];

export function DashboardNotifications() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Notifications</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Review price alerts, order updates, reports, and account messages.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                  filter === "All" ? "bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" : "border border-black/10 bg-white text-black/68 hover:text-[#f10606]"
                }`}
                key={filter}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>
          <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/72 transition hover:text-[#f10606]" type="button">
            <Settings size={16} />
            Notification Settings
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="border-b border-black/10 px-5 py-4">
          <h2 className="text-lg font-black text-black">Latest Activity</h2>
        </div>

        {notifications.map((item) => {
          const isGreen = item.tone === "green";

          return (
            <article className={`flex gap-4 border-b border-black/10 px-5 py-4 last:border-b-0 ${item.unread ? "bg-[#fffafa]" : "bg-white"}`} key={`${item.title}-${item.time}`}>
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${isGreen ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                <item.icon size={21} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className="truncate text-sm font-black text-black">{item.title}</h3>
                    {item.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[#f10606]" /> : null}
                  </div>
                  <span className="w-max rounded-full bg-[#fbfbfb] px-3 py-1 text-[10px] font-black text-black/50">{item.category}</span>
                </div>
                <p className="mt-2 text-sm font-medium leading-6 text-black/58">{item.body}</p>
                <p className="mt-2 text-xs font-bold text-black/38">{item.time}</p>
              </div>
            </article>
          );
        })}
      </section>

      <button className="flex items-center gap-2 text-xs font-black text-black/62 transition hover:text-[#f10606]" type="button">
        <Bell size={15} />
        Mark all as read
      </button>
    </div>
  );
}

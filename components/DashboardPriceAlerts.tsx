import Image from "next/image";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Plus,
  Search,
  Trash2,
} from "lucide-react";

const alerts = [
  {
    product: "Rice (50kg)",
    market: "Mile 12 Market",
    current: "N84,500",
    target: "N82,000",
    status: "Watching",
    image: "/products/rice.png",
  },
  {
    product: "Tomatoes (Basket)",
    market: "Oyingbo Market",
    current: "N18,500",
    target: "N17,500",
    status: "Triggered",
    image: "/products/tomatoes-basket.png",
  },
  {
    product: "Palm Oil (25L)",
    market: "Agege Market",
    current: "N42,000",
    target: "N40,000",
    status: "Watching",
    image: "/products/palm-oil.png",
  },
  {
    product: "Pepper (Basket)",
    market: "Daleko Market",
    current: "N23,000",
    target: "N20,000",
    status: "Watching",
    image: "/products/pepper.png",
  },
];

const stats = [
  { label: "Active Alerts", value: "12" },
  { label: "Triggered Today", value: "3" },
  { label: "Avg. Target Gap", value: "N2,800" },
];

export function DashboardPriceAlerts() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Price Alerts</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Create alerts for target prices and buying opportunities.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={stat.label}>
            <p className="text-xs font-black uppercase text-black/48">{stat.label}</p>
            <p className="mt-2 text-2xl font-black text-black">{stat.value}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Search alert, product, or market..."
            />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <Plus size={17} />
            New Alert
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid min-w-[820px] grid-cols-[1.4fr_1fr_0.75fr_0.75fr_0.7fr_0.5fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Product</span>
          <span>Market</span>
          <span>Current</span>
          <span>Target</span>
          <span>Status</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="overflow-x-auto">
          {alerts.map((alert) => {
            const isTriggered = alert.status === "Triggered";

            return (
              <div
                className="grid min-w-[820px] grid-cols-[1.4fr_1fr_0.75fr_0.75fr_0.7fr_0.5fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
                key={`${alert.product}-${alert.market}`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
                    <Image src={alert.image} alt={alert.product} fill className="object-cover" sizes="44px" />
                  </div>
                  <p className="truncate font-black text-black">{alert.product}</p>
                </div>
                <p className="min-w-0 truncate font-bold text-black/72">{alert.market}</p>
                <p className="font-black text-black">{alert.current}</p>
                <p className="font-bold text-black/64">{alert.target}</p>
                <span className={`inline-flex w-max items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black ${isTriggered ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                  {isTriggered ? <CheckCircle2 size={13} /> : <Bell size={13} />}
                  {alert.status}
                </span>
                <div className="flex justify-end gap-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Edit alert for ${alert.product}`}>
                    <Edit3 size={16} />
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Delete alert for ${alert.product}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

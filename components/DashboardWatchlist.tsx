import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  MoreHorizontal,
  Search,
  ShoppingCart,
  Star,
  Trash2,
} from "lucide-react";

const watchlistItems = [
  {
    name: "Rice (50kg)",
    market: "Mile 12 Market",
    price: "N84,500",
    target: "N82,000",
    change: "-2%",
    trend: "down",
    image: "/products/rice.png",
  },
  {
    name: "Tomatoes (Basket)",
    market: "Oyingbo Market",
    price: "N18,500",
    target: "N17,000",
    change: "-8%",
    trend: "down",
    image: "/products/tomatoes-basket.png",
  },
  {
    name: "Palm Oil (25L)",
    market: "Agege Market",
    price: "N42,000",
    target: "N40,000",
    change: "-1%",
    trend: "down",
    image: "/products/palm-oil.png",
  },
  {
    name: "Pepper (Basket)",
    market: "Daleko Market",
    price: "N23,000",
    target: "N20,000",
    change: "+15%",
    trend: "up",
    image: "/products/pepper.png",
  },
  {
    name: "Beans (Oloyin)",
    market: "Mushin Market",
    price: "N76,000",
    target: "N72,000",
    change: "+3%",
    trend: "up",
    image: "/products/beans.png",
  },
];

const summary = [
  { label: "Saved Items", value: "5" },
  { label: "Price Drops", value: "3" },
  { label: "Alerts Set", value: "4" },
];

export function DashboardWatchlist() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Watchlist</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Monitor saved products, target prices, and buying signals.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {summary.map((item) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={item.label}>
            <p className="text-xs font-black uppercase text-black/48">{item.label}</p>
            <p className="mt-2 text-2xl font-black text-black">{item.value}</p>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Search saved product or market..."
            />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <Star size={17} />
            Add Item
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1.45fr_1fr_0.75fr_0.75fr_0.55fr_0.45fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Product</span>
          <span>Market</span>
          <span>Current</span>
          <span>Target</span>
          <span>Change</span>
          <span className="text-right">Actions</span>
        </div>

        {watchlistItems.map((item) => {
          const isUp = item.trend === "up";

          return (
            <div
              className="grid grid-cols-[1.45fr_1fr_0.75fr_0.75fr_0.55fr_0.45fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
              key={`${item.name}-${item.market}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
                  <Image src={item.image} alt={item.name} fill className="object-cover" sizes="44px" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-black">{item.name}</p>
                  <p className="mt-1 text-xs font-medium text-black/50">Saved today</p>
                </div>
              </div>
              <p className="min-w-0 truncate font-bold text-black/72">{item.market}</p>
              <p className="font-black text-black">{item.price}</p>
              <p className="font-bold text-black/64">{item.target}</p>
              <p className={`flex items-center gap-1 font-black ${isUp ? "text-[#f10606]" : "text-[#0ba64b]"}`}>
                {item.change}
                {isUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              </p>
              <div className="flex justify-end gap-2">
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Set alert for ${item.name}`}>
                  <Bell size={16} />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Order ${item.name}`}>
                  <ShoppingCart size={16} />
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`More actions for ${item.name}`}>
                  <MoreHorizontal size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <button className="flex items-center gap-2 text-xs font-black text-black/62 transition hover:text-[#f10606]" type="button">
        <Trash2 size={15} />
        Manage removed items
      </button>
    </div>
  );
}

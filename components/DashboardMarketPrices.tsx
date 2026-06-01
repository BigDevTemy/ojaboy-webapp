import Image from "next/image";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
} from "lucide-react";

const marketRows = [
  {
    item: "Rice",
    unit: "50kg",
    market: "Mile 12 Market",
    location: "Lagos",
    price: "N84,500",
    change: "-2%",
    trend: "down",
    image: "/products/rice.png",
  },
  {
    item: "Tomatoes",
    unit: "Basket",
    market: "Oyingbo Market",
    location: "Lagos",
    price: "N18,500",
    change: "-8%",
    trend: "down",
    image: "/products/tomatoes-basket.png",
  },
  {
    item: "Pepper",
    unit: "Basket",
    market: "Daleko Market",
    location: "Lagos",
    price: "N23,000",
    change: "+15%",
    trend: "up",
    image: "/products/pepper.png",
  },
  {
    item: "Beans",
    unit: "Oloyin",
    market: "Mushin Market",
    location: "Lagos",
    price: "N76,000",
    change: "+3%",
    trend: "up",
    image: "/products/beans.png",
  },
  {
    item: "Palm Oil",
    unit: "25L",
    market: "Agege Market",
    location: "Lagos",
    price: "N42,000",
    change: "-1%",
    trend: "down",
    image: "/products/palm-oil.png",
  },
];

const filters = ["All Items", "Grains", "Vegetables", "Oil", "High Movement"];

export function DashboardMarketPrices() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Market Prices</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Track live commodity prices across Lagos markets.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Search product, market, or location..."
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                className={`h-10 rounded-lg px-4 text-xs font-black transition ${
                  filter === "All Items" ? "bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" : "border border-black/10 bg-white text-black/68 hover:text-[#f10606]"
                }`}
                key={filter}
                type="button"
              >
                {filter}
              </button>
            ))}
          </div>

          <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/72 transition hover:text-[#f10606]" type="button">
            <Filter size={16} />
            Filter
          </button>
          <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/72 transition hover:text-[#f10606]" type="button">
            <Download size={16} />
            Export
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1.4fr_0.8fr_1.15fr_0.75fr_0.65fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Product</span>
          <span>Unit</span>
          <span>Market</span>
          <span>Price</span>
          <span className="flex items-center gap-1">
            Change
            <SlidersHorizontal size={14} />
          </span>
        </div>

        {marketRows.map((row) => {
          const isUp = row.trend === "up";

          return (
            <div
              className="grid grid-cols-[1.4fr_0.8fr_1.15fr_0.75fr_0.65fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
              key={`${row.item}-${row.market}`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
                  <Image src={row.image} alt={row.item} fill className="object-cover" sizes="44px" />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-black">{row.item}</p>
                  <p className="mt-1 text-xs font-medium text-black/50">{row.location}</p>
                </div>
              </div>
              <p className="font-bold text-black/64">{row.unit}</p>
              <p className="min-w-0 truncate font-bold text-black/72">{row.market}</p>
              <p className="font-black text-black">{row.price}</p>
              <p className={`flex items-center gap-1 font-black ${isUp ? "text-[#f10606]" : "text-[#0ba64b]"}`}>
                {row.change}
                {isUp ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}

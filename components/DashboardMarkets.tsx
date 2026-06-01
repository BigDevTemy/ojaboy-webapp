import {
  ArrowRight,
  CalendarDays,
  Clock,
  MapPin,
  Navigation,
  Search,
  Star,
  Store,
  TrendingDown,
} from "lucide-react";

const markets = [
  {
    name: "Mile 12 Market",
    area: "Kosofe, Lagos",
    status: "Open",
    rating: "4.8",
    bestFor: "Rice, beans, grains",
    distance: "8.2km",
    cheapest: "Rice (50kg)",
    price: "N84,500",
    savings: "Best price today",
  },
  {
    name: "Daleko Market",
    area: "Mushin, Lagos",
    status: "Open",
    rating: "4.6",
    bestFor: "Pepper, tomatoes, oil",
    distance: "12.4km",
    cheapest: "Pepper (Basket)",
    price: "N23,000",
    savings: "+15% movement",
  },
  {
    name: "Oyingbo Market",
    area: "Ebute Metta, Lagos",
    status: "Busy",
    rating: "4.5",
    bestFor: "Tomatoes, onions",
    distance: "6.7km",
    cheapest: "Tomatoes (Basket)",
    price: "N18,500",
    savings: "-8% today",
  },
  {
    name: "Agege Market",
    area: "Agege, Lagos",
    status: "Open",
    rating: "4.4",
    bestFor: "Palm oil, staples",
    distance: "15.1km",
    cheapest: "Palm Oil (25L)",
    price: "N42,000",
    savings: "-1% today",
  },
];

const marketStats = [
  { label: "Tracked Markets", value: "24" },
  { label: "Open Now", value: "18" },
  { label: "Avg. Savings", value: "N4,500" },
];

export function DashboardMarkets() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Markets</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Compare market locations, best prices, and buying windows.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {marketStats.map((stat) => (
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
              placeholder="Search market, product, or area..."
            />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <Navigation size={17} />
            Find Nearby
          </button>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        {markets.map((market) => (
          <article className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={market.name}>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                <Store size={23} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-black">{market.name}</h2>
                    <p className="mt-1 flex items-center gap-1 text-xs font-bold text-black/54">
                      <MapPin size={14} />
                      {market.area}
                    </p>
                  </div>
                  <span className="rounded-full bg-[#eaf8ef] px-3 py-1 text-[10px] font-black text-[#078b39]">{market.status}</span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-black/42">Best For</p>
                    <p className="mt-1 text-xs font-black text-black">{market.bestFor}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-black/42">Distance</p>
                    <p className="mt-1 text-xs font-black text-black">{market.distance}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-black/42">Rating</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-black text-black">
                      <Star size={13} className="fill-[#ffb000] text-[#ffb000]" />
                      {market.rating}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg bg-[#fbfbfb] p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-black/54">{market.cheapest}</p>
                      <p className="mt-1 text-base font-black text-black">{market.price}</p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center gap-1 text-xs font-black text-[#0ba64b]">
                        <TrendingDown size={14} />
                        {market.savings}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-black/45">
                        <Clock size={12} />
                        Updated today
                      </p>
                    </div>
                  </div>
                </div>

                <button className="mt-4 flex items-center gap-2 text-xs font-black text-black transition hover:text-[#f10606]" type="button">
                  View market details
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

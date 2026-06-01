import Image from "next/image";
import { DashboardPriceTrendsPanel } from "@/components/DashboardPriceTrendsChart";
import {
  ArrowDownRight,
  ArrowUpRight,
  Award,
  CalendarDays,
  ChevronRight,
  HeartPulse,
  Send,
} from "lucide-react";

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

const aiPrompts = [
  "Rice price in Lagos?",
  "Cheapest beans market?",
  "Buy tomatoes now or wait?",
  "Fast moving products?",
];

const watchlistItems = [
  {
    name: "Rice (50kg)",
    price: "N84,500",
    change: "-2%",
    direction: "down",
    image: "/products/rice.png",
  },
  {
    name: "Tomatoes (Basket)",
    price: "N18,500",
    change: "-8%",
    direction: "down",
    image: "/products/tomatoes-basket.png",
  },
  {
    name: "Palm Oil (25L)",
    price: "N42,000",
    change: "-1%",
    direction: "down",
    image: "/products/palm-oil.png",
  },
  {
    name: "Pepper (Basket)",
    price: "N23,000",
    change: "+15%",
    direction: "up",
    image: "/products/pepper.png",
  },
];

const marketComparisonItems = [
  { market: "Mile 12 Market", price: "N84,500", change: "Best Price", best: true },
  { market: "Daleko Market", price: "N85,000", change: "+0.6%" },
  { market: "Oyingbo Market", price: "N86,000", change: "+1.8%" },
  { market: "Agege Market", price: "N86,500", change: "+2.4%" },
];

const marketNewsItems = [
  {
    title: "Tomato supply increases in Lagos markets",
    time: "2 hours ago",
    image: "/products/tomatoes-basket.png",
  },
  {
    title: "Heavy rains affecting pepper prices",
    time: "Yesterday",
    image: "/products/pepper.png",
  },
  {
    title: "Onion scarcity expected next week",
    time: "2 days ago",
    image: "/products/beans-sack.png",
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

function MarketComparisonPanel() {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-black text-black">Market Comparison</h2>
          <p className="mt-1 text-xs font-black text-black/82">Rice (50kg)</p>
        </div>
        <span className="rounded-full bg-[#dff8e7] px-3 py-1 text-[10px] font-black text-[#078b39]">Best Price</span>
      </div>

      <div className="space-y-1">
        {marketComparisonItems.map((item) => (
          <div
            className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg px-3 py-2 text-xs ${
              item.best ? "bg-[#eaf8ef]" : ""
            }`}
            key={item.market}
          >
            <p className="min-w-0 truncate font-bold text-black">{item.market}</p>
            <p className="font-black text-black">{item.price}</p>
            <p className={`w-12 text-right font-black ${item.best ? "text-[#078b39]" : "text-[#f10606]"}`}>
              {item.best ? "" : item.change}
            </p>
          </div>
        ))}
      </div>

      <button className="mt-3 flex items-center gap-2 text-xs font-bold text-black transition hover:text-[#f10606]" type="button">
        View more markets
        <ChevronRight size={16} />
      </button>
    </section>
  );
}

function MarketNewsPanel() {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-black text-black">Market News</h2>
        <button className="text-xs font-black text-[#f10606] transition hover:text-black" type="button">
          View all
        </button>
      </div>

      <div className="space-y-4">
        {marketNewsItems.map((item) => (
          <article className="flex items-center gap-3" key={item.title}>
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
              <Image src={item.image} alt="" fill className="object-cover" sizes="44px" />
            </div>
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-sm font-black leading-5 text-black">{item.title}</h3>
              <p className="mt-1 text-xs font-medium text-black/50">{item.time}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AskAiPanel() {
  return (
    <section className="relative isolate min-h-56 overflow-hidden rounded-xl border border-[#ffd6d6] bg-[#fff4f4] p-5 shadow-[0_14px_35px_rgba(241,6,6,0.05)]">
      <div className="absolute inset-y-0 right-0 -z-10 w-1/2 bg-[radial-gradient(circle_at_55%_45%,rgba(241,6,6,0.16),transparent_34%),linear-gradient(90deg,rgba(255,244,244,0),rgba(255,255,255,0.62))]" />

      <div className="grid gap-5 md:grid-cols-[1fr_290px] md:items-center">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <h2 className="text-base font-black text-black">Ask Ojaboy AI</h2>
            <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#f10606] shadow-sm">AI</span>
          </div>
          <p className="text-xs font-medium text-black/62">Get real-time answers about prices, trends and markets.</p>

          <div className="mt-4 flex flex-wrap gap-3">
            {aiPrompts.map((prompt) => (
              <button
                className="text-xss inline-flex h-9 min-w-max items-center whitespace-nowrap rounded-lg border border-black/10 bg-white px-3 text-left font-bold text-black/76 shadow-sm transition hover:border-[#f10606]/30 hover:text-[#f10606]"
                key={prompt}
                type="button"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="relative hidden h-44 overflow-hidden rounded-xl md:block" aria-hidden="true">
          <Image
            src="/dashboard/ojaboy-ai-assistant.png"
            alt=""
            fill
            className="object-cover object-[66%_50%]"
            sizes="290px"
          />
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#fff4f4] to-transparent" />
        </div>
      </div>

      <div className="relative mt-4">
        <input
          className="h-12 w-full rounded-lg border border-black/10 bg-white px-4 pr-14 text-xs font-medium text-black outline-none shadow-sm placeholder:text-black/38"
          placeholder="Type your market question here..."
        />
        <button
          className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.24)]"
          type="button"
          aria-label="Send AI question"
        >
          <Send size={17} />
        </button>
      </div>
    </section>
  );
}

function WatchlistPanel() {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-base font-black text-black">My Watchlist</h2>
        <button className="text-xs font-black text-[#f10606] transition hover:text-black" type="button">
          View all
        </button>
      </div>

      <div className="divide-y divide-black/10">
        {watchlistItems.map((item) => {
          const isUp = item.direction === "up";

          return (
            <div className="flex items-center gap-3 py-3 first:pt-0 last:pb-0" key={item.name}>
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
                <Image src={item.image} alt={item.name} fill className="object-cover" sizes="44px" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-black">{item.name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-black">{item.price}</p>
                <p className={`mt-1 flex items-center justify-end gap-1 text-xs font-black ${isUp ? "text-[#f10606]" : "text-[#0ba64b]"}`}>
                  {item.change}
                  {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  return (
    <>
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

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
                <div className="space-y-5">
                <AskAiPanel />
                <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(260px,0.85fr)]">
                  <DashboardPriceTrendsPanel />
                  <MarketComparisonPanel />
                </div>
              </div>

                <aside className="space-y-5">
                  <WatchlistPanel />
                  <MarketNewsPanel />
                </aside>
              </div>
            </div>
    </>
  );
}

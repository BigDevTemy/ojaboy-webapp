import Image from "next/image";
import AgentChatWidget from "@/components/AgentChatWidget";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import MarketPriceCarousel from "@/components/MarketPriceCarousel";
import {
  Bell,
  ChartLine,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  MapPin,
  MessageSquare,
  Play,
  Scale,
  Send,
  ShoppingBag,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { FaApple, FaWhatsapp } from "react-icons/fa";
import { FaGooglePlay } from "react-icons/fa6";

const popularQuestions = [
  "Rice price today",
  "Cheapest tomatoes",
  "Best market for beans",
  "Is pepper increasing?",
];

const marketRows = [
  { market: "Mile 12 Market", price: "N84,500", trend: "2%", direction: "down" },
  { market: "Oyingbo Market", price: "N86,000", trend: "1%", direction: "up" },
  { market: "Daleko Market", price: "N85,000", trend: "1%", direction: "down" },
];

const tickerItems = [
  { name: "Rice", change: "2%", direction: "down" },
  { name: "Tomatoes", change: "8%", direction: "up" },
  { name: "Pepper", change: "15%", direction: "up" },
  { name: "Beans", change: "3%", direction: "up" },
  { name: "Palm Oil", change: "1%", direction: "down" },
  { name: "Garri", change: "2%", direction: "down" },
  { name: "Onions", change: "4%", direction: "up" },
];

const productPrices = [
  { name: "Rice", unit: "50kg", price: "N85,000", change: "2%", direction: "down", initials: "RI", tone: "from-[#fff8ef] to-[#ffffff]", accent: "#d9a65a", imageSrc: "/products/rice.jpeg" },
  { name: "Tomatoes", unit: "Basket", price: "N24,000", change: "8%", direction: "up", initials: "TO", tone: "from-[#fff1f1] to-[#ffffff]", accent: "#f10606", imageSrc: "/products/tomatoes.jpeg" },
  { name: "Pepper", unit: "Basket", price: "N18,000", change: "15%", direction: "up", initials: "PE", tone: "from-[#fff0ed] to-[#ffffff]", accent: "#e21c13", imageSrc: "/products/pepper.png" },
  { name: "Beans", unit: "Oloyin", price: "N76,000", change: "3%", direction: "up", initials: "BE", tone: "from-[#fff6ef] to-[#ffffff]", accent: "#9b4b28", imageSrc: "/products/beans.png" },
  { name: "Palm Oil", unit: "25L", price: "N58,000", change: "1%", direction: "down", initials: "PO", tone: "from-[#fff4e6] to-[#ffffff]", accent: "#f28a16", imageSrc: "/products/palm-oil.png" },
  { name: "Garri", unit: "50kg", price: "N40,000", change: "2%", direction: "down", initials: "GA", tone: "from-[#fff9ee] to-[#ffffff]", accent: "#d7aa61", imageSrc: "/products/garri.png" },
];

const marketCoverage = ["Mile 12 Market", "Oyingbo Market", "Daleko Market", "Mushin Market", "Agege Market"];

const stats = [
  { value: "15,000+", label: "Price Records" },
  { value: "500+", label: "Daily Updates" },
  { value: "20+", label: "Market Agents" },
  { value: "5/5", label: "Customer Rating" },
];

const howItWorksSteps = [
  { title: "Ask Ojaboy", description: "Ask any question about market prices or items.", icon: MessageSquare, tone: "bg-[#fff1f1] text-[#f10606]" },
  { title: "Compare Prices", description: "We compare prices across different markets.", icon: Scale, tone: "bg-[#eef4ff] text-[#2d6cdf]" },
  { title: "Place Your Order", description: "Add items to cart and place your order.", icon: ShoppingCart, tone: "bg-[#fff1f1] text-[#f10606]" },
  { title: "We Shop For You", description: "Our agents shop and get the best items.", icon: ShoppingBag, tone: "bg-[#fff5ea] text-[#f28a16]" },
  { title: "We Deliver", description: "We deliver to your door fast and safely.", icon: Truck, tone: "bg-[#fff1f1] text-[#f10606]" },
];

const intelligenceFeatures = [
  { title: "Price Trends", description: "Track price changes over time", icon: ChartLine, tone: "bg-[#0d7f36]" },
  { title: "Best Markets", description: "Find the cheapest markets", icon: MapPin, tone: "bg-[#7a35b8]" },
  { title: "Price Forecast", description: "Predict prices for the coming days", icon: CircleHelp, tone: "bg-[#9b4b13]" },
  { title: "Daily Reports", description: "Get daily market summary on WhatsApp", icon: FileText, tone: "bg-[#255a9f]" },
];

const whatsappReport = [
  { name: "Rice", change: "2%", direction: "down" },
  { name: "Tomatoes", change: "8%", direction: "up" },
  { name: "Pepper", change: "15%", direction: "up" },
  { name: "Beans", change: "3%", direction: "up" },
];

const appBenefits = ["Market intelligence in your pocket", "Track trends in real time", "Shop smarter, anytime, anywhere"];

function AskOjaboYCard() {
  return (
    <aside className="relative mx-auto w-full max-w-[400px] rounded-2xl border border-black/10 bg-white/90 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.15)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe2e2] text-sm font-black text-[#f10606]">AI</div>
          <p className="text-sm font-black text-black">Ask Ojaboy AI</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-black/55">
          <span className="h-2 w-2 rounded-full bg-[#21b455]" />
          Online
        </div>
      </div>

      <div className="mb-4 flex justify-end">
        <div className="max-w-[255px] rounded-xl bg-[#f10606] px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-500/20">
          What is the price of rice in Lagos today?
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-[#f7f7f7]">
        <p className="border-b border-black/5 px-4 py-2.5 text-xs text-black/75">
          Here are the current prices for <span className="font-bold text-[#f10606]">Rice (50kg)</span> in Lagos:
        </p>
        {marketRows.map((row) => (
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b border-black/5 px-4 py-2 text-xs last:border-b-0" key={row.market}>
            <span className="font-medium text-black/80">{row.market}</span>
            <span className="font-black text-black">{row.price}</span>
            <span className={`font-bold ${row.direction === "down" ? "text-[#08a847]" : "text-[#f10606]"}`}>
              {row.direction === "down" ? "-" : "+"} {row.trend}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-[#e6fbef] px-4 py-2.5">
        <div className="flex items-start gap-3">
          <span className="text-[#08a847]">*</span>
          <div className="flex-1">
            <p className="text-xs font-black text-black">Recommendation</p>
            <div className="mt-1.5 flex items-center justify-between gap-3 text-xs font-medium text-black/75">
              <span>Best price today at <b>Mile 12 Market</b></span>
              <b className="text-xs text-black">N84,500</b>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-black/10 pt-3">
        <div className="flex gap-3">
          <input
            className="h-10 min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 text-xs outline-none placeholder:text-black/40"
            placeholder="Ask any market question..."
            aria-label="Ask any market question"
          />
          <button className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-lg shadow-red-500/20" aria-label="Send question">
            <Send size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-[#fbfaf8] pt-24 lg:h-[calc(100vh-52px)] lg:min-h-[560px]">
      <Image
        src="/hero/market-bg.png"
        alt="Nigerian market with fresh tomatoes and peppers"
        fill
        priority
        className="object-cover object-center"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,#ffffff_0%,rgba(255,255,255,0.94)_26%,rgba(255,255,255,0.66)_55%,rgba(255,255,255,0.16)_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.86)_0%,rgba(255,255,255,0.34)_46%,rgba(255,255,255,0.05)_100%)]" />

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-5 pb-7 pt-8 sm:px-8 lg:h-full lg:grid-cols-[1fr_0.92fr] lg:px-10 lg:pb-6 lg:pt-4">
        <div className="max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[#dff8e7] px-4 py-2 text-sm font-bold text-[#078b39]">
            <span className="flex gap-1">
              <span className="h-4 w-1.5 rounded-full bg-[#0eaf48]" />
              <span className="h-4 w-1.5 rounded-full bg-[#0eaf48]" />
            </span>
            Nigeria&apos;s AI Market Intelligence Platform
          </div>

          <h1 className="max-w-[600px] text-4xl font-extrabold leading-[1.08] tracking-normal text-black sm:text-5xl lg:text-6xl">
            Know Market Prices <span className="text-[#f10606]">Before</span> You Buy.
          </h1>
          <p className="mt-5 max-w-xl text-lg font-medium leading-8 text-black/62 sm:text-xl">
            Ask Ojaboy anything about market prices, compare markets and shop smarter. We shop, you relax.
          </p>

          <div className="mt-7 flex flex-col gap-4 sm:flex-row">
            <a className="inline-flex h-14 items-center justify-center gap-3 rounded-lg bg-[#f10606] px-9 text-base font-black text-white shadow-[0_20px_40px_rgba(241,6,6,0.24)]" href="#">
              <MessageSquare size={16} />
              Ask Ojaboy
            </a>
            <a className="inline-flex h-14 items-center justify-center gap-3 rounded-lg border border-[#f10606]/25 bg-white/72 px-8 text-base font-black text-black backdrop-blur transition hover:border-[#f10606]" href="#">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[#f10606] text-[#f10606]">
                <Play size={14} fill="currentColor" />
              </span>
              Watch How It Works
            </a>
          </div>

          <div className="mt-7">
            <p className="mb-3 text-sm font-black text-black">Popular Questions</p>
            <div className="flex flex-wrap gap-3">
              {popularQuestions.map((question) => (
                <button className="rounded-full bg-[#fff0f0]/85 px-4 py-2 text-xs font-bold text-black/65 ring-1 ring-[#f10606]/8" key={question}>
                  <CircleHelp className="mr-2 inline-block text-[#f10606]" size={12} />
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>

        <AskOjaboYCard />
      </div>
    </section>
  );
}

function MarketTicker() {
  const scrollingItems = [...tickerItems, ...tickerItems];

  return (
    <section className="bg-[#050505] text-white" aria-label="Live market updates">
      <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr] items-center gap-6 px-5 py-4 sm:px-8 lg:px-10">
        <div className="relative z-10 flex shrink-0 items-center gap-3 bg-[#050505] pr-2 text-sm font-black">
          <span className="h-2 w-2 rounded-full bg-[#f10606]" />
          Live Market Updates
        </div>
        <div className="relative min-w-0 overflow-hidden">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#050505] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#050505] to-transparent" />
          <div className="ticker-track flex w-max items-center gap-8">
            {scrollingItems.map((item, index) => (
              <div className="flex shrink-0 items-center gap-3 text-sm font-black" key={`${item.name}-${index}`}>
                <span>{item.name}</span>
                <span className={item.direction === "down" ? "text-[#23c45e]" : "text-[#ff2f2f]"}>
                  {item.direction === "down" ? "-" : "+"} {item.change}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function TrendBadge({ direction, change }: { direction: string; change: string }) {
  const isDown = direction === "down";

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-black ${isDown ? "text-[#08a847]" : "text-[#f10606]"}`}>
      {isDown ? "-" : "+"} {change}
    </span>
  );
}

function MarketOverview() {
  return (
    <section className="bg-white px-5 py-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-2xl font-black tracking-normal text-black sm:text-3xl">Today&apos;s Market Overview</h2>
          <a className="inline-flex shrink-0 items-center gap-1 text-sm font-black text-[#f10606] hover:text-black" href="#">
            View All Prices
            <ChevronRight size={16} />
          </a>
        </div>

        <MarketPriceCarousel items={productPrices} />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="bg-[#fffafa] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
          <h2 className="mb-8 text-center text-2xl font-black tracking-normal text-black sm:text-3xl">How Ojaboy Works</h2>
        <div className="grid gap-5 md:grid-cols-5">
          {howItWorksSteps.map((step, index) => (
            <article className="relative text-center" key={step.title}>
              {index < howItWorksSteps.length - 1 ? (
                <ChevronRight className="absolute left-[calc(50%+54px)] top-10 hidden text-black/35 md:block" size={24} />
              ) : null}
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full text-sm font-black ${step.tone}`}>
                <step.icon size={28} strokeWidth={2.2} />
              </div>
              <p className="text-sm font-black text-black">
                {index + 1}. {step.title}
              </p>
              <p className="mx-auto mt-2 max-w-[170px] text-xs font-medium leading-5 text-black/62">{step.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function MarketIntelligenceSection() {
  return (
    <section className="bg-white px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-xl bg-[#07090b] text-white shadow-[0_22px_60px_rgba(0,0,0,0.16)] lg:grid-cols-[1fr_1.55fr]">
        <div className="p-8 sm:p-10">
          <p className="mb-3 text-sm font-black text-[#ff2f2f]">AI Market Intelligence</p>
          <h2 className="max-w-sm text-3xl font-black leading-tight tracking-normal sm:text-4xl">Get Smarter With Market Data</h2>
          <p className="mt-5 max-w-md text-sm font-medium leading-7 text-white/76">
            Our AI analyzes thousands of price data points daily to help you make the best buying decisions.
          </p>
          <a className="mt-7 inline-flex h-12 items-center justify-center rounded-lg bg-[#f10606] px-7 text-sm font-black text-white shadow-[0_18px_35px_rgba(241,6,6,0.28)]" href="#">
            Explore Market Intelligence
          </a>
        </div>

        <div className="grid gap-4 bg-[radial-gradient(circle_at_82%_42%,rgba(241,6,6,0.45),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.08),rgba(255,255,255,0))] p-8 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
          {intelligenceFeatures.map((feature) => (
            <article className="rounded-lg border border-white/10 bg-white/[0.04] p-4 backdrop-blur" key={feature.title}>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-lg text-xs font-black text-white ${feature.tone}`}>
                <feature.icon size={21} strokeWidth={2.2} />
              </div>
              <p className="text-sm font-black text-white">{feature.title}</p>
              <p className="mt-2 text-xs font-medium leading-5 text-white/65">{feature.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhatsappReportsCTA() {
  return (
    <section className="bg-white px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 overflow-hidden rounded-xl border border-[#bff0d0] bg-[#ecfff3] p-5 shadow-[0_16px_45px_rgba(15,166,74,0.08)] lg:flex-row lg:items-center lg:justify-between lg:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#20b45b] text-white shadow-[0_14px_30px_rgba(32,180,91,0.24)]">
            <FaWhatsapp className="text-3xl" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black tracking-normal text-black sm:text-xl">Get Daily Market Reports On WhatsApp</h2>
            <p className="mt-1 max-w-xl text-sm font-medium leading-6 text-black/62">
              Daily price updates, trends and best deals every morning.
            </p>
            <a className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-[#0fa64a] px-7 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,166,74,0.22)]" href="#">
              Join WhatsApp List
            </a>
          </div>
        </div>

        <div className="lg:pr-2">
          <aside className="w-full rounded-lg border border-black/10 bg-white px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.06)] sm:w-[250px]">
            <p className="mb-2 flex items-center gap-2 text-xs font-black text-black">
              <span className="h-2 w-2 rounded-full bg-[#0fa64a]" />
              Today&apos;s Report
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {whatsappReport.map((item) => (
                <div className="flex items-center justify-between gap-2 text-xs font-bold" key={item.name}>
                  <span className="text-black/65">{item.name}</span>
                  <TrendBadge direction={item.direction} change={item.change} />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function AppPromoSection() {
  return (
    <section className="bg-white px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl items-center gap-8 overflow-hidden rounded-2xl border border-[#ffcaca] bg-[radial-gradient(circle_at_86%_50%,rgba(241,6,6,0.28),transparent_28%),linear-gradient(135deg,#fff4f7_0%,#ffe7ec_48%,#ffd6dc_100%)] p-6 shadow-[0_18px_60px_rgba(241,6,6,0.12)] sm:p-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-black leading-tight tracking-normal text-black sm:text-4xl">
            Ojaboy App
            <span className="block">Coming Soon!</span>
          </h2>
          <ul className="mt-6 space-y-3">
            {appBenefits.map((benefit) => (
              <li className="flex items-center gap-3 text-sm font-bold text-black/72" key={benefit}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#f10606] shadow-sm">
                  <Check size={13} strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <div className="mt-8 grid max-w-sm grid-cols-2 gap-3">
            <a className="flex h-14 items-center gap-3 rounded-xl bg-white px-4 shadow-[0_12px_25px_rgba(0,0,0,0.10)]" href="#">
              <FaApple className="text-2xl text-black" />
              <span>
                <span className="block text-[10px] font-bold text-black/55">Coming Soon On</span>
                <span className="block text-sm font-black text-black">App Store</span>
              </span>
            </a>
            <a className="flex h-14 items-center gap-3 rounded-xl bg-white px-4 shadow-[0_12px_25px_rgba(0,0,0,0.10)]" href="#">
              <FaGooglePlay className="text-2xl text-[#0fa64a]" />
              <span>
                <span className="block text-[10px] font-bold text-black/55">Coming Soon On</span>
                <span className="block text-sm font-black text-black">Google Play</span>
              </span>
            </a>
          </div>

          <a className="mt-7 inline-flex h-12 min-w-[280px] items-center justify-center rounded-full bg-[#f10606] px-8 text-sm font-black text-white shadow-[0_18px_35px_rgba(241,6,6,0.28)]" href="#">
            <Bell className="mr-2" size={16} />
            Notify Me When We Launch
          </a>
        </div>

        <div className="relative min-h-[340px] overflow-hidden lg:min-h-[420px]">
          <Image
            src="/app/ojaboy-app-coming-soon.png"
            alt="Ojaboy app coming soon preview on two phones"
            fill
            className="object-contain object-center lg:object-right"
            sizes="(max-width: 1024px) 100vw, 640px"
          />
        </div>
      </div>
    </section>
  );
}

function MarketCoverage() {
  return (
    <section className="bg-white px-5 pb-8 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-4 text-base font-black text-black">Our Market Coverage</h2>
        <div className="flex flex-wrap gap-3">
          {marketCoverage.map((market) => (
            <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black/70 shadow-sm" key={market}>
              <span className="h-2 w-2 rounded-full bg-[#f10606]" />
              {market}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="bg-white px-5 pb-10 sm:px-8 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <article className="rounded-xl border border-black/10 bg-[#fffafa] px-6 py-5 shadow-[0_16px_35px_rgba(0,0,0,0.04)]" key={stat.label}>
            <p className="text-2xl font-black text-black">{stat.value}</p>
            <p className="mt-1 text-sm font-semibold text-black/55">{stat.label}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Header />
      <HeroSection />
      <MarketTicker />
      <MarketOverview />
      <HowItWorks />
      <MarketIntelligenceSection />
      <WhatsappReportsCTA />
      <AppPromoSection />
      <MarketCoverage />
      <StatsSection />
      <Footer />
      <AgentChatWidget />
    </main>
  );
}

import Image from "next/image";
import {
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Send,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";

const prompts = [
  "Find the cheapest rice today",
  "Should I buy tomatoes now?",
  "Compare Mile 12 and Daleko",
  "What changed since yesterday?",
];

const messages = [
  {
    role: "assistant",
    text: "Tomatoes dropped 8% today across Oyingbo and Mile 12. If your target is below N18,000, wait a little longer.",
  },
  {
    role: "user",
    text: "What should I buy for a N50,000 basket?",
  },
  {
    role: "assistant",
    text: "Prioritize rice, beans, palm oil, and pepper from Mile 12. Current estimated savings: N4,500.",
  },
];

const insightCards = [
  { label: "Best Buy", value: "Rice", icon: ShoppingBasket },
  { label: "High Movement", value: "Pepper +15%", icon: ChartNoAxesCombined },
  { label: "Budget Tip", value: "Save N4,500", icon: CircleDollarSign },
];

export function DashboardAiAssistant() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">AI Assistant</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Ask Ojaboy for market recommendations, trends, and buying decisions.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-xl border border-[#ffd6d6] bg-[#fff4f4] shadow-[0_14px_35px_rgba(241,6,6,0.05)]">
          <div className="grid gap-4 p-5 md:grid-cols-[1fr_240px] md:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <h2 className="text-lg font-black text-black">Ask Ojaboy AI</h2>
                <span className="rounded-full bg-white px-2 py-1 text-xs font-black text-[#f10606] shadow-sm">AI</span>
              </div>
              <p className="text-sm font-medium text-black/62">Get direct answers from market data, alerts, and shopping trends.</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {prompts.map((prompt) => (
                  <button className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black text-black/72 shadow-sm transition hover:text-[#f10606]" key={prompt} type="button">
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative hidden h-40 overflow-hidden rounded-xl md:block">
              <Image src="/dashboard/ojaboy-ai-assistant.png" alt="" fill className="object-cover object-[66%_50%]" sizes="240px" />
              <div className="absolute inset-y-0 left-0 w-14 bg-gradient-to-r from-[#fff4f4] to-transparent" />
            </div>
          </div>

          <div className="border-t border-[#ffd6d6] bg-white p-5">
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";

                return (
                  <div className={`flex ${isUser ? "justify-end" : "justify-start"}`} key={`${message.role}-${index}`}>
                    <div className={`max-w-[78%] rounded-xl px-4 py-3 text-sm font-medium leading-6 ${isUser ? "bg-[#f10606] text-white" : "bg-[#fbfbfb] text-black/72"}`}>
                      {message.text}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-5">
              <input
                className="h-12 w-full rounded-lg border border-black/10 bg-white px-4 pr-14 text-sm font-medium text-black outline-none shadow-sm placeholder:text-black/38"
                placeholder="Ask a market question..."
              />
              <button className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.24)]" type="button" aria-label="Send AI question">
                <Send size={17} />
              </button>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
              <Bot size={23} />
            </div>
            <h2 className="text-base font-black text-black">Today&apos;s Intelligence</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">Ojaboy is watching 24 markets and 5 products in your saved basket.</p>
          </section>

          {insightCards.map((card) => (
            <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={card.label}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#fff0f0] text-[#f10606]">
                  <card.icon size={20} />
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-black/42">{card.label}</p>
                  <p className="mt-1 text-base font-black text-black">{card.value}</p>
                </div>
              </div>
            </section>
          ))}

          <button className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <Sparkles size={17} />
            Generate Smart Basket
          </button>
        </aside>
      </div>
    </div>
  );
}

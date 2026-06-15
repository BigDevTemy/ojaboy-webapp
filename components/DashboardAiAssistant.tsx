"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bot,
  CalendarDays,
  ChartNoAxesCombined,
  CircleDollarSign,
  Send,
  ShoppingBasket,
  Sparkles,
} from "lucide-react";
import { AgentMessageContent } from "@/components/AgentMessageContent";
import { askAgent } from "@/lib/agentChat";

const prompts = [
  "Find the cheapest rice today",
  "Should I buy tomatoes now?",
  "Compare Mile 12 and Daleko",
  "What changed since yesterday?",
];

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

const initialMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Ask me about market prices, comparisons, trends, orders, or shopping decisions.",
  },
];

const insightCards = [
  { label: "Best Buy", value: "Rice", icon: ShoppingBasket },
  { label: "High Movement", value: "Pepper +15%", icon: ChartNoAxesCombined },
  { label: "Budget Tip", value: "Save N4,500", icon: CircleDollarSign },
];

export function DashboardAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, messages]);

  async function sendQuestion(value: string) {
    const trimmedQuestion = value.trim();

    if (!trimmedQuestion || isLoading) {
      return;
    }

    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text: trimmedQuestion },
    ]);
    setQuestion("");
    setError("");
    setIsLoading(true);

    try {
      const response = await askAgent(trimmedQuestion);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: response.answer },
      ]);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The agent is unavailable. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(question);
  }

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
                  <button
                    className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black text-black/72 shadow-sm transition hover:text-[#f10606] disabled:cursor-not-allowed disabled:opacity-60"
                    key={prompt}
                    type="button"
                    onClick={() => void sendQuestion(prompt)}
                    disabled={isLoading}
                  >
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
            <div className="max-h-[430px] space-y-4 overflow-y-auto">
              {messages.map((message) => {
                const isUser = message.role === "user";

                return isUser ? (
                  <div className="flex justify-end" key={message.id}>
                    <div className="max-w-[78%] break-words rounded-xl rounded-tr-sm bg-[#f10606] px-4 py-3 text-sm font-bold leading-6 text-white">
                      {message.text}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3" key={message.id}>
                    <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffe2e2] text-[#f10606]">
                      <Bot size={16} />
                    </span>
                    <div className="min-w-0 max-w-[82%] rounded-xl rounded-tl-sm bg-[#fbfbfb] px-4 py-3 text-sm font-medium leading-6 text-black/72">
                      <AgentMessageContent answer={message.text} />
                    </div>
                  </div>
                );
              })}
              {isLoading ? (
                <div className="flex items-center gap-2 text-sm font-bold text-black/45">
                  <Bot size={16} className="text-[#f10606]" />
                  Ojaboy is thinking...
                </div>
              ) : null}
              {error ? (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
                  {error}
                </p>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form className="relative mt-5" onSubmit={handleSubmit}>
              <input
                className="h-12 w-full rounded-lg border border-black/10 bg-white px-4 pr-14 text-sm font-medium text-black outline-none shadow-sm placeholder:text-black/38"
                placeholder="Ask a market question..."
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                disabled={isLoading}
              />
              <button
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.24)] disabled:cursor-not-allowed disabled:opacity-60"
                type="submit"
                aria-label="Send AI question"
                disabled={isLoading || !question.trim()}
              >
                <Send size={17} />
              </button>
            </form>
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

"use client";

import { useState } from "react";
import { Bot, Headphones, MessageSquare, Send, X } from "lucide-react";

const starterMessages = [
  "Hi, I am an Ojaboy agent. I can help with market prices, orders, or shopping support.",
  "What would you like to check today?",
];

export default function AgentChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col items-end gap-4">
      {isOpen ? (
        <section className="w-[min(calc(100vw-2.5rem),380px)] overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_26px_80px_rgba(0,0,0,0.22)]">
          <header className="flex items-center justify-between bg-[#f10606] px-5 py-4 text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/18">
                <Headphones size={21} />
              </span>
              <div>
                <p className="text-sm font-black">Ojaboy Agent</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-white/80">
                  <span className="h-2 w-2 rounded-full bg-[#36e06f]" />
                  Online now
                </p>
              </div>
            </div>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/12 transition hover:bg-white/22"
              type="button"
              aria-label="Close agent chat"
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </button>
          </header>

          <div className="max-h-[330px] space-y-3 overflow-y-auto bg-[#fffafa] px-5 py-4">
            {starterMessages.map((message) => (
              <div className="flex items-start gap-2" key={message}>
                <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffe2e2] text-[#f10606]">
                  <Bot size={15} />
                </span>
                <p className="rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-sm">
                  {message}
                </p>
              </div>
            ))}

            <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-md bg-[#f10606] px-4 py-3 text-sm font-bold leading-6 text-white">
              I need help comparing food prices.
            </div>
          </div>

          <form className="flex items-center gap-3 border-t border-black/10 bg-white p-4">
            <input
              className="h-11 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#fafafa] px-4 text-sm outline-none placeholder:text-black/40"
              placeholder="Type your message..."
              aria-label="Type your message"
            />
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.22)]"
              type="submit"
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className="group relative flex h-16 w-16 items-center justify-center rounded-full bg-[#f10606] text-white shadow-[0_20px_45px_rgba(241,6,6,0.35)] transition hover:-translate-y-0.5 hover:bg-[#d90505]"
        type="button"
        aria-label={isOpen ? "Close agent chat" : "Open agent chat"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#36c96d]" />
        <MessageSquare size={28} />
        <span className="pointer-events-none absolute right-[74px] hidden whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs font-bold text-white shadow-lg group-hover:block">
          Chat with an agent
        </span>
      </button>
    </div>
  );
}

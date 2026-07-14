"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Headphones, MessageSquare, Send, X } from "lucide-react";
import { AgentMessageContent } from "@/components/AgentMessageContent";
import { askAgent } from "@/lib/agentChat";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  text: string;
};

type QueuedMessage = {
  id: string;
  text: string;
};

const MAX_QUEUE_SIZE = 5;

const starterMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hi, I am an Ojaboy agent. I can help with market prices, orders, or shopping support.",
  },
  {
    id: "prompt",
    role: "assistant",
    text: "What would you like to check today?",
  },
];

export default function AgentChatWidget({
  variant = "default",
}: {
  variant?: "default" | "customer-mobile";
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [question, setQuestion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const queueRef = useRef<QueuedMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isLoading, messages]);

  function updateQueue(next: QueuedMessage[]) {
    queueRef.current = next;
    setQueue(next);
  }

  function enqueue(text: string) {
    updateQueue([...queueRef.current, { id: crypto.randomUUID(), text }]);
  }

  function removeFromQueue(id: string) {
    updateQueue(queueRef.current.filter((item) => item.id !== id));
  }

  function loadFromQueue(id: string) {
    const item = queueRef.current.find((queued) => queued.id === id);
    if (!item) {
      return;
    }
    setQuestion(item.text);
    removeFromQueue(id);
  }

  async function sendToEndpoint(text: string) {
    setMessages((current) => [
      ...current,
      { id: crypto.randomUUID(), role: "user", text },
    ]);
    setError("");
    setIsLoading(true);

    try {
      const response = await askAgent(text);
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", text: response.answer },
      ]);
      setIsLoading(false);

      const [next, ...rest] = queueRef.current;
      if (next) {
        updateQueue(rest);
        void sendToEndpoint(next.text);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The agent is unavailable. Please try again.",
      );
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion) {
      return;
    }

    if (isLoading) {
      if (queueRef.current.length >= MAX_QUEUE_SIZE) {
        setError(`Queue is full (${MAX_QUEUE_SIZE} messages). Remove one to add more.`);
        return;
      }
      enqueue(trimmedQuestion);
      setQuestion("");
      return;
    }

    setQuestion("");
    await sendToEndpoint(trimmedQuestion);
  }

  const isQueueFull = queue.length >= MAX_QUEUE_SIZE;

  return (
    <div
      className={`fixed z-[70] flex flex-col items-end gap-3 ${
        variant === "customer-mobile"
          ? "customer-mobile-agent"
          : "bottom-5 right-5"
      }`}
    >
      {isOpen ? (
        <section
          className={`overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_26px_80px_rgba(0,0,0,0.22)] ${
            variant === "customer-mobile"
              ? "w-[min(calc(100vw-2rem),380px)]"
              : "w-[min(calc(100vw-2.5rem),380px)]"
          }`}
        >
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
            {messages.map((message) =>
              message.role === "assistant" ? (
                <div className="flex items-start gap-2" key={message.id}>
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ffe2e2] text-[#f10606]">
                    <Bot size={15} />
                  </span>
                  <div className="min-w-0 rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-sm">
                    <AgentMessageContent answer={message.text} />
                  </div>
                </div>
              ) : (
                <div
                  className="ml-auto max-w-[78%] rounded-2xl rounded-tr-md bg-[#f10606] px-4 py-3 text-sm font-bold leading-6 text-white"
                  key={message.id}
                >
                  {message.text}
                </div>
              ),
            )}
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs font-bold text-black/45">
                <Bot size={15} className="text-[#f10606]" />
                Ojaboy is thinking...
              </div>
            ) : null}
            {error ? <p className="text-xs font-bold text-[#f10606]">{error}</p> : null}
            <div ref={messagesEndRef} />
          </div>

          {queue.length > 0 ? (
            <div className="max-h-28 overflow-y-auto border-t border-black/10 bg-[#fafafa]">
              {queue.map((item) => (
                <div
                  className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-2 last:border-b-0"
                  key={item.id}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left text-xs font-semibold text-black/60 hover:text-black/80"
                    onClick={() => loadFromQueue(item.id)}
                  >
                    {item.text}
                  </button>
                  <button
                    type="button"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-black/35 hover:bg-black/5 hover:text-red-600"
                    aria-label="Remove queued message"
                    onClick={() => removeFromQueue(item.id)}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <form
            className="flex items-center gap-3 border-t border-black/10 bg-white p-4"
            onSubmit={handleSubmit}
          >
            <input
              className="h-11 min-w-0 flex-1 rounded-lg border border-black/10 bg-[#fafafa] px-4 text-sm outline-none placeholder:text-black/40"
              placeholder="Type your message..."
              aria-label="Type your message"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
            />
            <button
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
              type="submit"
              aria-label="Send message"
              disabled={!question.trim() || (isLoading && isQueueFull)}
            >
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : null}

      <button
        className={`group relative flex items-center justify-center rounded-full border-4 border-white bg-[#f10606] text-white shadow-[0_20px_45px_rgba(241,6,6,0.42)] transition hover:-translate-y-0.5 hover:bg-[#d90505] ${
          variant === "customer-mobile" ? "h-14 w-14" : "h-16 w-16"
        }`}
        type="button"
        aria-label={isOpen ? "Close agent chat" : "Open agent chat"}
        onClick={() => setIsOpen((value) => !value)}
      >
        <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full border-2 border-white bg-[#36c96d]" />
        <MessageSquare size={variant === "customer-mobile" ? 24 : 28} />
        <span className="pointer-events-none absolute right-[74px] hidden whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs font-bold text-white shadow-lg group-hover:block">
          Chat with an agent
        </span>
      </button>
    </div>
  );
}

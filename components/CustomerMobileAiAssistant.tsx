"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Headphones, Send, X } from "lucide-react";
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

export function CustomerMobileAiAssistant() {
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
    <section className="flex h-[calc(100dvh-9.75rem)] min-h-[28rem] flex-col bg-[#fffafa]">
      <div className="flex items-center gap-3 border-b border-black/[0.06] bg-white px-4 py-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffe2e2] text-[#f10606]">
          <Headphones size={20} />
        </span>
        <div>
          <p className="text-sm font-black text-black">Ojaboy Agent</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs font-semibold text-black/48">
            <span className="h-2 w-2 rounded-full bg-[#36c96d]" />
            Online now
          </p>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5">
        {messages.map((message) =>
          message.role === "assistant" ? (
            <div className="flex items-start gap-2.5" key={message.id}>
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ffe2e2] text-[#f10606]">
                <Bot size={16} />
              </span>
              <div className="min-w-0 max-w-[84%] rounded-2xl rounded-tl-md bg-white px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-sm">
                <AgentMessageContent answer={message.text} />
              </div>
            </div>
          ) : (
            <div
              className="ml-auto max-w-[82%] break-words rounded-2xl rounded-tr-md bg-[#f10606] px-4 py-3 text-sm font-bold leading-6 text-white"
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

        {error ? (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
            {error}
          </p>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      {queue.length > 0 ? (
        <div className="max-h-32 shrink-0 overflow-y-auto border-t border-black/[0.08] bg-[#fafafa]">
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
        className="flex items-center gap-3 border-t border-black/[0.08] bg-white p-4"
        onSubmit={handleSubmit}
      >
        <input
          className="h-12 min-w-0 flex-1 rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none placeholder:text-black/40 focus:border-[#f10606]/40"
          placeholder="Type your message..."
          aria-label="Type your message"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
        />
        <button
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
          type="submit"
          aria-label="Send message"
          disabled={!question.trim() || (isLoading && isQueueFull)}
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  );
}

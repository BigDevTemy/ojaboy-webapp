import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Headphones,
  HelpCircle,
  MessageSquare,
  Phone,
  Search,
  Send,
  ShieldCheck,
} from "lucide-react";

const tickets = [
  {
    id: "SUP-1042",
    subject: "Missing palm oil in last order",
    category: "Order issue",
    status: "Open",
    updated: "12 mins ago",
  },
  {
    id: "SUP-1038",
    subject: "Refund confirmation for ORD-24561",
    category: "Refund",
    status: "Resolved",
    updated: "Yesterday",
  },
  {
    id: "SUP-1031",
    subject: "Vendor price did not match checkout",
    category: "Price dispute",
    status: "In review",
    updated: "2 days ago",
  },
];

const faqs = [
  "How do I report a missing item?",
  "When do refunds arrive?",
  "Can I change delivery address?",
  "How are market prices verified?",
];

const supportStats = [
  { label: "Open Tickets", value: "2", icon: MessageSquare },
  { label: "Avg. Response", value: "8m", icon: Clock3 },
  { label: "Resolved", value: "24", icon: CheckCircle2 },
];

export function DashboardSupport() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Support</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Get help with orders, refunds, delivery, vendors, and account questions.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {supportStats.map((stat) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={stat.label}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-black/48">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-black">{stat.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                <stat.icon size={22} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
              <Headphones size={23} />
            </div>
            <div>
              <h2 className="text-lg font-black text-black">Contact Support</h2>
              <p className="mt-1 text-sm font-medium text-black/58">Start a conversation with the Ojaboy support team.</p>
            </div>
          </div>

          <div className="space-y-4 rounded-xl bg-[#fbfbfb] p-4">
            <div className="max-w-[78%] rounded-xl bg-white px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-sm">
              Hi Temiloluwa, how can we help with your market order today?
            </div>
            <div className="ml-auto max-w-[78%] rounded-xl bg-[#f10606] px-4 py-3 text-sm font-medium leading-6 text-white">
              I want to report an issue with my last delivery.
            </div>
            <div className="max-w-[78%] rounded-xl bg-white px-4 py-3 text-sm font-medium leading-6 text-black/72 shadow-sm">
              Sure. Share the order ID and the affected item, and we will review it.
            </div>
          </div>

          <div className="relative mt-5">
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white px-4 pr-14 text-sm font-medium text-black outline-none shadow-sm placeholder:text-black/38"
              placeholder="Type your support message..."
            />
            <button className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg bg-[#f10606] text-white shadow-[0_12px_24px_rgba(241,6,6,0.24)]" type="button" aria-label="Send support message">
              <Send size={17} />
            </button>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-[#ffd6d6] bg-[#fff7f7] p-5 shadow-[0_14px_35px_rgba(241,6,6,0.04)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#f10606]">
              <Phone size={22} />
            </div>
            <h2 className="text-base font-black text-black">Urgent Help</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">For active delivery or payment issues, request priority support.</p>
            <button className="mt-4 h-11 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.18)]" type="button">
              Request Callback
            </button>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <h2 className="text-base font-black text-black">Quick Help</h2>
            <div className="mt-4 space-y-3">
              {faqs.map((faq) => (
                <button className="flex w-full items-center gap-3 rounded-lg border border-black/10 p-3 text-left text-xs font-black text-black/72 transition hover:text-[#f10606]" key={faq} type="button">
                  <HelpCircle size={16} />
                  {faq}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">Support Tickets</h2>
            <p className="mt-1 text-sm font-medium text-black/55">Track your support conversations and case updates.</p>
          </div>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={17} />
            <input
              className="h-11 rounded-lg border border-black/10 bg-white pl-10 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38 sm:w-72"
              placeholder="Search tickets..."
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          {tickets.map((ticket) => (
            <div className="grid gap-3 border-t border-black/10 px-5 py-4 text-sm first:border-t-0 md:grid-cols-[0.7fr_1.4fr_0.8fr_0.7fr_0.7fr]" key={ticket.id}>
              <p className="font-black text-black">{ticket.id}</p>
              <p className="font-bold text-black/72">{ticket.subject}</p>
              <p className="font-bold text-black/54">{ticket.category}</p>
              <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${ticket.status === "Resolved" ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                {ticket.status}
              </span>
              <p className="font-bold text-black/45">{ticket.updated}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-bold text-black/50">
          <ShieldCheck size={15} />
          Support conversations are private and linked to your account.
        </div>
      </section>
    </div>
  );
}

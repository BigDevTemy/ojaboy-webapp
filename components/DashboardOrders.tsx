import Image from "next/image";
import { DashboardCreateOrderModal } from "@/components/DashboardCreateOrderModal";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Download,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Search,
  Star,
  Truck,
} from "lucide-react";

const activeOrder = {
  id: "ORD-24591",
  market: "Mile 12 Market",
  vendor: "Adebayo Foods",
  status: "Out for delivery",
  eta: "35 mins",
  total: "N50,000",
  paidWith: "Bank Transfer",
  address: "18 Admiralty Way, Lekki Phase 1",
  items: [
    { name: "Rice 10kg", qty: "1 bag", price: "N16,900", image: "/products/rice.png" },
    { name: "Beans", qty: "2 derica", price: "N7,800", image: "/products/beans.png" },
    { name: "Palm Oil", qty: "5L", price: "N12,500", image: "/products/palm-oil.png" },
    { name: "Pepper", qty: "1 basket", price: "N12,800", image: "/products/pepper.png" },
  ],
};

const orderSteps = [
  { label: "Order placed", time: "9:12 AM", complete: true },
  { label: "Vendor confirmed", time: "9:20 AM", complete: true },
  { label: "Packed at market", time: "10:05 AM", complete: true },
  { label: "Out for delivery", time: "10:38 AM", complete: true },
  { label: "Delivered", time: "ETA 11:15 AM", complete: false },
];

const orderHistory = [
  {
    id: "ORD-24580",
    market: "Oyingbo Market",
    date: "May 23, 2025",
    total: "N28,500",
    status: "Delivered",
    items: "Tomatoes, onions, pepper",
    rating: "5.0",
  },
  {
    id: "ORD-24574",
    market: "Daleko Market",
    date: "May 21, 2025",
    total: "N43,200",
    status: "Delivered",
    items: "Rice, beans, garri",
    rating: "4.8",
  },
  {
    id: "ORD-24561",
    market: "Agege Market",
    date: "May 18, 2025",
    total: "N19,700",
    status: "Refunded",
    items: "Palm oil, pepper",
    rating: "Pending",
  },
  {
    id: "ORD-24552",
    market: "Mushin Market",
    date: "May 15, 2025",
    total: "N31,400",
    status: "Delivered",
    items: "Beans, tomatoes, onions",
    rating: "4.6",
  },
];

const feedbackItems = [
  {
    label: "Vendor quality",
    score: "4.8",
    note: "Fresh items and accurate quantities",
  },
  {
    label: "Delivery speed",
    score: "4.5",
    note: "Average delivery time is 47 mins",
  },
  {
    label: "Price accuracy",
    score: "4.7",
    note: "Prices match checkout estimates",
  },
];

const stats = [
  { label: "Active Orders", value: "3", icon: Truck },
  { label: "Completed", value: "28", icon: PackageCheck },
  { label: "Total Spend", value: "N412,800", icon: CreditCard },
  { label: "Avg. Rating", value: "4.8", icon: Star },
];

export function DashboardOrders() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Orders</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Track current orders, review history, and manage feedback.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-bold text-black/62">
            <CalendarDays size={18} />
            May 24, 2025
          </div>
          <DashboardCreateOrderModal />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-black">Current Order</h2>
                <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-[10px] font-black text-[#f10606]">{activeOrder.status}</span>
              </div>
              <p className="mt-1 text-sm font-medium text-black/55">
                {activeOrder.id} from {activeOrder.market}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs font-black uppercase text-black/42">ETA</p>
              <p className="mt-1 text-xl font-black text-[#f10606]">{activeOrder.eta}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-3">
              {activeOrder.items.map((item) => (
                <div className="flex items-center gap-3 rounded-xl border border-black/10 p-3" key={item.name}>
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#fff0f0]">
                    <Image src={item.image} alt={item.name} fill className="object-cover" sizes="48px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-black">{item.name}</p>
                    <p className="mt-1 text-xs font-medium text-black/50">{item.qty}</p>
                  </div>
                  <p className="text-sm font-black text-black">{item.price}</p>
                </div>
              ))}
            </div>

            <aside className="rounded-xl bg-[#fbfbfb] p-4">
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-black/55">Vendor</span>
                  <span className="text-right font-black text-black">{activeOrder.vendor}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-black/55">Payment</span>
                  <span className="text-right font-black text-black">{activeOrder.paidWith}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="font-medium text-black/55">Total</span>
                  <span className="text-right font-black text-black">{activeOrder.total}</span>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
                <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-black/42">
                  <MapPin size={14} />
                  Delivery Address
                </p>
                <p className="text-sm font-bold leading-6 text-black/72">{activeOrder.address}</p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[#f10606] text-xs font-black text-white" type="button">
                  <MessageSquare size={15} />
                  Chat
                </button>
                <button className="flex h-10 items-center justify-center gap-2 rounded-lg border border-black/10 text-xs font-black text-black/72" type="button">
                  <ReceiptText size={15} />
                  Receipt
                </button>
              </div>
            </aside>
          </div>

          <div className="mt-6">
            <h3 className="mb-4 text-sm font-black text-black">Order State</h3>
            <div className="grid gap-3 md:grid-cols-5">
              {orderSteps.map((step) => (
                <div className="relative rounded-xl border border-black/10 bg-white p-3" key={step.label}>
                  <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${step.complete ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                    {step.complete ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                  </div>
                  <p className="text-xs font-black text-black">{step.label}</p>
                  <p className="mt-1 text-[10px] font-bold text-black/45">{step.time}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <h2 className="text-base font-black text-black">Feedback Snapshot</h2>
            <div className="mt-4 space-y-4">
              {feedbackItems.map((item) => (
                <div className="rounded-xl border border-black/10 p-4" key={item.label}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-black">{item.label}</p>
                    <p className="flex items-center gap-1 text-sm font-black text-[#f10606]">
                      <Star size={15} className="fill-[#f10606]" />
                      {item.score}
                    </p>
                  </div>
                  <p className="mt-2 text-xs font-medium leading-5 text-black/55">{item.note}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#ffd6d6] bg-[#fff7f7] p-5 shadow-[0_14px_35px_rgba(241,6,6,0.04)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#f10606]">
              <PackageOpen size={22} />
            </div>
            <h2 className="text-base font-black text-black">Need help?</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">Open a dispute, report missing items, or send delivery feedback.</p>
            <button className="mt-4 h-11 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.18)]" type="button">
              Contact Support
            </button>
          </section>
        </aside>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">Order History</h2>
            <p className="mt-1 text-sm font-medium text-black/55">Review previous purchases, receipts, and ratings.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={17} />
              <input
                className="h-11 rounded-lg border border-black/10 bg-white pl-10 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38 sm:w-72"
                placeholder="Search order history..."
              />
            </div>
            <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/72 transition hover:text-[#f10606]" type="button">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="grid min-w-[860px] grid-cols-[0.7fr_1fr_0.85fr_0.8fr_0.75fr_0.7fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
            <span>Order ID</span>
            <span>Market</span>
            <span>Date</span>
            <span>Total</span>
            <span>Status</span>
            <span>Rating</span>
            <span className="text-right">Action</span>
          </div>
          <div className="overflow-x-auto">
            {orderHistory.map((order) => (
              <div className="grid min-w-[860px] grid-cols-[0.7fr_1fr_0.85fr_0.8fr_0.75fr_0.7fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm" key={order.id}>
                <p className="font-black text-black">{order.id}</p>
                <div className="min-w-0">
                  <p className="truncate font-black text-black">{order.market}</p>
                  <p className="mt-1 truncate text-xs font-medium text-black/50">{order.items}</p>
                </div>
                <p className="font-bold text-black/64">{order.date}</p>
                <p className="font-black text-black">{order.total}</p>
                <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${order.status === "Delivered" ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                  {order.status}
                </span>
                <p className="flex items-center gap-1 font-black text-black/72">
                  <Star size={14} className={order.rating === "Pending" ? "text-black/30" : "fill-[#ffb000] text-[#ffb000]"} />
                  {order.rating}
                </p>
                <button className="ml-auto rounded-lg border border-black/10 px-3 py-2 text-xs font-black text-black/62 transition hover:text-[#f10606]" type="button">
                  Details
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

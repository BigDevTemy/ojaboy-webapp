"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  ChevronRight,
  Clock3,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShoppingBasket,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { DashboardCreateOrderModal } from "@/components/DashboardCreateOrderModal";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  API_BASE_URL,
  CURRENT_ORDER_URL,
  NOTIFICATIONS_URL,
  ORDER_HISTORY_URL,
} from "@/Serverurls";

type MobileOrderItem = {
  id: string;
  name: string;
};

type MobileOrder = {
  id: string;
  status: string;
  total: number;
  createdAt?: string;
  items: MobileOrderItem[];
};

const currentOrderEndpoint = `${API_BASE_URL}${CURRENT_ORDER_URL}`;
const orderHistoryEndpoint = `${API_BASE_URL}${ORDER_HISTORY_URL}`;
const unreadNotificationsEndpoint = `${API_BASE_URL}${NOTIFICATIONS_URL}/unread-count`;

const quickCategories = [
  { label: "Grains", image: "/products/grains.png", tone: "bg-emerald-50" },
  { label: "Tubers", image: "/products/tubers.png", tone: "bg-red-50" },
  { label: "Legumes", image: "/products/legumes.png", tone: "bg-amber-50" },
  { label: "Vegetables", image: "/products/vegetables.png", tone: "bg-orange-50" },
  { label: "Meat", image: "/products/meat.png", tone: "bg-yellow-50" },
  { label: "Frozen Foods", image: "/products/frozen-foods.png", tone: "bg-yellow-50" },
  { label: "Oil", image: "/products/palm-oil.png", tone: "bg-yellow-50" },
  { label: "Beverages", image: "/products/beverages.png", tone: "bg-yellow-50" },
] as const;

const marketWatchData = [
  {
    name: "Tomatoes",
    price: "N18,500",
    note: "Cheaper today",
    direction: "down",
  },
  {
    name: "Rice",
    price: "N84,500",
    note: "Cheaper today",
    direction: "down",
  },
  {
    name: "Pepper",
    price: "N23,000",
    note: "Price increasing",
    direction: "up",
  },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function parseOrder(value: unknown): MobileOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const status = readText(value, ["status"]);

  if (!id || !status) {
    return null;
  }

  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index): MobileOrderItem[] => {
        if (!isRecord(item)) {
          return [];
        }

        const product = isRecord(item.product) ? item.product : null;
        const name =
          (product
            ? readText(product, ["name", "title", "productName"])
            : "") || "Order item";

        return [{
          id: readText(item, ["id"]) || `${id}-${index}`,
          name,
        }];
      })
    : [];

  return {
    id,
    status,
    total: Number(readText(value, ["total"])) || 0,
    createdAt: readText(value, ["createdAt"]) || undefined,
    items,
  };
}

function extractOrders(body: unknown) {
  const responseValue = isRecord(body)
    ? body.data ?? body.orders ?? body.results ?? body
    : body;
  const dataValue = isRecord(responseValue) && Array.isArray(responseValue.orders)
    ? responseValue.orders
    : responseValue;
  const values = Array.isArray(dataValue) ? dataValue : [dataValue];

  return values
    .map(parseOrder)
    .filter((order): order is MobileOrder => order !== null);
}

function sortRecentOrders(orders: MobileOrder[]) {
  return [...orders].sort((firstOrder, secondOrder) => {
    const firstTime = firstOrder.createdAt
      ? new Date(firstOrder.createdAt).getTime()
      : 0;
    const secondTime = secondOrder.createdAt
      ? new Date(secondOrder.createdAt).getTime()
      : 0;

    return secondTime - firstTime;
  });
}

async function fetchRecentOrders() {
  const url = new URL(orderHistoryEndpoint);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "3");

  const response = await authenticatedFetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (response.status === 204 || response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Unable to load your recent orders (${response.status}).`);
  }

  return sortRecentOrders(extractOrders((await response.json()) as unknown)).slice(0, 3);
}

async function fetchCurrentOrders() {
  const response = await authenticatedFetch(currentOrderEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 204 || response.status === 404) {
    return [];
  }

  if (!response.ok) {
    return [];
  }

  return extractOrders((await response.json()) as unknown);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatStatus(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getFirstName(fullName?: string) {
  return fullName?.trim().split(/\s+/)[0] || "there";
}

function formatOrderDate(value?: string) {
  if (!value) {
    return "Recently created";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Recently created"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
      }).format(date);
}

export function CustomerMobileHome() {
  const session = useAuthSession();
  const [recentOrders, setRecentOrders] = useState<MobileOrder[]>([]);
  const [isOrderLoading, setIsOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState("");
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [marketWatch, setMarketWatch] = useState(marketWatchData);
  const loadRecentOrder = useCallback(async () => {
    setIsOrderLoading(true);
    setOrderError("");

    try {
      const [historyOrders, currentOrders] = await Promise.all([
        fetchRecentOrders(),
        fetchCurrentOrders(),
      ]);
      const uniqueOrders = new Map<string, MobileOrder>();

      [...currentOrders, ...historyOrders].forEach((order) => {
        uniqueOrders.set(order.id, order);
      });

      setRecentOrders(sortRecentOrders([...uniqueOrders.values()]).slice(0, 3));
    } catch (error) {
      setOrderError(
        error instanceof Error ? error.message : "Unable to load your recent orders.",
      );
    } finally {
      setIsOrderLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void Promise.all([fetchRecentOrders(), fetchCurrentOrders()])
      .then(([historyOrders, currentOrders]) => {
        if (!isCancelled) {
          const uniqueOrders = new Map<string, MobileOrder>();

          [...currentOrders, ...historyOrders].forEach((order) => {
            uniqueOrders.set(order.id, order);
          });

          setRecentOrders(sortRecentOrders([...uniqueOrders.values()]).slice(0, 3));
        }
      })
      .catch((error: unknown) => {
        if (!isCancelled) {
          setOrderError(
            error instanceof Error
              ? error.message
              : "Unable to load your recent orders.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsOrderLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void authenticatedFetch(unreadNotificationsEndpoint, {
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          return null;
        }

        return (await response.json()) as unknown;
      })
      .then((body) => {
        if (isCancelled || !body || typeof body !== "object") {
          return;
        }

        const value = Number(
          (body as { count?: unknown; unreadCount?: unknown; data?: unknown }).count ??
            (body as { count?: unknown; unreadCount?: unknown; data?: unknown }).unreadCount ??
            (body as { count?: unknown; unreadCount?: unknown; data?: unknown }).data,
        );

        setUnreadNotificationCount(Number.isFinite(value) ? value : 0);
      })
      .catch(() => {
        if (!isCancelled) {
          setUnreadNotificationCount(0);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const defaultAddress =
    session?.user.defaultAddress?.formattedAddress || "Your default delivery address";
  const defaultAddressZoneName = session?.user.defaultAddress?.deliveryZone?.name;

  return (
    <div className="space-y-6 pb-4">
      <section className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-black/45">
            <MapPin className="text-[#f10606]" size={13} />
            Delivery to
          </p>
          <p className="mt-1 line-clamp-1 text-xs font-black text-black">
            {defaultAddress}
          </p>
          {defaultAddressZoneName ? (
            <p className="mt-0.5 line-clamp-1 text-[10px] font-bold text-black/45">
              {defaultAddressZoneName} delivery zone
            </p>
          ) : null}
        </div>
        <Link
          aria-label="Notifications"
          className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black shadow-sm"
          href="/dashboard/notifications"
        >
          <Bell size={18} />
          {unreadNotificationCount > 0 ? (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#f10606] px-1 text-[9px] font-black leading-none text-white">
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </span>
          ) : null}
        </Link>
      </section>

      <section className="-mt-3">
        <p className="text-xs font-bold text-black/48">Good morning,</p>
        <h2 className="mt-1 text-2xl font-black tracking-tight text-black">
          {getFirstName(session?.user.fullName)}
          <span className="ml-1 text-[#f10606]">.</span>
        </h2>
      </section>

      <section className="relative isolate overflow-hidden rounded-[1.4rem] bg-[#f10606] p-5 text-white shadow-[0_18px_38px_rgba(241,6,6,0.25)] sm:p-6 lg:p-7">
        <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-white/10" />
        <div className="absolute right-0 top-0 h-full w-[48%] bg-[radial-gradient(circle_at_70%_45%,rgba(255,255,255,0.22),transparent_55%)]" />
        <div className="relative z-10 max-w-[68%] sm:max-w-[28rem]">
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
            <ShoppingBasket size={19} />
          </div>
          <h3 className="text-lg font-black leading-tight">Need market items?</h3>
          <p className="mt-2 text-xs font-medium leading-5 text-white/80">
            Tell us what you need and we will handle the rest.
          </p>
          <div className="mt-4">
            <DashboardCreateOrderModal
              onOrderCreated={loadRecentOrder}
              triggerVariant="mobile-hero"
            />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-[44%] max-w-64 overflow-hidden sm:w-[36%] lg:w-[32%]">
          <Image
            alt="Ojaboy market shopper using the app"
            className="object-cover object-center"
            fill
            sizes="(min-width: 1024px) 256px, (min-width: 640px) 36vw, 44vw"
            src="/auth/signup-market-shopper.png"
          />
          <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#f10606] to-transparent" />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-black">Categories</h3>
          <Link className="text-[11px] font-black text-[#f10606]" href="/dashboard/market-prices">
            {/* See all */}
          </Link>
        </div>
        <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-5 sm:gap-4 sm:overflow-visible lg:gap-5">
          {quickCategories.map((category) => (
            <Link
              className="w-24 shrink-0 text-center sm:w-full"
              href="/dashboard"
              key={category.label}
            >
              <span className={`relative mx-auto flex h-20 w-20 overflow-hidden rounded-2xl sm:h-24 sm:w-24 lg:h-28 lg:w-28 ${category.tone}`}>
                <Image
                  alt=""
                  className="object-contain p-3"
                  fill
                  sizes="(min-width: 1024px) 112px, (min-width: 640px) 96px, 80px"
                  src={category.image}
                />
              </span>
              <span className="mt-2 block truncate text-xs font-bold text-black/65">
                {category.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-black">Market Watch</h3>
            <p className="mt-0.5 text-[10px] font-medium text-black/42">
              Today&apos;s highlighted prices
            </p>
          </div>
          <Link className="text-[11px] font-black text-[#f10606]" href="/dashboard/market-prices">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          {marketWatch.map((item) => {
            const isUp = item.direction === "up";
            return (
              <article
                className={`rounded-2xl border p-3 ${
                  isUp
                    ? "border-red-100 bg-red-50"
                    : "border-emerald-100 bg-emerald-50"
                }`}
                key={item.name}
              >
                <p className="text-[10px] font-black text-black/55">{item.name}</p>
                <p className={`mt-1 text-sm font-black ${isUp ? "text-[#f10606]" : "text-emerald-700"}`}>
                  {item.price}
                </p>
                <p className={`mt-2 flex items-center gap-1 text-[9px] font-bold ${isUp ? "text-[#f10606]" : "text-emerald-700"}`}>
                  {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {item.note}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-black">Recent Order</h3>
          <Link className="text-[11px] font-black text-[#f10606]" href="/dashboard/orders">
            View orders
          </Link>
        </div>

        {isOrderLoading ? (
          <div className="animate-pulse rounded-2xl border border-black/10 bg-white p-4">
            <div className="h-3 w-24 rounded bg-black/10" />
            <div className="mt-3 h-5 w-40 rounded bg-black/10" />
            <div className="mt-4 h-9 rounded-xl bg-black/5" />
          </div>
        ) : orderError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-bold leading-5 text-red-700">{orderError}</p>
            <button
              className="mt-3 flex h-9 items-center gap-2 rounded-lg bg-red-700 px-3 text-[11px] font-black text-white"
              type="button"
              onClick={() => void loadRecentOrder()}
            >
              <RefreshCw size={13} />
              Try again
            </button>
          </div>
        ) : recentOrders.length ? (
          <div className="space-y-3">
            {recentOrders.map((order) => {
              const productNames = order.items.map((item) => item.name);

              return (
                <Link
                  className="block rounded-2xl border border-black/10 bg-white p-4 shadow-[0_12px_28px_rgba(0,0,0,0.05)]"
                  href="/dashboard/orders"
                  key={order.id}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase text-black/40">
                        Order #{order.id.slice(0, 8)}
                      </p>
                      <p className="mt-1 truncate text-sm font-black text-black">
                        {productNames.length ? productNames.join(", ") : "Market order"}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-[10px] font-bold text-black/42">
                        <Clock3 size={12} />
                        {formatOrderDate(order.createdAt)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-black">
                      {formatMoney(order.total)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                    <span className="flex items-center gap-2 text-[10px] font-black text-emerald-700">
                      <PackageCheck size={14} />
                      {formatStatus(order.status)}
                    </span>
                    <ChevronRight className="text-emerald-700" size={15} />
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-center">
            <Sparkles className="mx-auto text-[#f10606]" size={22} />
            <p className="mt-3 text-sm font-black text-black">No active orders yet</p>
            <p className="mt-1 text-xs font-medium text-black/48">
              Your latest order will appear here.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

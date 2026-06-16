"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Heart,
  MapPin,
  PackageOpen,
  RefreshCw,
  ReceiptText,
  ShoppingBag,
  Truck,
} from "lucide-react";
import { DashboardCreateOrderModal } from "@/components/DashboardCreateOrderModal";
import { authenticatedFetch } from "@/lib/authClient";
import {
  API_BASE_URL,
  CURRENT_ORDER_URL,
  ORDER_HISTORY_URL,
  ORDERS_STATS_URL,
} from "@/Serverurls";

type MobileOrderStats = {
  totalOrders: number;
  totalPendingOrders: number;
  totalCompletedOrders: number;
};

type MobileOrderItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string;
};

type MobileOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  total: number;
  deliveryAddress: string;
  createdAt?: string;
  items: MobileOrderItem[];
};

const statsEndpoint = `${API_BASE_URL}${ORDERS_STATS_URL}`;
const currentOrderEndpoint = `${API_BASE_URL}${CURRENT_ORDER_URL}`;
const orderHistoryEndpoint = `${API_BASE_URL}${ORDER_HISTORY_URL}`;

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

  const address = isRecord(value.address) ? value.address : null;
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index): MobileOrderItem[] => {
        if (!isRecord(item)) {
          return [];
        }

        const product = isRecord(item.product) ? item.product : null;
        const buyPrice = isRecord(item.buyPrice) ? item.buyPrice : null;

        return [{
          id: readText(item, ["id"]) || `${id}-${index}`,
          name:
            (product
              ? readText(product, ["name", "title", "productName"])
              : "") || "Order item",
          quantity: readText(item, ["quantity"]) || "0",
          unit:
            readText(item, ["unit"]) ||
            (buyPrice ? readText(buyPrice, ["unit"]) : ""),
        }];
      })
    : [];

  return {
    id,
    status,
    paymentStatus: readText(value, ["paymentStatus"]) || "pending",
    total: Number(readText(value, ["total"])) || 0,
    deliveryAddress:
      readText(value, ["deliveryAddress"]) ||
      (address
        ? readText(address, ["formattedAddress", "fullAddress", "address"])
        : ""),
    createdAt: readText(value, ["createdAt"]) || undefined,
    items,
  };
}

function extractOrders(body: unknown) {
  if (body === null) {
    return [];
  }

  const value = isRecord(body)
    ? body.data ?? body.orders ?? body.results ?? body
    : body;
  const values = Array.isArray(value) ? value : [value];

  return values
    .map(parseOrder)
    .filter((order): order is MobileOrder => order !== null);
}

async function fetchStats() {
  const response = await authenticatedFetch(statsEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unable to load order stats (${response.status}).`);
  }

  const body = (await response.json()) as unknown;

  if (!isRecord(body)) {
    throw new Error("The order stats response is invalid.");
  }

  return {
    totalOrders: Number(body.totalOrders) || 0,
    totalPendingOrders: Number(body.totalPendingOrders) || 0,
    totalCompletedOrders: Number(body.totalCompletedOrders) || 0,
  };
}

async function fetchCurrentOrders() {
  const response = await authenticatedFetch(currentOrderEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 204 || response.status === 404) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Unable to load current orders (${response.status}).`);
  }

  return extractOrders((await response.json()) as unknown);
}

async function fetchHistory() {
  const url = new URL(orderHistoryEndpoint);
  url.searchParams.set("page", "1");
  url.searchParams.set("limit", "20");

  const response = await authenticatedFetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unable to load order history (${response.status}).`);
  }

  const body = (await response.json()) as unknown;
  const bodyRecord = isRecord(body) ? body : null;
  const dataRecord =
    bodyRecord && isRecord(bodyRecord.data) ? bodyRecord.data : null;
  const orders = bodyRecord?.orders ?? dataRecord?.orders ?? bodyRecord?.data ?? [];

  return (Array.isArray(orders) ? orders : [])
    .map(parseOrder)
    .filter((order): order is MobileOrder => order !== null);
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

function formatDate(value?: string) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
      }).format(date);
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ");

  if (["delivered", "completed"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (["cancelled", "canceled", "failed"].includes(normalized)) {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
}

export function CustomerMobileOrders() {
  const [stats, setStats] = useState<MobileOrderStats | null>(null);
  const [currentOrders, setCurrentOrders] = useState<MobileOrder[]>([]);
  const [history, setHistory] = useState<MobileOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    setIsRefreshing(true);
    setError("");

    const [statsResult, currentResult, historyResult] =
      await Promise.allSettled([
        fetchStats(),
        fetchCurrentOrders(),
        fetchHistory(),
      ]);

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    }

    if (currentResult.status === "fulfilled") {
      setCurrentOrders(currentResult.value);
    }

    if (historyResult.status === "fulfilled") {
      setHistory(historyResult.value);
    }

    const failedResult = [statsResult, currentResult, historyResult].find(
      (result) => result.status === "rejected",
    );

    if (failedResult?.status === "rejected") {
      setError(
        failedResult.reason instanceof Error
          ? failedResult.reason.message
          : "Some order information could not be refreshed.",
      );
    }

    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([
      fetchStats(),
      fetchCurrentOrders(),
      fetchHistory(),
    ]).then(([statsResult, currentResult, historyResult]) => {
      if (isCancelled) {
        return;
      }

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      }

      if (currentResult.status === "fulfilled") {
        setCurrentOrders(currentResult.value);
      }

      if (historyResult.status === "fulfilled") {
        setHistory(historyResult.value);
      }

      const failedResult = [statsResult, currentResult, historyResult].find(
        (result) => result.status === "rejected",
      );

      if (failedResult?.status === "rejected") {
        setError(
          failedResult.reason instanceof Error
            ? failedResult.reason.message
            : "Some order information could not be loaded.",
        );
      }

      setIsLoading(false);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5 pb-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-black">My Orders</h2>
          <p className="mt-1 text-xs font-medium text-black/48">
            Track deliveries and review previous purchases.
          </p>
        </div>
        <button
          aria-label="Refresh orders"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white text-black/55"
          disabled={isRefreshing}
          type="button"
          onClick={() => void refreshOrders()}
        >
          <RefreshCw className={isRefreshing ? "animate-spin" : ""} size={17} />
        </button>
      </section>

      <DashboardCreateOrderModal
        onOrderCreated={refreshOrders}
        triggerVariant="mobile-primary"
      />

      <section className="grid grid-cols-2 gap-3">
        <Link
          className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
          href="/dashboard/watchlist"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
            <Heart size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-black">Wishlist</span>
            <span className="mt-0.5 block text-[9px] font-bold text-black/40">
              Saved items
            </span>
          </span>
        </Link>
        <Link
          className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3.5 shadow-[0_10px_24px_rgba(0,0,0,0.04)]"
          href="/dashboard/price-alerts"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
            <Bell size={18} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-black text-black">Price Alerts</span>
            <span className="mt-0.5 block text-[9px] font-bold text-black/40">
              Track prices
            </span>
          </span>
        </Link>
      </section>

      <section className="grid grid-cols-3 gap-2.5">
        <StatCard
          icon={ShoppingBag}
          label="Total"
          value={stats?.totalOrders ?? 0}
        />
        <StatCard
          icon={Truck}
          label="Active"
          value={stats?.totalPendingOrders ?? currentOrders.length}
        />
        <StatCard
          icon={CheckCircle2}
          label="Complete"
          value={stats?.totalCompletedOrders ?? 0}
        />
      </section>

      {error ? (
        <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-5 text-amber-800">
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          {error}
        </div>
      ) : null}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-black">Active Orders</h3>
          <span className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[10px] font-black text-[#f10606]">
            {currentOrders.length}
          </span>
        </div>

        {isLoading ? (
          <OrderSkeletons count={2} />
        ) : currentOrders.length ? (
          <div className="space-y-3">
            {currentOrders.map((order) => (
              <OrderCard
                expanded={expandedOrderId === order.id}
                key={order.id}
                order={order}
                onToggle={() =>
                  setExpandedOrderId((current) =>
                    current === order.id ? null : order.id,
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyOrders
            description="New orders will appear here while they are being processed or delivered."
            title="No active orders"
          />
        )}
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-black text-black">Order History</h3>
          <span className="text-[10px] font-bold text-black/40">
            Latest {history.length}
          </span>
        </div>

        {isLoading ? (
          <OrderSkeletons count={3} />
        ) : history.length ? (
          <div className="space-y-3">
            {history.map((order) => (
              <OrderCard
                expanded={expandedOrderId === order.id}
                key={order.id}
                order={order}
                onToggle={() =>
                  setExpandedOrderId((current) =>
                    current === order.id ? null : order.id,
                  )
                }
              />
            ))}
          </div>
        ) : (
          <EmptyOrders
            description="Completed and previous orders will be listed here."
            title="No order history"
          />
        )}
      </section>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ShoppingBag;
  label: string;
  value: number;
}) {
  return (
    <article className="rounded-2xl border border-black/10 bg-white p-3 text-center shadow-[0_10px_24px_rgba(0,0,0,0.04)]">
      <span className="mx-auto flex h-8 w-8 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
        <Icon size={16} />
      </span>
      <p className="mt-2 text-lg font-black text-black">{value}</p>
      <p className="text-[9px] font-black uppercase text-black/40">{label}</p>
    </article>
  );
}

function OrderCard({
  expanded,
  onToggle,
  order,
}: {
  expanded: boolean;
  onToggle: () => void;
  order: MobileOrder;
}) {
  const names = order.items.map((item) => item.name);

  return (
    <article className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_26px_rgba(0,0,0,0.04)]">
      <button
        className="w-full p-4 text-left"
        type="button"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase text-black/38">
              #{order.id.slice(0, 8)}
            </p>
            <p className="mt-1 truncate text-sm font-black text-black">
              {names.length ? names.join(", ") : "Market order"}
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-[10px] font-bold text-black/42">
              <Clock3 size={12} />
              {formatDate(order.createdAt)}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-sm font-black text-black">
              {formatMoney(order.total)}
            </p>
            <span
              className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[9px] font-black ${getStatusTone(order.status)}`}
            >
              {formatStatus(order.status)}
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-black/[0.06] pt-3">
          <span className="text-[10px] font-bold text-black/45">
            Payment: {formatStatus(order.paymentStatus)}
          </span>
          <ChevronRight
            className={`text-black/35 transition ${expanded ? "rotate-90" : ""}`}
            size={16}
          />
        </div>
      </button>

      {expanded ? (
        <div className="space-y-3 border-t border-black/[0.07] bg-[#fafafa] p-4">
          {order.items.map((item) => (
            <div className="flex items-center gap-3" key={item.id}>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#f10606]">
                <PackageOpen size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-black text-black">{item.name}</p>
                <p className="mt-0.5 text-[10px] font-medium text-black/45">
                  {item.quantity} {item.unit}
                </p>
              </div>
            </div>
          ))}

          {order.deliveryAddress ? (
            <div className="flex gap-2 rounded-xl bg-white p-3">
              <MapPin className="mt-0.5 shrink-0 text-[#f10606]" size={15} />
              <p className="text-[10px] font-medium leading-5 text-black/55">
                {order.deliveryAddress}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function OrderSkeletons({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          className="animate-pulse rounded-2xl border border-black/10 bg-white p-4"
          key={index}
        >
          <div className="h-3 w-20 rounded bg-black/10" />
          <div className="mt-3 h-4 w-44 rounded bg-black/10" />
          <div className="mt-4 h-8 rounded-xl bg-black/[0.05]" />
        </div>
      ))}
    </div>
  );
}

function EmptyOrders({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-center">
      <ReceiptText className="mx-auto text-[#f10606]" size={22} />
      <p className="mt-3 text-sm font-black text-black">{title}</p>
      <p className="mt-1 text-xs font-medium leading-5 text-black/45">
        {description}
      </p>
    </div>
  );
}

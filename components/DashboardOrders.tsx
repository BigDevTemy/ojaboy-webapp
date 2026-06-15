"use client";

import { useCallback, useEffect, useState } from "react";
import { DashboardCreateOrderModal } from "@/components/DashboardCreateOrderModal";
import { authenticatedFetch } from "@/lib/authClient";
import {
  API_BASE_URL,
  CURRENT_ORDER_URL,
  ORDER_DETAILS_URL,
  ORDER_HISTORY_URL,
  ORDERS_STATS_URL,
} from "@/Serverurls";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Loader2,
  MapPin,
  MessageSquare,
  PackageCheck,
  PackageOpen,
  ReceiptText,
  Search,
  Star,
  Truck,
  X,
} from "lucide-react";

type OrderStats = {
  totalOrders: number;
  totalMoneySpent: number;
  totalCompletedOrders: number;
  totalPendingOrders: number;
  averageRating: number;
};

type CurrentOrderItem = {
  id: string;
  quantity: string | number;
  unit?: string | null;
  unitPrice: string | number;
  totalPrice: string | number;
  product: Record<string, unknown> | null;
  buyPrice: Record<string, unknown> | null;
};

type CurrentOrder = {
  id: string;
  status: string;
  paymentStatus?: string;
  subtotal?: string;
  discountAmount?: string;
  serviceFee?: string;
  deliveryFee?: string;
  total?: string;
  note?: string | null;
  deliveryRecipientName?: string | null;
  deliveryPhoneNumber?: string | null;
  deliveryAddress?: string | null;
  createdAt?: string;
  items: CurrentOrderItem[];
  payments: Record<string, unknown>[];
  feedback: unknown;
  address: Record<string, unknown> | null;
  deliveryZone: Record<string, unknown> | null;
};

type OrderHistoryPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type OrderHistoryResponse = {
  orders: CurrentOrder[];
  pagination: OrderHistoryPagination;
};

const ordersStatsEndpoint = `${API_BASE_URL}${ORDERS_STATS_URL}`;
const currentOrderEndpoint = `${API_BASE_URL}${CURRENT_ORDER_URL}`;
const orderHistoryEndpoint = `${API_BASE_URL}${ORDER_HISTORY_URL}`;
const orderDetailsEndpoint = `${API_BASE_URL}${ORDER_DETAILS_URL}`;
const orderStatusSteps = ["pending", "confirmed", "processing", "out for delivery", "delivered"];
const DEFAULT_ORDER_HISTORY_LIMIT = 50;
const ORDER_HISTORY_LIMIT_OPTIONS = [50, 100, 200, 500] as const;

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

function isOrderStats(value: unknown): value is OrderStats {
  if (!value || typeof value !== "object") {
    return false;
  }

  const stats = value as Partial<OrderStats>;

  return (
    typeof stats.totalOrders === "number" &&
    typeof stats.totalMoneySpent === "number" &&
    typeof stats.totalCompletedOrders === "number" &&
    typeof stats.totalPendingOrders === "number" &&
    typeof stats.averageRating === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseCurrentOrder(value: unknown): CurrentOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  if (typeof value.id !== "string" || typeof value.status !== "string") {
    return null;
  }

  const items = Array.isArray(value.items)
    ? value.items.flatMap((item): CurrentOrderItem[] => {
        if (!isRecord(item) || typeof item.id !== "string") {
          return [];
        }

        const quantity =
          typeof item.quantity === "string" || typeof item.quantity === "number"
            ? item.quantity
            : 0;
        const unitPrice =
          typeof item.unitPrice === "string" || typeof item.unitPrice === "number"
            ? item.unitPrice
            : 0;
        const totalPrice =
          typeof item.totalPrice === "string" || typeof item.totalPrice === "number"
            ? item.totalPrice
            : parseMoney(quantity) * parseMoney(unitPrice);

        return [{
          id: item.id,
          quantity,
          unit: typeof item.unit === "string" ? item.unit : null,
          unitPrice,
          totalPrice,
          product: isRecord(item.product) ? item.product : null,
          buyPrice: isRecord(item.buyPrice) ? item.buyPrice : null,
        }];
      })
    : [];

  return {
    id: value.id,
    status: value.status,
    paymentStatus: typeof value.paymentStatus === "string" ? value.paymentStatus : undefined,
    subtotal: typeof value.subtotal === "string" ? value.subtotal : undefined,
    discountAmount:
      typeof value.discountAmount === "string" ? value.discountAmount : undefined,
    serviceFee: typeof value.serviceFee === "string" ? value.serviceFee : undefined,
    deliveryFee: typeof value.deliveryFee === "string" ? value.deliveryFee : undefined,
    total: typeof value.total === "string" ? value.total : undefined,
    note: typeof value.note === "string" ? value.note : null,
    deliveryRecipientName:
      typeof value.deliveryRecipientName === "string" ? value.deliveryRecipientName : null,
    deliveryPhoneNumber:
      typeof value.deliveryPhoneNumber === "string" ? value.deliveryPhoneNumber : null,
    deliveryAddress:
      typeof value.deliveryAddress === "string" ? value.deliveryAddress : null,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : undefined,
    items,
    payments: Array.isArray(value.payments) ? value.payments.filter(isRecord) : [],
    feedback: value.feedback,
    address: isRecord(value.address) ? value.address : null,
    deliveryZone: isRecord(value.deliveryZone) ? value.deliveryZone : null,
  };
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
}

function parseMoney(value: string | number) {
  const parsed = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
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

function getOrderStatusClasses(status: string) {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ");

  if (["delivered", "completed"].includes(normalized)) {
    return "bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.25)]";
  }

  if (["cancelled", "canceled", "failed", "refunded"].includes(normalized)) {
    return "bg-red-600 text-white shadow-[0_8px_20px_rgba(220,38,38,0.25)]";
  }

  if (["confirmed", "processing", "out for delivery"].includes(normalized)) {
    return "bg-blue-600 text-white shadow-[0_8px_20px_rgba(37,99,235,0.25)]";
  }

  return "bg-amber-500 text-white shadow-[0_8px_20px_rgba(245,158,11,0.25)]";
}

function getProductName(item: CurrentOrderItem) {
  if (!item.product) {
    return "Order item";
  }

  return readText(item.product, ["name", "title", "productName", "displayName"]) ?? "Order item";
}

function getItemUnit(item: CurrentOrderItem) {
  return item.unit ??
    (item.buyPrice
      ? readText(item.buyPrice, ["unit", "unitName", "measurement", "size"])
      : null);
}

function getPaymentLabel(order: CurrentOrder) {
  if (order.paymentStatus) {
    return formatStatus(order.paymentStatus);
  }

  const payment = order.payments.find(isRecord);

  if (!payment) {
    return "Not available";
  }

  return (
    readText(payment, ["method", "paymentMethod", "channel", "provider", "status"]) ??
    "Payment recorded"
  );
}

function getAddressLabel(order: CurrentOrder) {
  if (!order.address) {
    return order.deliveryAddress ?? "Delivery address not available";
  }

  const address = order.address;
  const directAddress = readText(address, [
    "formattedAddress",
    "fullAddress",
    "address",
    "street",
    "line1",
  ]);
  const locality = readText(address, ["city", "area", "state"]);

  return [directAddress, locality].filter(Boolean).join(", ") || "Delivery address not available";
}

function getDeliveryZoneLabel(deliveryZone: Record<string, unknown> | null) {
  if (!deliveryZone) {
    return "Not assigned";
  }

  return readText(deliveryZone, ["name", "zoneName", "label", "area"]) ?? "Delivery zone";
}

function formatOrderDate(value?: string) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function fetchOrderStats() {
  const response = await authenticatedFetch(ordersStatsEndpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load order stats (${response.status}).`);
  }

  const body = (await response.json()) as unknown;

  if (!isOrderStats(body)) {
    throw new Error("The order stats response is invalid.");
  }

  return body;
}

async function fetchCurrentOrder() {
  const response = await authenticatedFetch(currentOrderEndpoint, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (response.status === 404 || response.status === 204) {
    return [];
  }

  if (!response.ok) {
    throw new Error(`Unable to load current order (${response.status}).`);
  }

  const body = (await response.json()) as unknown;

  if (body === null) {
    return [];
  }

  const responseBody = isRecord(body)
    ? body.data ?? body.orders ?? body.results ?? body
    : body;
  const rawOrders = Array.isArray(responseBody) ? responseBody : [responseBody];
  const orders = rawOrders
    .map(parseCurrentOrder)
    .filter((order): order is CurrentOrder => order !== null);

  if (orders.length === 0 && rawOrders.length > 0) {
    throw new Error("The current orders response does not contain usable orders.");
  }

  return orders;
}

async function fetchOrderHistory(
  page: number,
  limit: number,
): Promise<OrderHistoryResponse> {
  const requestUrl = new URL(orderHistoryEndpoint);
  requestUrl.searchParams.set("page", String(page));
  requestUrl.searchParams.set("limit", String(limit));

  const response = await authenticatedFetch(requestUrl.toString(), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load order history (${response.status}).`);
  }

  const body = (await response.json()) as unknown;
  const bodyRecord = isRecord(body) ? body : null;
  const dataRecord = bodyRecord && isRecord(bodyRecord.data) ? bodyRecord.data : null;
  const responseOrders = bodyRecord?.orders ?? dataRecord?.orders ?? bodyRecord?.data ?? [];
  const rawOrders = Array.isArray(responseOrders) ? responseOrders : [];
  const orders = rawOrders
    .map(parseCurrentOrder)
    .filter((order): order is CurrentOrder => order !== null);
  const paginationValue = bodyRecord?.pagination ?? dataRecord?.pagination;
  const pagination = isRecord(paginationValue) ? paginationValue : {};
  const total = parsePositiveInteger(pagination.total, orders.length);
  const responseLimit = Math.max(
    1,
    parsePositiveInteger(pagination.limit, limit),
  );

  return {
    orders,
    pagination: {
      page: Math.max(1, parsePositiveInteger(pagination.page, page)),
      limit: responseLimit,
      total,
      totalPages: Math.max(
        1,
        parsePositiveInteger(
          pagination.totalPages,
          Math.ceil(total / responseLimit),
        ),
      ),
    },
  };
}

async function fetchOrderDetails(orderId: string) {
  const response = await authenticatedFetch(
    `${orderDetailsEndpoint}/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Unable to load order details (${response.status}).`);
  }

  const body = (await response.json()) as unknown;
  const bodyRecord = isRecord(body) ? body : null;
  const dataRecord = bodyRecord && isRecord(bodyRecord.data) ? bodyRecord.data : null;
  const order = parseCurrentOrder(
    bodyRecord?.order ?? dataRecord?.order ?? bodyRecord?.data ?? body,
  );

  if (!order) {
    throw new Error("The order details response is invalid.");
  }

  return order;
}

export function DashboardOrders() {
  const [orderStats, setOrderStats] = useState<OrderStats | null>(null);
  const [statsError, setStatsError] = useState("");
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [currentOrders, setCurrentOrders] = useState<CurrentOrder[]>([]);
  const [selectedCurrentOrderIndex, setSelectedCurrentOrderIndex] = useState(0);
  const [currentOrderError, setCurrentOrderError] = useState("");
  const [isCurrentOrderLoading, setIsCurrentOrderLoading] = useState(true);
  const [orderHistory, setOrderHistory] = useState<CurrentOrder[]>([]);
  const [orderHistoryError, setOrderHistoryError] = useState("");
  const [isOrderHistoryLoading, setIsOrderHistoryLoading] = useState(true);
  const [orderHistorySearch, setOrderHistorySearch] = useState("");
  const [orderHistoryPage, setOrderHistoryPage] = useState(1);
  const [orderHistoryLimit, setOrderHistoryLimit] = useState(
    DEFAULT_ORDER_HISTORY_LIMIT,
  );
  const [orderHistoryPagination, setOrderHistoryPagination] =
    useState<OrderHistoryPagination>({
      page: 1,
      limit: DEFAULT_ORDER_HISTORY_LIMIT,
      total: 0,
      totalPages: 1,
    });
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<CurrentOrder | null>(null);
  const [orderDetailsError, setOrderDetailsError] = useState("");
  const [isOrderDetailsLoading, setIsOrderDetailsLoading] = useState(false);

  const loadOrderStats = useCallback(async () => {
    setIsStatsLoading(true);
    setStatsError("");

    try {
      setOrderStats(await fetchOrderStats());
    } catch (requestError) {
      setStatsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load order stats.",
      );
    } finally {
      setIsStatsLoading(false);
    }
  }, []);

  const loadCurrentOrder = useCallback(async () => {
    setIsCurrentOrderLoading(true);
    setCurrentOrderError("");

    try {
      setCurrentOrders(await fetchCurrentOrder());
      setSelectedCurrentOrderIndex(0);
    } catch (requestError) {
      setCurrentOrderError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load current order.",
      );
    } finally {
      setIsCurrentOrderLoading(false);
    }
  }, []);

  const loadOrderHistory = useCallback(async (page: number, limit: number) => {
    setIsOrderHistoryLoading(true);
    setOrderHistoryError("");

    try {
      const historyResponse = await fetchOrderHistory(page, limit);
      setOrderHistory(historyResponse.orders);
      setOrderHistoryPagination(historyResponse.pagination);
      setOrderHistoryPage(historyResponse.pagination.page);
      setOrderHistoryLimit(historyResponse.pagination.limit);
    } catch (requestError) {
      setOrderHistoryError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load order history.",
      );
    } finally {
      setIsOrderHistoryLoading(false);
    }
  }, []);

  const openOrderDetails = useCallback(async (orderId: string) => {
    setSelectedOrderId(orderId);
    setSelectedOrder(null);
    setOrderDetailsError("");
    setIsOrderDetailsLoading(true);

    try {
      setSelectedOrder(await fetchOrderDetails(orderId));
    } catch (requestError) {
      setOrderDetailsError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load order details.",
      );
    } finally {
      setIsOrderDetailsLoading(false);
    }
  }, []);

  function closeOrderDetails() {
    setSelectedOrderId(null);
    setSelectedOrder(null);
    setOrderDetailsError("");
    setIsOrderDetailsLoading(false);
  }

  useEffect(() => {
    let isCancelled = false;

    void Promise.allSettled([
      fetchOrderStats(),
      fetchCurrentOrder(),
      fetchOrderHistory(1, DEFAULT_ORDER_HISTORY_LIMIT),
    ]).then(
      ([statsResult, currentOrderResult, historyResult]) => {
        if (isCancelled) {
          return;
        }

        if (statsResult.status === "fulfilled") {
          setOrderStats(statsResult.value);
        } else {
          setStatsError(
            statsResult.reason instanceof Error
              ? statsResult.reason.message
              : "Unable to load order stats.",
          );
        }
        setIsStatsLoading(false);

        if (currentOrderResult.status === "fulfilled") {
          setCurrentOrders(currentOrderResult.value);
          setSelectedCurrentOrderIndex(0);
        } else {
          setCurrentOrderError(
            currentOrderResult.reason instanceof Error
              ? currentOrderResult.reason.message
              : "Unable to load current order.",
          );
        }
        setIsCurrentOrderLoading(false);

        if (historyResult.status === "fulfilled") {
          setOrderHistory(historyResult.value.orders);
          setOrderHistoryPagination(historyResult.value.pagination);
          setOrderHistoryPage(historyResult.value.pagination.page);
          setOrderHistoryLimit(historyResult.value.pagination.limit);
        } else {
          setOrderHistoryError(
            historyResult.reason instanceof Error
              ? historyResult.reason.message
              : "Unable to load order history.",
          );
        }
        setIsOrderHistoryLoading(false);
      },
    );

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedOrderId) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedOrderId(null);
        setSelectedOrder(null);
        setOrderDetailsError("");
        setIsOrderDetailsLoading(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedOrderId]);

  const stats = orderStats
    ? [
        { label: "Total Orders", value: orderStats.totalOrders.toLocaleString(), icon: BarChart3 },
        { label: "Pending", value: orderStats.totalPendingOrders.toLocaleString(), icon: Truck },
        { label: "Completed", value: orderStats.totalCompletedOrders.toLocaleString(), icon: PackageCheck },
        { label: "Total Spend", value: formatMoney(orderStats.totalMoneySpent), icon: CreditCard },
        { label: "Avg. Rating", value: orderStats.averageRating.toFixed(1), icon: Star },
      ]
    : [];
  const normalizedHistorySearch = orderHistorySearch.trim().toLowerCase();
  const filteredOrderHistory = orderHistory.filter((order) => {
    if (!normalizedHistorySearch) {
      return true;
    }

    const productNames = order.items.map(getProductName).join(" ");

    return [
      order.id,
      order.status,
      order.paymentStatus ?? "",
      productNames,
    ].some((value) => value.toLowerCase().includes(normalizedHistorySearch));
  });
  const visibleOrderHistory = filteredOrderHistory;

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

      <div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {isStatsLoading
            ? Array.from({ length: 5 }, (_, index) => (
                <section
                  className="animate-pulse rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]"
                  key={`order-stat-loading-${index}`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="h-3 w-20 rounded bg-black/10" />
                      <div className="mt-3 h-7 w-24 rounded bg-black/10" />
                    </div>
                    <div className="h-11 w-11 rounded-xl bg-[#fff0f0]" />
                  </div>
                </section>
              ))
            : stats.map((stat) => (
                <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={stat.label}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase text-black/48">{stat.label}</p>
                      <p className="mt-2 truncate text-2xl font-black text-black" title={stat.value}>{stat.value}</p>
                    </div>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                      <stat.icon size={22} />
                    </div>
                  </div>
                </section>
              ))}
        </div>
        {statsError ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-700">{statsError}</p>
            <button
              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white"
              type="button"
              onClick={() => void loadOrderStats()}
            >
              Retry
            </button>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          {isCurrentOrderLoading ? (
            <div className="animate-pulse">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="h-5 w-36 rounded bg-black/10" />
                  <div className="mt-3 h-4 w-56 rounded bg-black/10" />
                </div>
                <div className="h-7 w-24 rounded-full bg-[#fff0f0]" />
              </div>
              <div className="mt-6 grid gap-3 lg:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => (
                  <div className="h-20 rounded-xl bg-black/[0.05]" key={`current-order-loading-${index}`} />
                ))}
              </div>
            </div>
          ) : currentOrderError ? (
            <div>
              <h2 className="text-lg font-black text-black">Current Order</h2>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-bold text-red-700">{currentOrderError}</p>
                <button
                  className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white"
                  type="button"
                  onClick={() => void loadCurrentOrder()}
                >
                  Retry
                </button>
              </div>
            </div>
          ) : currentOrders.length ? (
            <div>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-black">Current Orders</h2>
                  <span className="rounded-full bg-[#fff0f0] px-2.5 py-1 text-[10px] font-black text-[#f10606]">
                    {currentOrders.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/65 transition hover:border-[#f10606]/30 hover:text-[#f10606] disabled:cursor-not-allowed disabled:opacity-35"
                    type="button"
                    aria-label="Previous current order"
                    disabled={selectedCurrentOrderIndex === 0}
                    onClick={() => setSelectedCurrentOrderIndex((index) => Math.max(0, index - 1))}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="min-w-20 text-center text-xs font-black text-black/55">
                    {selectedCurrentOrderIndex + 1} of {currentOrders.length}
                  </span>
                  <button
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/65 transition hover:border-[#f10606]/30 hover:text-[#f10606] disabled:cursor-not-allowed disabled:opacity-35"
                    type="button"
                    aria-label="Next current order"
                    disabled={selectedCurrentOrderIndex === currentOrders.length - 1}
                    onClick={() =>
                      setSelectedCurrentOrderIndex((index) =>
                        Math.min(currentOrders.length - 1, index + 1),
                      )
                    }
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              {currentOrders
                .slice(selectedCurrentOrderIndex, selectedCurrentOrderIndex + 1)
                .map((currentOrder) => {
                const currentOrderTotal = currentOrder.total
                  ? parseMoney(currentOrder.total)
                  : currentOrder.items.reduce(
                      (total, item) => total + parseMoney(item.totalPrice),
                      0,
                    );
                const normalizedOrderStatus = currentOrder.status
                  .toLowerCase()
                  .replace(/[_-]+/g, " ");
                const currentStatusIndex = orderStatusSteps.indexOf(normalizedOrderStatus);

                return (
                  <article key={currentOrder.id}>
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-black">Order</h3>
                    <span className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wide ${getOrderStatusClasses(currentOrder.status)}`}>
                      {formatStatus(currentOrder.status)}
                    </span>
                  </div>
                  <p className="mt-1 break-all text-sm font-medium text-black/55">
                    Order ID: {currentOrder.id}
                  </p>
                  <p className="mt-1 text-xs font-bold text-black/40">
                    Created {formatOrderDate(currentOrder.createdAt)}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-black uppercase text-black/42">Delivery Zone</p>
                  <p className="mt-1 text-base font-black text-[#f10606]">
                    {getDeliveryZoneLabel(currentOrder.deliveryZone)}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  {currentOrder.items.length ? (
                    currentOrder.items.map((item) => (
                      <div className="flex items-center gap-3 rounded-xl border border-black/10 p-3" key={item.id}>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-[#f10606]">
                          <PackageOpen size={21} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-black">{getProductName(item)}</p>
                          <p className="mt-1 text-xs font-medium text-black/50">
                            Qty: {item.quantity}
                            {getItemUnit(item) ? ` ${getItemUnit(item)}` : ""}
                            {" / "}
                            {formatMoney(parseMoney(item.unitPrice))} each
                          </p>
                        </div>
                        <p className="text-sm font-black text-black">
                          {formatMoney(parseMoney(item.totalPrice))}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-black/15 p-5 text-sm font-medium text-black/50">
                      This order has no items.
                    </div>
                  )}
                </div>

                <aside className="rounded-xl bg-[#fbfbfb] p-4">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-black/55">Items</span>
                      <span className="text-right font-black text-black">{currentOrder.items.length}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-black/55">Payment</span>
                      <span className="text-right font-black capitalize text-black">{getPaymentLabel(currentOrder)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-black/55">Total</span>
                      <span className="text-right font-black text-black">{formatMoney(currentOrderTotal)}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="font-medium text-black/55">Delivery fee</span>
                      <span className="text-right font-black text-black">
                        {formatMoney(parseMoney(currentOrder.deliveryFee ?? 0))}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 rounded-lg border border-black/10 bg-white p-3">
                    <p className="mb-2 flex items-center gap-2 text-xs font-black uppercase text-black/42">
                      <MapPin size={14} />
                      Delivery Address
                    </p>
                    <p className="text-sm font-bold leading-6 text-black/72">
                      {getAddressLabel(currentOrder)}
                    </p>
                    {currentOrder.deliveryRecipientName ? (
                      <p className="mt-2 text-xs font-medium text-black/50">
                        {currentOrder.deliveryRecipientName}
                        {currentOrder.deliveryPhoneNumber
                          ? ` / ${currentOrder.deliveryPhoneNumber}`
                          : ""}
                      </p>
                    ) : null}
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
                  {orderStatusSteps.map((status, index) => {
                    const isComplete = currentStatusIndex >= index;
                    const isCurrent = normalizedOrderStatus === status;

                    return (
                      <div
                        className={`relative rounded-xl border p-3 transition ${
                          isCurrent
                            ? "border-[#f10606] bg-[#f10606] text-white shadow-[0_14px_30px_rgba(241,6,6,0.28)] ring-4 ring-[#f10606]/15"
                            : isComplete
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-black/10 bg-[#f7f7f7]"
                        }`}
                        key={status}
                      >
                        <div className={`mb-3 flex h-8 w-8 items-center justify-center rounded-full ${
                          isCurrent
                            ? "bg-white text-[#f10606]"
                            : isComplete
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-black/35"
                        }`}>
                          {isComplete ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}
                        </div>
                        <p className={`text-xs font-black ${isCurrent ? "text-white" : "text-black"}`}>{formatStatus(status)}</p>
                        <p className={`mt-1 text-[10px] font-bold ${isCurrent ? "text-white/85" : "text-black/45"}`}>
                          {isCurrent ? "Current status" : isComplete ? "Complete" : "Upcoming"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0f0] text-[#f10606]">
                <PackageOpen size={23} />
              </div>
              <h2 className="mt-4 text-lg font-black text-black">No current orders</h2>
              <p className="mt-2 text-sm font-medium text-black/55">
                Your next active order will appear here.
              </p>
            </div>
          )}
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
                value={orderHistorySearch}
                onChange={(event) => setOrderHistorySearch(event.target.value)}
              />
            </div>
            <label className="flex h-11 items-center gap-2 rounded-lg border border-black/10 bg-white px-3 text-xs font-black text-black/55">
              Rows
              <select
                className="bg-transparent text-sm font-black text-black outline-none"
                aria-label="Orders per page"
                value={orderHistoryLimit}
                onChange={(event) => {
                  const nextLimit = Number(event.target.value);
                  setOrderHistorySearch("");
                  void loadOrderHistory(1, nextLimit);
                }}
              >
                {ORDER_HISTORY_LIMIT_OPTIONS.map((limit) => (
                  <option value={limit} key={limit}>
                    {limit}
                  </option>
                ))}
              </select>
            </label>
            <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/72 transition hover:text-[#f10606]" type="button">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="grid min-w-[860px] grid-cols-[1.1fr_1.2fr_0.85fr_0.8fr_0.75fr_0.75fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
            <span>Order ID</span>
            <span>Products</span>
            <span>Date</span>
            <span>Total</span>
            <span>Status</span>
            <span>Payment</span>
            <span className="text-right">Action</span>
          </div>
          <div className="overflow-x-auto">
            {isOrderHistoryLoading
              ? Array.from({ length: 4 }, (_, index) => (
                  <div
                    className="grid min-w-[860px] animate-pulse grid-cols-[1.1fr_1.2fr_0.85fr_0.8fr_0.75fr_0.75fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-5"
                    key={`history-loading-${index}`}
                  >
                    {Array.from({ length: 7 }, (_, cellIndex) => (
                      <div className="h-4 rounded bg-black/10" key={`history-loading-${index}-${cellIndex}`} />
                    ))}
                  </div>
                ))
              : visibleOrderHistory.map((order) => {
                  const products = order.items.map(getProductName);
                  const paymentStatus = order.paymentStatus ?? "unknown";
                  const isOrderComplete = ["delivered", "completed"].includes(order.status.toLowerCase());
                  const isPaymentPaid = ["paid", "successful"].includes(paymentStatus.toLowerCase());

                  return (
                    <div className="grid min-w-[860px] grid-cols-[1.1fr_1.2fr_0.85fr_0.8fr_0.75fr_0.75fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm" key={order.id}>
                      <p className="truncate font-black text-black" title={order.id}>{order.id}</p>
                      <div className="min-w-0">
                        <p className="truncate font-black text-black">
                          {products.length ? products.join(", ") : "No items"}
                        </p>
                        <p className="mt-1 text-xs font-medium text-black/50">
                          {order.items.length} item{order.items.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <p className="font-bold text-black/64">{formatOrderDate(order.createdAt)}</p>
                      <p className="font-black text-black">{formatMoney(parseMoney(order.total ?? 0))}</p>
                      <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${isOrderComplete ? "bg-[#eaf8ef] text-[#078b39]" : "bg-amber-50 text-amber-700"}`}>
                        {formatStatus(order.status)}
                      </span>
                      <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${isPaymentPaid ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                        {formatStatus(paymentStatus)}
                      </span>
                      <button
                        className="ml-auto rounded-lg border border-black/10 px-3 py-2 text-xs font-black text-black/62 transition hover:text-[#f10606]"
                        type="button"
                        onClick={() => void openOrderDetails(order.id)}
                      >
                        View details
                      </button>
                    </div>
                  );
                })}
          </div>
        </div>
        {orderHistoryError ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-bold text-red-700">{orderHistoryError}</p>
            <button
              className="rounded-lg bg-red-700 px-3 py-2 text-xs font-black text-white"
              type="button"
              onClick={() => void loadOrderHistory(orderHistoryPage, orderHistoryLimit)}
            >
              Retry
            </button>
          </div>
        ) : null}
        {!isOrderHistoryLoading && !orderHistoryError && filteredOrderHistory.length === 0 ? (
          <p className="py-8 text-center text-sm font-medium text-black/50">
            {orderHistorySearch ? "No orders match your search." : "No order history yet."}
          </p>
        ) : null}
        {!isOrderHistoryLoading && !orderHistoryError && filteredOrderHistory.length > 0 ? (
          <div className="mt-4 flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-black/45">
              Showing {visibleOrderHistory.length} of {orderHistoryPagination.total} orders
            </p>
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 disabled:cursor-not-allowed disabled:opacity-35"
                type="button"
                aria-label="Previous history page"
                disabled={orderHistoryPage <= 1}
                onClick={() =>
                  void loadOrderHistory(orderHistoryPage - 1, orderHistoryLimit)
                }
              >
                <ChevronLeft size={17} />
              </button>
              <span className="min-w-16 text-center text-xs font-black text-black/55">
                {orderHistoryPage} of {orderHistoryPagination.totalPages}
              </span>
              <button
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 disabled:cursor-not-allowed disabled:opacity-35"
                type="button"
                aria-label="Next history page"
                disabled={orderHistoryPage >= orderHistoryPagination.totalPages}
                onClick={() =>
                  void loadOrderHistory(orderHistoryPage + 1, orderHistoryLimit)
                }
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        ) : null}
      </section>

      {selectedOrderId ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeOrderDetails();
            }
          }}
        >
          <section
            aria-labelledby="order-details-title"
            aria-modal="true"
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
            role="dialog"
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-6">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-wide text-[#f10606]">
                  Order details
                </p>
                <h2
                  className="mt-1 truncate text-lg font-black text-black"
                  id="order-details-title"
                  title={selectedOrderId}
                >
                  {selectedOrderId}
                </h2>
              </div>
              <button
                aria-label="Close order details"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black/5 text-black/60 transition hover:bg-black/10 hover:text-black"
                type="button"
                onClick={closeOrderDetails}
              >
                <X size={20} />
              </button>
            </div>

            {isOrderDetailsLoading ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <Loader2 className="animate-spin text-[#f10606]" size={30} />
                <p className="mt-4 text-sm font-bold text-black/55">
                  Loading order details...
                </p>
              </div>
            ) : orderDetailsError ? (
              <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="rounded-xl bg-red-50 px-5 py-4 text-sm font-bold text-red-700">
                  {orderDetailsError}
                </div>
                <button
                  className="mt-4 rounded-lg bg-[#f10606] px-5 py-3 text-sm font-black text-white"
                  type="button"
                  onClick={() => void openOrderDetails(selectedOrderId)}
                >
                  Try again
                </button>
              </div>
            ) : selectedOrder ? (
              <div className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`rounded-full px-4 py-2 text-xs font-black ${getOrderStatusClasses(selectedOrder.status)}`}>
                    {formatStatus(selectedOrder.status)}
                  </span>
                  <span className={`rounded-full px-4 py-2 text-xs font-black ${
                    ["paid", "successful"].includes(
                      (selectedOrder.paymentStatus ?? "").toLowerCase(),
                    )
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}>
                    Payment: {formatStatus(selectedOrder.paymentStatus ?? "unknown")}
                  </span>
                  <span className="text-xs font-bold text-black/50">
                    {formatOrderDate(selectedOrder.createdAt)}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-black text-black">Items</h3>
                  <div className="mt-3 space-y-3">
                    {selectedOrder.items.length ? selectedOrder.items.map((item) => (
                      <div
                        className="flex items-center gap-3 rounded-xl border border-black/10 p-4"
                        key={item.id}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-[#f10606]">
                          <PackageOpen size={20} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-black">
                            {getProductName(item)}
                          </p>
                          <p className="mt-1 text-xs font-medium text-black/50">
                            {item.quantity}{getItemUnit(item) ? ` ${getItemUnit(item)}` : ""}
                            {" at "}
                            {formatMoney(parseMoney(item.unitPrice))}
                          </p>
                        </div>
                        <p className="text-sm font-black text-black">
                          {formatMoney(parseMoney(item.totalPrice))}
                        </p>
                      </div>
                    )) : (
                      <p className="rounded-xl border border-dashed border-black/15 p-5 text-sm font-medium text-black/50">
                        No items were returned for this order.
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl bg-[#fafafa] p-4">
                    <h3 className="text-sm font-black text-black">Order summary</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-black/55">Subtotal</span>
                        <span className="font-black">{formatMoney(parseMoney(selectedOrder.subtotal ?? 0))}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-black/55">Discount</span>
                        <span className="font-black text-emerald-700">
                          -{formatMoney(parseMoney(selectedOrder.discountAmount ?? 0))}
                        </span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-black/55">Service fee</span>
                        <span className="font-black">{formatMoney(parseMoney(selectedOrder.serviceFee ?? 0))}</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-medium text-black/55">Delivery fee</span>
                        <span className="font-black">{formatMoney(parseMoney(selectedOrder.deliveryFee ?? 0))}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-t border-black/10 pt-3">
                        <span className="font-black text-black">Total</span>
                        <span className="text-base font-black text-[#f10606]">
                          {formatMoney(parseMoney(selectedOrder.total ?? 0))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-black/10 p-4">
                      <p className="flex items-center gap-2 text-xs font-black uppercase text-black/45">
                        <MapPin size={15} />
                        Delivery zone
                      </p>
                      <p className="mt-2 text-sm font-black text-black">
                        {getDeliveryZoneLabel(selectedOrder.deliveryZone)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-black/10 p-4">
                      <p className="text-xs font-black uppercase text-black/45">Order note</p>
                      <p className="mt-2 text-sm font-medium leading-6 text-black/70">
                        {selectedOrder.note || "No note was added to this order."}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-black text-black">Payment records</h3>
                  <div className="mt-3 space-y-3">
                    {selectedOrder.payments.length ? selectedOrder.payments.map((payment, index) => {
                      const paymentId = readText(payment, ["id"]) ?? `payment-${index}`;
                      const paymentStatus = readText(payment, ["status"]) ?? "unknown";
                      const amount = readText(payment, ["amount"]) ?? "0";

                      return (
                        <div
                          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 p-4"
                          key={paymentId}
                        >
                          <div>
                            <p className="text-sm font-black text-black">
                              {formatStatus(readText(payment, ["provider"]) ?? "Payment")}
                            </p>
                            <p className="mt-1 text-xs font-medium text-black/50">
                              {readText(payment, ["paidAt"])
                                ? formatOrderDate(readText(payment, ["paidAt"]) ?? undefined)
                                : "Payment date unavailable"}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-black text-black">
                              {formatMoney(parseMoney(amount))}
                            </p>
                            <p className="mt-1 text-xs font-black text-emerald-700">
                              {formatStatus(paymentStatus)}
                            </p>
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="rounded-xl border border-dashed border-black/15 p-5 text-sm font-medium text-black/50">
                        No payment records were returned.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </div>
  );
}

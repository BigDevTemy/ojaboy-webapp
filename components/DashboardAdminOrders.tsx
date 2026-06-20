"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Eye,
  LoaderCircle,
  PackageCheck,
  PencilLine,
  RefreshCw,
  Search,
  Download,
  X,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, ORDERS_URL, USERS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type AdminUser = {
  id: string;
  name: string;
  email?: string;
};

type AdminOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type AdminBankTransferAccount = {
  id: string;
  providerReference?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  bankCode?: string;
  amount?: number;
  currency?: string;
  accountExpiresAt?: string;
  status: string;
  paidAt?: string;
};

type AdminOrder = {
  id: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  status: string;
  paymentStatus: string;
  subtotal?: number;
  serviceFee?: number;
  deliveryFee?: number;
  total?: number;
  deliveryAddress?: string;
  deliveryRecipientName?: string;
  deliveryPhoneNumber?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  items: AdminOrderItem[];
  paystackBankTransferAccounts: AdminBankTransferAccount[];
};

type PaymentRetryDetails = {
  orderId: string;
  reference: string;
  status: string;
  paymentAction?: string;
  displayText?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  amount?: number;
  currency?: string;
};

type Pagination = {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
};

type OrderSearchMode = "customerEmail" | "customerName" | "orderId";

const ordersEndpoint = `${API_BASE_URL}${ORDERS_URL}`;
const usersEndpoint = `${API_BASE_URL}${USERS_URL}`;
const limitOptions = [20, 50, 100, 200];
const orderStatuses = ["", "pending", "confirmed", "processing", "out_for_delivery", "delivered", "cancelled"];
const editableOrderStatuses = orderStatuses.filter(Boolean);
const paymentStatuses = ["", "pending", "paid", "failed", "refunded"];
const exportFormats = ["xlsx", "csv"];
const orderSearchOptions: { label: string; value: OrderSearchMode }[] = [
  { label: "Customer email", value: "customerEmail" },
  { label: "Customer name", value: "customerName" },
  { label: "Order ID", value: "orderId" },
];

function getTodayInputValue() {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

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

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function getResponseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) {
    return fallback;
  }

  const message = body.message;

  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseUser(value: unknown): AdminUser | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);

  if (!id) {
    return null;
  }

  return {
    id,
    name: readText(value, ["fullName", "name", "username"]) || "Unnamed user",
    email: readText(value, ["email"]) || undefined,
  };
}

function parseOrderItem(value: unknown, index: number): AdminOrderItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const product = isRecord(value.product) ? value.product : null;
  const buyPrice = isRecord(value.buyPrice) ? value.buyPrice : null;
  const id = readText(value, ["id"]) || `item-${index}`;

  return {
    id,
    productName:
      (product ? readText(product, ["name", "title", "productName"]) : "") ||
      readText(value, ["productName", "name"]) ||
      "Order item",
    quantity: readNumber(value, ["quantity"]) ?? 0,
    unit: readText(value, ["unit"]) || (buyPrice ? readText(buyPrice, ["unit"]) : ""),
    unitPrice: readNumber(value, ["unitPrice"]),
    totalPrice: readNumber(value, ["totalPrice"]),
  };
}

function parseBankTransferAccount(value: unknown, index: number): AdminBankTransferAccount | null {
  if (!isRecord(value)) {
    return null;
  }

  const generatedRawProviderData = isRecord(value.generatedRawProviderData)
    ? value.generatedRawProviderData
    : null;
  const rawBank = generatedRawProviderData && isRecord(generatedRawProviderData.bank)
    ? generatedRawProviderData.bank
    : null;
  const id = readText(value, ["id"]) || `bank-transfer-${index}`;
  const status =
    readText(value, ["status"]) ||
    (generatedRawProviderData ? readText(generatedRawProviderData, ["status"]) : "");

  if (!id || !status) {
    return null;
  }

  return {
    id,
    providerReference:
      readText(value, ["providerReference"]) ||
      (generatedRawProviderData ? readText(generatedRawProviderData, ["reference"]) : "") ||
      undefined,
    accountName:
      readText(value, ["accountName"]) ||
      (generatedRawProviderData ? readText(generatedRawProviderData, ["account_name", "accountName"]) : "") ||
      undefined,
    accountNumber:
      readText(value, ["accountNumber"]) ||
      (generatedRawProviderData ? readText(generatedRawProviderData, ["account_number", "accountNumber"]) : "") ||
      undefined,
    bankName:
      readText(value, ["bankName"]) ||
      (rawBank ? readText(rawBank, ["name"]) : "") ||
      undefined,
    bankCode: readText(value, ["bankCode"]) || (rawBank ? readText(rawBank, ["code", "slug"]) : "") || undefined,
    amount:
      readNumber(value, ["amount"]) ??
      (generatedRawProviderData ? readNumber(generatedRawProviderData, ["amount"]) : undefined),
    currency: readText(value, ["currency"]) || undefined,
    accountExpiresAt:
      readText(value, ["accountExpiresAt"]) ||
      (generatedRawProviderData ? readText(generatedRawProviderData, ["account_expires_at", "accountExpiresAt"]) : "") ||
      undefined,
    status,
    paidAt: readText(value, ["paidAt"]) || undefined,
  };
}

function parseOrder(value: unknown): AdminOrder | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const status = readText(value, ["status"]);

  if (!id || !status) {
    return null;
  }

  const user = isRecord(value.user) ? value.user : null;
  const address = isRecord(value.address) ? value.address : null;
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index) => {
        const parsed = parseOrderItem(item, index);
        return parsed ? [parsed] : [];
      })
    : [];
  const bankTransferAccountsValue =
    value.paystackBankTransferAccounts ?? value.paystackBankTransferAccount;
  const bankTransferAccounts = Array.isArray(bankTransferAccountsValue)
    ? bankTransferAccountsValue.flatMap((account, index) => {
        const parsed = parseBankTransferAccount(account, index);
        return parsed ? [parsed] : [];
      })
    : [];

  return {
    id,
    userId: readText(value, ["userId"]) || (user ? readText(user, ["id"]) : "") || undefined,
    customerName:
      (user ? readText(user, ["fullName", "name", "username"]) : "") ||
      readText(value, ["customerName", "deliveryRecipientName"]) ||
      "Customer",
    customerEmail: (user ? readText(user, ["email"]) : "") || undefined,
    status,
    paymentStatus: readText(value, ["paymentStatus"]) || "pending",
    subtotal: readNumber(value, ["subtotal"]),
    serviceFee: readNumber(value, ["serviceFee"]),
    deliveryFee: readNumber(value, ["deliveryFee"]),
    total: readNumber(value, ["total"]),
    deliveryAddress:
      readText(value, ["deliveryAddress"]) ||
      (address ? readText(address, ["formattedAddress", "fullAddress", "address"]) : "") ||
      undefined,
    deliveryRecipientName: readText(value, ["deliveryRecipientName"]) || undefined,
    deliveryPhoneNumber: readText(value, ["deliveryPhoneNumber"]) || undefined,
    note: readText(value, ["note"]) || undefined,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
    items,
    paystackBankTransferAccounts: bankTransferAccounts,
  };
}

function parseList<T>(body: unknown, key: string, parser: (value: unknown) => T | null) {
  const value = isRecord(body) ? body.data ?? body[key] ?? body.results ?? body : body;
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((item) => {
    const parsed = parser(item);
    return parsed ? [parsed] : [];
  });
}

function parsePagination(body: unknown, fallback: Pagination): Pagination {
  const value = isRecord(body) && isRecord(body.pagination) ? body.pagination : {};

  return {
    page: readNumber(value, ["page"]) ?? fallback.page,
    limit: readNumber(value, ["limit"]) ?? fallback.limit,
    total: readNumber(value, ["total"]),
    totalPages: readNumber(value, ["totalPages"]),
  };
}

function formatMoney(value?: number) {
  if (value === undefined) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPaymentAmount(value?: number, currency = "NGN") {
  if (value === undefined) {
    return "Pending";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function formatDate(value?: string) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parsePaymentRetryDetails(orderId: string, value: unknown): PaymentRetryDetails | null {
  if (!isRecord(value)) {
    return null;
  }

  const charge = isRecord(value.charge) ? value.charge : null;
  const chargeData = charge && isRecord(charge.data) ? charge.data : null;
  const bank = chargeData && isRecord(chargeData.bank) ? chargeData.bank : null;
  const reference = readText(value, ["reference"]) || (chargeData ? readText(chargeData, ["reference"]) : "");

  if (!reference) {
    return null;
  }

  return {
    orderId,
    reference,
    status: readText(value, ["status"]) || (chargeData ? readText(chargeData, ["status"]) : "") || "pending",
    paymentAction: readText(value, ["paymentAction"]) || undefined,
    displayText: chargeData ? readText(chargeData, ["display_text", "displayText"]) || undefined : undefined,
    accountName: chargeData ? readText(chargeData, ["account_name", "accountName"]) || undefined : undefined,
    accountNumber: chargeData ? readText(chargeData, ["account_number", "accountNumber"]) || undefined : undefined,
    bankName: bank ? readText(bank, ["name"]) || undefined : undefined,
    amount: chargeData ? readNumber(chargeData, ["amount"]) : undefined,
    currency: chargeData ? readText(chargeData, ["currency"]) || undefined : undefined,
  };
}

export function DashboardAdminOrders() {
  const today = useMemo(() => getTodayInputValue(), []);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [statusEditorOrder, setStatusEditorOrder] = useState<AdminOrder | null>(null);
  const [paymentRetryDetails, setPaymentRetryDetails] = useState<PaymentRetryDetails | null>(null);
  const [statusDraft, setStatusDraft] = useState("");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [userId, setUserId] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [orderSearchMode, setOrderSearchMode] = useState<OrderSearchMode>("customerEmail");
  const [orderSearch, setOrderSearch] = useState("");
  const [exportFormat, setExportFormat] = useState("xlsx");
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50 });
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();

    if (!query) {
      return users.slice(0, 20);
    }

    return users
      .filter((user) => `${user.name} ${user.email ?? ""}`.toLowerCase().includes(query))
      .slice(0, 20);
  }, [userSearch, users]);

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase();

    if (!query) {
      return orders;
    }

    return orders.filter((order) => {
      if (orderSearchMode === "customerEmail") {
        return (order.customerEmail ?? "").toLowerCase().includes(query);
      }

      if (orderSearchMode === "customerName") {
        return order.customerName.toLowerCase().includes(query);
      }

      return order.id.toLowerCase().includes(query);
    });
  }, [orderSearch, orderSearchMode, orders]);

  const orderStats = useMemo(() => {
    return visibleOrders.reduce(
      (stats, order) => {
        const normalizedStatus = order.status.toLowerCase();

        stats.total += 1;
        stats.revenue += order.total ?? 0;

        if (normalizedStatus === "pending") {
          stats.pending += 1;
        }

        if (normalizedStatus === "completed" || normalizedStatus === "delivered") {
          stats.completed += 1;
        }

        return stats;
      },
      { total: 0, pending: 0, completed: 0, revenue: 0 },
    );
  }, [visibleOrders]);

  const selectedOrderIdSet = useMemo(() => new Set(selectedOrderIds), [selectedOrderIds]);
  const allVisibleOrdersSelected = visibleOrders.length > 0 && visibleOrders.every((order) => selectedOrderIdSet.has(order.id));

  const loadUsers = useCallback(async () => {
    try {
      const response = await authenticatedFetch(usersEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (response.ok) {
        setUsers(parseList(body, "users", parseUser));
      }
    } catch {
      setUsers([]);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setIsLoading(true);
    setError("");
    setNotice("");

    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (userId) params.set("userId", userId);

    try {
      const response = await authenticatedFetch(`${ordersEndpoint}?${params}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load orders (${response.status}).`));
      }

      setOrders(parseList(body, "orders", parseOrder));
      setSelectedOrderIds([]);
      setPagination(parsePagination(body, { page, limit }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load orders.");
    } finally {
      setIsLoading(false);
    }
  }, [from, limit, page, paymentStatus, status, to, userId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadOrders();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadOrders]);

  async function loadOrderDetails(id: string) {
    setBusyAction(`detail-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load order (${response.status}).`));
      }

      const value = isRecord(body) ? body.data ?? body.order ?? body : body;
      const order = parseOrder(value);

      if (!order) {
        throw new Error("The order response was not in the expected format.");
      }

      setSelectedOrder(order);
      setOrders((current) => current.map((item) => (item.id === order.id ? order : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load order.");
    } finally {
      setBusyAction("");
    }
  }

  async function patchOrderStatus(order: AdminOrder, nextStatus: string) {
    const response = await authenticatedFetch(`${ordersEndpoint}/${order.id}/status`, {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: nextStatus,
      }),
    });
    const body = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      throw new Error(getResponseMessage(body, `Unable to update order status (${response.status}).`));
    }

    const value = isRecord(body) ? body.order ?? body.data ?? body : body;
    const updatedOrder = parseOrder(value);

    return {
      message: getResponseMessage(body, "Order status updated successfully."),
      order: updatedOrder ?? { ...order, status: nextStatus },
    };
  }

  function applyUpdatedOrders(updatedOrders: AdminOrder[]) {
    setOrders((current) =>
      current.map((item) => updatedOrders.find((updatedOrder) => updatedOrder.id === item.id) ?? item),
    );
    setSelectedOrder((current) =>
      current ? updatedOrders.find((updatedOrder) => updatedOrder.id === current.id) ?? current : current,
    );
    setStatusEditorOrder((current) =>
      current ? updatedOrders.find((updatedOrder) => updatedOrder.id === current.id) ?? current : current,
    );
  }

  async function updateOrderStatus(order: AdminOrder, nextStatus: string) {
    if (!nextStatus || nextStatus === order.status) return;

    setBusyAction(`status-${order.id}`);
    setError("");
    setNotice("");

    try {
      const result = await patchOrderStatus(order, nextStatus);

      applyUpdatedOrders([result.order]);
      setNotice(result.message);
      setStatusEditorOrder(null);
      setStatusDraft("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update order status.");
    } finally {
      setBusyAction("");
    }
  }

  async function updateSelectedOrderStatuses() {
    if (!bulkStatus || selectedOrderIds.length === 0) return;

    const selectedOrders = orders.filter((order) => selectedOrderIdSet.has(order.id) && order.status !== bulkStatus);

    if (!selectedOrders.length) {
      setNotice("Selected orders already have that status.");
      return;
    }

    setBusyAction("bulk-status");
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/bulk/status`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderIds: selectedOrders.map((order) => order.id),
          status: bulkStatus,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to update selected orders (${response.status}).`));
      }

      const responseOrders = isRecord(body) ? body.orders ?? body.data ?? body.updatedOrders : undefined;
      const updatedOrders = Array.isArray(responseOrders)
        ? responseOrders.flatMap((item) => {
            const parsed = parseOrder(item);
            return parsed ? [parsed] : [];
          })
        : selectedOrders.map((order) => ({ ...order, status: bulkStatus }));

      applyUpdatedOrders(updatedOrders);
      setNotice(getResponseMessage(body, `${selectedOrders.length} order${selectedOrders.length === 1 ? "" : "s"} updated successfully.`));
      setSelectedOrderIds([]);
      setBulkStatus("");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update selected orders.");
    } finally {
      setBusyAction("");
    }
  }

  function toggleOrderSelection(orderId: string) {
    setSelectedOrderIds((current) =>
      current.includes(orderId)
        ? current.filter((selectedId) => selectedId !== orderId)
        : [...current, orderId],
    );
  }

  function toggleAllVisibleOrders() {
    setSelectedOrderIds((current) => {
      if (allVisibleOrdersSelected) {
        return current.filter((selectedId) => !visibleOrders.some((order) => order.id === selectedId));
      }

      return Array.from(new Set([...current, ...visibleOrders.map((order) => order.id)]));
    });
  }

  async function regenerateBankPaymentDetails(order: AdminOrder) {
    const email = order.customerEmail?.trim();

    if (!email) {
      setError("Customer email is required to regenerate bank payment details.");
      setNotice("");
      return;
    }

    setBusyAction(`payment-${order.id}`);
    setError("");
    setNotice("Regenerating bank payment details...");

    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/${order.id}/payment/retry`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to regenerate bank payment details (${response.status}).`));
      }

      const value = isRecord(body) ? body.order ?? body.data ?? body : body;
      const updatedOrder = parseOrder(value);

      if (updatedOrder) {
        applyUpdatedOrders([updatedOrder]);
      }

      const paymentDetails = parsePaymentRetryDetails(order.id, body);

      if (paymentDetails) {
        setPaymentRetryDetails(paymentDetails);
      }

      setNotice(getResponseMessage(body, "Bank payment details regenerated successfully. An email has been sent to the customer."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to regenerate bank payment details.");
      setNotice("");
    } finally {
      setBusyAction("");
    }
  }

  function resetFilters() {
    setPage(1);
    setLimit(50);
    setFrom(today);
    setTo(today);
    setStatus("");
    setPaymentStatus("");
    setUserId("");
    setUserSearch("");
    setOrderSearch("");
    setOrderSearchMode("customerEmail");
  }

  function selectUser(user: AdminUser) {
    setUserId(user.id);
    setUserSearch(user.email ? `${user.name} (${user.email})` : user.name);
    setPage(1);
  }

  async function exportOrders() {
    setBusyAction("export");
    setError("");

    const params = new URLSearchParams({
      format: exportFormat,
    });

    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    if (userId) params.set("userId", userId);

    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/export?${params}`);

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as unknown;
        throw new Error(getResponseMessage(body, `Unable to export orders (${response.status}).`));
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = /filename="?([^"]+)"?/i.exec(contentDisposition);
      const filename = filenameMatch?.[1] || `orders-${from || "all"}-${to || "all"}.${exportFormat}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = filename;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to export orders.");
    } finally {
      setBusyAction("");
    }
  }

  function submitOrderSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (orderSearchMode === "orderId" && orderSearch.trim()) {
      void loadOrderDetails(orderSearch.trim());
      return;
    }

    setPage(1);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Admin Orders</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Search, filter, and inspect every order across customers.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <OrderStatCard label="Total orders" value={String(orderStats.total)} />
        <OrderStatCard label="Pending" value={String(orderStats.pending)} tone="warning" />
        <OrderStatCard label="Completed/Delivered" value={String(orderStats.completed)} tone="success" />
        <OrderStatCard label="Total value" value={formatMoney(orderStats.revenue)} />
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <form className="mb-3 grid gap-3 md:grid-cols-[0.45fr_1fr_auto]" onSubmit={submitOrderSearch}>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={orderSearchMode}
            onChange={(event) => setOrderSearchMode(event.target.value as OrderSearchMode)}
          >
            {orderSearchOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder={`Search by ${formatLabel(orderSearchMode).toLowerCase()}...`}
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
            />
          </div>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-black px-4 text-sm font-black text-white transition hover:bg-[#f10606]"
            type="submit"
          >
            <Search size={17} />
            Search
          </button>
        </form>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          <input
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black/70 outline-none"
            type="date"
            value={from}
            onChange={(event) => {
              setFrom(event.target.value);
              setPage(1);
            }}
          />
          <input
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black/70 outline-none"
            type="date"
            value={to}
            onChange={(event) => {
              setTo(event.target.value);
              setPage(1);
            }}
          />
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {orderStatuses.map((item) => (
              <option key={item || "all"} value={item}>{item ? formatLabel(item) : "All statuses"}</option>
            ))}
          </select>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={paymentStatus}
            onChange={(event) => {
              setPaymentStatus(event.target.value);
              setPage(1);
            }}
          >
            {paymentStatuses.map((item) => (
              <option key={item || "all"} value={item}>{item ? formatLabel(item) : "All payments"}</option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Filter by user..."
              value={userSearch}
              onChange={(event) => {
                setUserSearch(event.target.value);
                setUserId("");
                setPage(1);
              }}
            />
            {userSearch && !userId && filteredUsers.length ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                {filteredUsers.map((user) => (
                  <button
                    className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]"
                    key={user.id}
                    type="button"
                    onClick={() => selectUser(user)}
                  >
                    <span className="block text-xs font-black text-black">{user.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">{user.email || user.id}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setPage(1);
            }}
          >
            {limitOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black uppercase text-black/70 outline-none"
            value={exportFormat}
            onChange={(event) => setExportFormat(event.target.value)}
          >
            {exportFormats.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
          <button
            className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/70 transition hover:text-[#f10606]"
            type="button"
            onClick={() => void loadOrders()}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
          <button
            className="flex h-12 min-w-0 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/70 transition hover:text-[#f10606] disabled:opacity-45"
            disabled={busyAction === "export"}
            type="button"
            onClick={() => void exportOrders()}
          >
            {busyAction === "export" ? <LoaderCircle className="animate-spin" size={17} /> : <Download size={17} />}
            Export
          </button>
          <button className="h-12 rounded-lg bg-[#f10606] px-4 text-sm font-black text-white" type="button" onClick={resetFilters}>
            Reset
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">{error}</p>
      ) : null}

      {notice ? (
        <p className={`rounded-xl px-3 py-2.5 text-xs font-bold ${busyAction.startsWith("payment-") ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
          {busyAction.startsWith("payment-") ? (
            <span className="inline-flex items-center gap-2">
              <LoaderCircle className="animate-spin" size={14} />
              {notice}
            </span>
          ) : (
            notice
          )}
        </p>
      ) : null}

      {selectedOrderIds.length ? (
        <section className="flex flex-col gap-3 rounded-xl border border-[#f10606]/15 bg-[#fff5f5] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)] md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-black text-black">
            {selectedOrderIds.length} order{selectedOrderIds.length === 1 ? "" : "s"} selected
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
            <select
              className="h-11 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
              value={bulkStatus}
              onChange={(event) => setBulkStatus(event.target.value)}
            >
              <option value="">Select status</option>
              {editableOrderStatuses.map((item) => (
                <option key={item} value={item}>{formatLabel(item)}</option>
              ))}
            </select>
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!bulkStatus || busyAction === "bulk-status"}
              type="button"
              onClick={() => void updateSelectedOrderStatuses()}
            >
              {busyAction === "bulk-status" ? <LoaderCircle className="animate-spin" size={16} /> : <PencilLine size={16} />}
              Update Status
            </button>
            <button
              className="h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-black text-black/55 transition hover:text-[#f10606]"
              type="button"
              onClick={() => {
                setSelectedOrderIds([]);
                setBulkStatus("");
              }}
            >
              Clear
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[0.18fr_1fr_1fr_0.65fr_0.65fr_0.65fr_0.6fr_0.6fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <label className="flex items-center" aria-label="Select all visible orders">
            <input
              className="h-4 w-4 accent-[#f10606]"
              checked={allVisibleOrdersSelected}
              type="checkbox"
              onChange={toggleAllVisibleOrders}
            />
          </label>
          <span>Order</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Payment</span>
          <span>Total</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => (
              <div className="h-16 animate-pulse rounded-lg bg-black/[0.04]" key={item} />
            ))}
          </div>
        ) : visibleOrders.length ? (
          visibleOrders.map((order) => (
            <article
              className="grid grid-cols-[0.18fr_1fr_1fr_0.65fr_0.65fr_0.65fr_0.6fr_0.6fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
              key={order.id}
            >
              <label className="flex items-center" aria-label={`Select order ${order.id}`}>
                <input
                  className="h-4 w-4 accent-[#f10606]"
                  checked={selectedOrderIdSet.has(order.id)}
                  type="checkbox"
                  onChange={() => toggleOrderSelection(order.id)}
                />
              </label>
              <div className="min-w-0">
                <p className="truncate font-black text-black">#{order.id}</p>
                <p className="mt-1 truncate text-xs font-medium text-black/50">{order.items.length} item{order.items.length === 1 ? "" : "s"}</p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-black/75">{order.customerName}</p>
                <p className="mt-1 truncate text-xs font-medium text-black/45">{order.customerEmail || order.userId || "No user ID"}</p>
              </div>
              <StatusPill value={order.status} />
              <StatusPill value={order.paymentStatus} />
              <p className="font-black text-black">{formatMoney(order.total)}</p>
              <p className="text-xs font-bold text-black/45">{formatDate(order.createdAt)}</p>
              <div className="flex justify-end gap-2">
                <button
                  aria-label={`Change status for order ${order.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => {
                    setStatusEditorOrder(order);
                    setStatusDraft(order.status);
                  }}
                >
                  {busyAction === `status-${order.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <PencilLine size={16} />}
                </button>
                <button
                  aria-label={`Regenerate bank payment details for order ${order.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  disabled={busyAction === `payment-${order.id}`}
                  type="button"
                  onClick={() => void regenerateBankPaymentDetails(order)}
                >
                  {busyAction === `payment-${order.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <CreditCard size={16} />}
                </button>
                <button
                  aria-label={`View order ${order.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => void loadOrderDetails(order.id)}
                >
                  {busyAction === `detail-${order.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Eye size={16} />}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="p-8 text-center">
            <PackageCheck className="mx-auto text-[#f10606]" size={26} />
            <p className="mt-3 text-sm font-black text-black">No orders found</p>
            <p className="mt-1 text-xs font-medium text-black/48">Adjust filters and try again.</p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={page <= 1 || isLoading}
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
        >
          <ChevronLeft size={15} />
          Previous
        </button>
        <p className="text-xs font-black text-black/42">
          Page {pagination.page}
          {pagination.totalPages ? ` of ${pagination.totalPages}` : ""}
        </p>
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={isLoading || (pagination.totalPages !== undefined ? page >= pagination.totalPages : orders.length < limit)}
          type="button"
          onClick={() => setPage((current) => current + 1)}
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>

      {selectedOrder ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedOrder(null);
          }}
        >
          <section className="max-h-[90dvh] w-full max-w-3xl overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]" role="dialog" aria-modal="true">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#f10606]">Order detail</p>
                <h2 className="mt-1 text-xl font-black text-black">#{selectedOrder.id}</h2>
                <p className="mt-1 text-xs font-bold text-black/42">{formatDate(selectedOrder.createdAt)}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  aria-label={`Change status for order ${selectedOrder.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => {
                    setStatusEditorOrder(selectedOrder);
                    setStatusDraft(selectedOrder.status);
                  }}
                >
                  <PencilLine size={16} />
                </button>
                <button
                  aria-label={`Regenerate bank payment details for order ${selectedOrder.id}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  disabled={busyAction === `payment-${selectedOrder.id}`}
                  type="button"
                  onClick={() => void regenerateBankPaymentDetails(selectedOrder)}
                >
                  {busyAction === `payment-${selectedOrder.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <CreditCard size={16} />}
                </button>
                <button className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={() => setSelectedOrder(null)}>
                  <X size={18} />
                </button>
              </div>
            </header>

            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <div className="rounded-lg bg-white p-3">
                <label className="text-[10px] font-black uppercase text-black/42" htmlFor="admin-order-status">
                  Status
                </label>
                <select
                  className="mt-1 h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black outline-none transition focus:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busyAction === `status-${selectedOrder.id}`}
                  id="admin-order-status"
                  value={selectedOrder.status}
                  onChange={(event) => void updateOrderStatus(selectedOrder, event.target.value)}
                >
                  {editableOrderStatuses.map((item) => (
                    <option key={item} value={item}>{formatLabel(item)}</option>
                  ))}
                </select>
                {busyAction === `status-${selectedOrder.id}` ? (
                  <p className="mt-2 flex items-center gap-1.5 text-[10px] font-black text-[#f10606]">
                    <LoaderCircle className="animate-spin" size={12} />
                    Updating
                  </p>
                ) : null}
              </div>
              <DetailMetric label="Payment" value={formatLabel(selectedOrder.paymentStatus)} />
              <DetailMetric label="Subtotal" value={formatMoney(selectedOrder.subtotal)} />
              <DetailMetric label="Total" value={formatMoney(selectedOrder.total)} />
            </div>

            <section className="mt-5 rounded-xl border border-black/10 bg-[#fafafa] p-4">
              <h3 className="text-sm font-black text-black">Customer</h3>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <DetailMetric label="Name" value={selectedOrder.customerName} />
                <DetailMetric label="Email/User ID" value={selectedOrder.customerEmail || selectedOrder.userId || "Not provided"} />
                <DetailMetric label="Recipient" value={selectedOrder.deliveryRecipientName || "Not provided"} />
                <DetailMetric label="Phone" value={selectedOrder.deliveryPhoneNumber || "Not provided"} />
              </div>
              <p className="mt-3 text-sm font-medium leading-6 text-black/62">
                {selectedOrder.deliveryAddress || "No delivery address provided."}
              </p>
            </section>

            <section className="mt-5 rounded-xl border border-black/10 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-black text-black">Bank transfer details</h3>
                <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-[10px] font-black text-[#f10606]">
                  Paystack
                </span>
              </div>
              <div className="mt-3 space-y-3">
                {selectedOrder.paystackBankTransferAccounts.length ? selectedOrder.paystackBankTransferAccounts.map((account) => (
                  <article className="rounded-xl bg-[#fafafa] p-4" key={account.id}>
                    <div className="grid gap-3 md:grid-cols-3">
                      <DetailMetric label="Bank" value={account.bankName || "Not provided"} />
                      <DetailMetric label="Account Name" value={account.accountName || "Not provided"} />
                      <DetailMetric label="Account Number" value={account.accountNumber || "Not provided"} />
                      <DetailMetric label="Amount" value={formatMoney(account.amount)} />
                      <DetailMetric label="Status" value={formatLabel(account.status)} />
                      <DetailMetric label="Expires" value={formatDate(account.accountExpiresAt)} />
                    </div>
                    {account.providerReference ? (
                      <div className="mt-3 rounded-lg bg-white p-3">
                        <p className="text-[10px] font-black uppercase text-black/42">Provider Reference</p>
                        <p className="mt-1 break-all text-xs font-black text-black">{account.providerReference}</p>
                      </div>
                    ) : null}
                  </article>
                )) : (
                  <p className="rounded-lg bg-[#fafafa] p-3 text-xs font-bold text-black/45">
                    No bank transfer account has been returned for this order.
                  </p>
                )}
              </div>
            </section>

            <section className="mt-5 rounded-xl border border-black/10 bg-white p-4">
              <h3 className="text-sm font-black text-black">Items</h3>
              <div className="mt-3 space-y-2">
                {selectedOrder.items.length ? selectedOrder.items.map((item) => (
                  <article className="grid grid-cols-[1fr_0.4fr_0.5fr_0.5fr] gap-3 rounded-lg bg-[#fafafa] p-3 text-sm" key={item.id}>
                    <p className="font-black text-black">{item.productName}</p>
                    <p className="font-bold text-black/60">{item.quantity} {item.unit}</p>
                    <p className="font-bold text-black/60">{formatMoney(item.unitPrice)}</p>
                    <p className="text-right font-black text-black">{formatMoney(item.totalPrice)}</p>
                  </article>
                )) : (
                  <p className="rounded-lg bg-[#fafafa] p-3 text-xs font-bold text-black/45">No items returned for this order.</p>
                )}
              </div>
            </section>

            {selectedOrder.note ? (
              <section className="mt-5 rounded-xl bg-[#fafafa] p-4">
                <p className="text-xs font-black uppercase text-black/42">Note</p>
                <p className="mt-2 text-sm font-medium leading-6 text-black/62">{selectedOrder.note}</p>
              </section>
            ) : null}
          </section>
        </div>
      ) : null}

      {statusEditorOrder ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setStatusEditorOrder(null);
              setStatusDraft("");
            }
          }}
        >
          <section className="w-full max-w-md rounded-t-[1.25rem] bg-white p-5 shadow-2xl sm:rounded-[1.25rem]" role="dialog" aria-modal="true">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#f10606]">Change order status</p>
                <h2 className="mt-1 text-lg font-black text-black">#{statusEditorOrder.id}</h2>
                <p className="mt-1 text-xs font-bold text-black/45">
                  Current status: {formatLabel(statusEditorOrder.status)}
                </p>
              </div>
              <button
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                type="button"
                onClick={() => {
                  setStatusEditorOrder(null);
                  setStatusDraft("");
                }}
              >
                <X size={18} />
              </button>
            </header>

            <label className="mt-5 block">
              <span className="text-xs font-black uppercase text-black/45">Order Status</span>
              <select
                className="mt-2 h-12 w-full rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none focus:border-[#f10606]/40"
                value={statusDraft}
                onChange={(event) => setStatusDraft(event.target.value)}
              >
                {editableOrderStatuses.map((item) => (
                  <option key={item} value={item}>{formatLabel(item)}</option>
                ))}
              </select>
            </label>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={!statusDraft || statusDraft === statusEditorOrder.status || busyAction === `status-${statusEditorOrder.id}`}
                type="button"
                onClick={() => void updateOrderStatus(statusEditorOrder, statusDraft)}
              >
                {busyAction === `status-${statusEditorOrder.id}` ? <LoaderCircle className="animate-spin" size={16} /> : <PencilLine size={16} />}
                Submit
              </button>
              <button
                className="h-12 rounded-lg border border-black/10 text-sm font-black text-black/55 transition hover:text-[#f10606]"
                type="button"
                onClick={() => {
                  setStatusEditorOrder(null);
                  setStatusDraft("");
                }}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {paymentRetryDetails ? (
        <div
          className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPaymentRetryDetails(null);
          }}
        >
          <section className="w-full max-w-lg rounded-t-[1.25rem] bg-white p-5 shadow-2xl sm:rounded-[1.25rem]" role="dialog" aria-modal="true">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#f10606]">New bank details</p>
                <h2 className="mt-1 text-lg font-black text-black">#{paymentRetryDetails.orderId}</h2>
                <p className="mt-1 text-xs font-bold text-black/45">An email has also been sent to the customer.</p>
              </div>
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={() => setPaymentRetryDetails(null)}>
                <X size={18} />
              </button>
            </header>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailMetric label="Bank" value={paymentRetryDetails.bankName || "Not provided"} />
              <DetailMetric label="Account Name" value={paymentRetryDetails.accountName || "Not provided"} />
              <DetailMetric label="Account Number" value={paymentRetryDetails.accountNumber || "Not provided"} />
              <DetailMetric label="Amount" value={formatPaymentAmount(paymentRetryDetails.amount, paymentRetryDetails.currency)} />
              <DetailMetric label="Status" value={formatLabel(paymentRetryDetails.status)} />
              <DetailMetric label="Payment Action" value={paymentRetryDetails.paymentAction ? formatLabel(paymentRetryDetails.paymentAction) : "None"} />
            </div>

            <section className="mt-4 rounded-xl bg-[#fafafa] p-4">
              <p className="text-[10px] font-black uppercase text-black/42">Reference</p>
              <p className="mt-2 break-all text-sm font-black text-black">{paymentRetryDetails.reference}</p>
              {paymentRetryDetails.displayText ? (
                <p className="mt-3 text-sm font-medium leading-6 text-black/62">{paymentRetryDetails.displayText}</p>
              ) : null}
            </section>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const isPositive = normalized === "paid" || normalized === "delivered" || normalized === "completed";
  const isWarning = normalized === "processing" || normalized === "pending" || normalized === "confirmed";

  return (
    <span
      className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${
        isPositive
          ? "bg-emerald-50 text-emerald-700"
          : isWarning
            ? "bg-amber-50 text-amber-700"
            : "bg-[#fff0f0] text-[#f10606]"
      }`}
    >
      {formatLabel(value)}
    </span>
  );
}

function OrderStatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "bg-amber-50 text-amber-700"
        : "bg-[#fff0f0] text-[#f10606]";

  return (
    <article className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <p className="text-[10px] font-black uppercase text-black/42">{label}</p>
      <p className="mt-2 text-2xl font-black tracking-normal text-black">{value}</p>
      <span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${toneClass}`}>
        Current filter
      </span>
    </article>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[10px] font-black uppercase text-black/42">{label}</p>
      <p className="mt-1 text-sm font-black text-black">{value}</p>
    </div>
  );
}

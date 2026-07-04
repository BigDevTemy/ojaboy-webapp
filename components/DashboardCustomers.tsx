"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Eye,
  LoaderCircle,
  MessageSquareText,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Star,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, ORDERS_URL, USERS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type Customer = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  orderCount: number;
  createdAt?: string;
  updatedAt?: string;
};

type OrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice?: number;
  totalPrice?: number;
};

type Payment = {
  id: string;
  status: string;
  amount?: number;
  currency?: string;
  method?: string;
  reference?: string;
  paidAt?: string;
  createdAt?: string;
};

type Feedback = {
  rating?: number;
  comment?: string;
  createdAt?: string;
};

type Order = {
  id: string;
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
  items: OrderItem[];
  payments: Payment[];
  feedback: Feedback | null;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const usersEndpoint = `${API_BASE_URL}${USERS_URL}`;
const ordersEndpoint = `${API_BASE_URL}${ORDERS_URL}`;
const emptyPagination: Pagination = { page: 1, limit: 20, total: 0, totalPages: 0 };

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
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseCustomer(value: unknown): Customer | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const email = readText(value, ["email"]);
  if (!id || !email) return null;
  return {
    id,
    email,
    fullName: readText(value, ["fullName", "name"]) || "Unnamed customer",
    role: readText(value, ["role"]) || "user",
    orderCount: readNumber(value, ["orderCount"]) ?? 0,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseCustomers(body: unknown): Customer[] {
  const value = isRecord(body) ? body.data ?? body.users ?? body.results ?? body : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const parsed = parseCustomer(item);
    return parsed ? [parsed] : [];
  });
}

function parsePagination(body: unknown): Pagination {
  const pagination = isRecord(body) && isRecord(body.pagination) ? body.pagination : {};
  return {
    page: readNumber(pagination, ["page"]) ?? 1,
    limit: readNumber(pagination, ["limit"]) ?? 20,
    total: readNumber(pagination, ["total"]) ?? 0,
    totalPages: readNumber(pagination, ["totalPages"]) ?? 0,
  };
}

function parseOrderItem(value: unknown, index: number): OrderItem | null {
  if (!isRecord(value)) return null;
  const product = isRecord(value.product) ? value.product : null;
  const buyPrice = isRecord(value.buyPrice) ? value.buyPrice : null;
  return {
    id: readText(value, ["id"]) || `item-${index}`,
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

function parsePayment(value: unknown, index: number): Payment | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]) || `payment-${index}`;
  return {
    id,
    status: readText(value, ["status"]) || "unknown",
    amount: readNumber(value, ["amount"]),
    currency: readText(value, ["currency"]) || undefined,
    method: readText(value, ["method", "channel", "provider", "paymentMethod"]) || undefined,
    reference: readText(value, ["reference", "providerReference"]) || undefined,
    paidAt: readText(value, ["paidAt"]) || undefined,
    createdAt: readText(value, ["createdAt"]) || undefined,
  };
}

function parseFeedback(value: unknown): Feedback | null {
  const record = Array.isArray(value) ? value.find(isRecord) : isRecord(value) ? value : null;
  if (!record) return null;
  const rating = readNumber(record, ["rating", "score"]);
  const comment = readText(record, ["comment", "message", "note"]);
  if (rating === undefined && !comment) return null;
  return {
    rating,
    comment: comment || undefined,
    createdAt: readText(record, ["createdAt"]) || undefined,
  };
}

function parseOrder(value: unknown): Order | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const status = readText(value, ["status"]);
  if (!id || !status) return null;
  const address = isRecord(value.address) ? value.address : null;
  const items = Array.isArray(value.items)
    ? value.items.flatMap((item, index) => {
        const parsed = parseOrderItem(item, index);
        return parsed ? [parsed] : [];
      })
    : [];
  const payments = Array.isArray(value.payments)
    ? value.payments.flatMap((item, index) => {
        const parsed = parsePayment(item, index);
        return parsed ? [parsed] : [];
      })
    : [];

  return {
    id,
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
    payments,
    feedback: parseFeedback(value.feedback),
  };
}

function parseOrders(body: unknown): Order[] {
  const value = isRecord(body) ? body.orders ?? body.data ?? body.results ?? body : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const parsed = parseOrder(item);
    return parsed ? [parsed] : [];
  });
}

function formatMoney(value?: number) {
  if (value === undefined) return "Pending";
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(value: string) {
  const normalized = value.toLowerCase();
  if (["delivered", "completed", "paid", "success", "successful"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-700";
  }
  if (["cancelled", "canceled", "failed"].includes(normalized)) {
    return "bg-red-50 text-red-700";
  }
  return "bg-amber-50 text-amber-700";
}

export function DashboardCustomers() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [pagination, setPagination] = useState<Pagination>(emptyPagination);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  const [ordersPagination, setOrdersPagination] = useState<Pagination>(emptyPagination);
  const [isOrdersLoading, setIsOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isOrderDetailLoading, setIsOrderDetailLoading] = useState(false);
  const [orderDetailError, setOrderDetailError] = useState("");

  const loadCustomers = useCallback(async (page = 1) => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`${usersEndpoint}?role=user&page=${page}&limit=20`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load customers (${response.status}).`));
      }
      setCustomers(parseCustomers(body));
      setPagination(parsePagination(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load customers.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCustomers(1), 0);
    return () => clearTimeout(timer);
  }, [loadCustomers]);

  const filteredCustomers = customers.filter((customer) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return `${customer.fullName} ${customer.email}`.toLowerCase().includes(query);
  });

  const selectedCustomerIdSet = useMemo(() => new Set(selectedCustomerIds), [selectedCustomerIds]);
  const allVisibleCustomersSelected =
    filteredCustomers.length > 0 && filteredCustomers.every((customer) => selectedCustomerIdSet.has(customer.id));

  function toggleCustomerSelection(id: string) {
    setSelectedCustomerIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  function toggleAllVisibleCustomers() {
    setSelectedCustomerIds((current) => {
      if (allVisibleCustomersSelected) {
        return current.filter((selectedId) => !filteredCustomers.some((customer) => customer.id === selectedId));
      }
      return Array.from(new Set([...current, ...filteredCustomers.map((customer) => customer.id)]));
    });
  }

  async function copySelectedCustomerIds() {
    const ids = selectedCustomerIds.join(", ");
    try {
      await navigator.clipboard.writeText(ids);
      setNotice(`Copied ${selectedCustomerIds.length} user ID${selectedCustomerIds.length === 1 ? "" : "s"} to clipboard.`);
      setError("");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Unable to copy to clipboard. Copy permission may be blocked.");
    }
  }

  const loadCustomerOrders = useCallback(async (userId: string, page = 1) => {
    setIsOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/user/${userId}?page=${page}&limit=20`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load customer orders (${response.status}).`));
      }
      setCustomerOrders(parseOrders(body));
      setOrdersPagination(parsePagination(body));
    } catch (requestError) {
      setOrdersError(requestError instanceof Error ? requestError.message : "Unable to load customer orders.");
    } finally {
      setIsOrdersLoading(false);
    }
  }, []);

  function openCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerOrders([]);
    setOrdersPagination(emptyPagination);
    setOrdersError("");
    void loadCustomerOrders(customer.id, 1);
  }

  async function openOrderDetail(orderId: string) {
    setIsOrderDetailLoading(true);
    setOrderDetailError("");
    try {
      const response = await authenticatedFetch(`${ordersEndpoint}/${orderId}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load order (${response.status}).`));
      }
      const value = isRecord(body) ? body.order ?? body.data ?? body : body;
      const order = parseOrder(value);
      if (!order) throw new Error("The order response was not in the expected format.");
      setSelectedOrder(order);
    } catch (requestError) {
      setOrderDetailError(requestError instanceof Error ? requestError.message : "Unable to load order.");
    } finally {
      setIsOrderDetailLoading(false);
    }
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <Users className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Customers are restricted</h1>
        <p className="mt-2 text-sm font-medium text-black/50">
          This page is available only in the non-customer dashboard.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Customers</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Browse customers and drill down into their order history.
          </p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Total customers" value={pagination.total} />
        <Metric label="On this page" value={customers.length} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40" placeholder="Search this page by name or email..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadCustomers(pagination.page)}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      {selectedCustomerIds.length ? (
        <section className="flex flex-col gap-3 rounded-xl border border-[#f10606]/15 bg-[#fff5f5] p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)] sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-black text-black">
            {selectedCustomerIds.length} customer{selectedCustomerIds.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-2">
            <button
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-4 text-sm font-black text-white"
              type="button"
              onClick={() => void copySelectedCustomerIds()}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy user IDs"}
            </button>
            <button
              className="h-11 rounded-lg border border-black/10 bg-white px-4 text-sm font-black text-black/55 transition hover:text-[#f10606]"
              type="button"
              onClick={() => setSelectedCustomerIds([])}
            >
              Clear
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[0.2fr_1.2fr_1fr_0.6fr_0.7fr_0.5fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <label className="flex items-center" aria-label="Select all visible customers">
            <input
              className="h-4 w-4 accent-[#f10606]"
              checked={allVisibleCustomersSelected}
              type="checkbox"
              onChange={toggleAllVisibleCustomers}
            />
          </label>
          <span>Customer</span><span>Email</span><span>Orders</span><span>Joined</span><span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
        ) : filteredCustomers.length ? (
          filteredCustomers.map((customer) => (
            <article className="grid grid-cols-[0.2fr_1.2fr_1fr_0.6fr_0.7fr_0.5fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={customer.id}>
              <label className="flex items-center" aria-label={`Select ${customer.fullName}`}>
                <input
                  className="h-4 w-4 accent-[#f10606]"
                  checked={selectedCustomerIdSet.has(customer.id)}
                  type="checkbox"
                  onChange={() => toggleCustomerSelection(customer.id)}
                />
              </label>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-black">{customer.fullName}</p>
                <p className="mt-1 truncate text-[10px] font-bold text-black/40">{customer.id}</p>
              </div>
              <p className="truncate text-xs font-bold text-black/55">{customer.email}</p>
              <p className="text-xs font-black text-black">{customer.orderCount}</p>
              <p className="text-xs font-bold text-black/45">{formatDate(customer.createdAt)}</p>
              <div className="flex justify-end">
                <ActionButton label={`View ${customer.fullName}`} onClick={() => openCustomer(customer)}><Eye size={15} /></ActionButton>
              </div>
            </article>
          ))
        ) : (
          <div className="p-9 text-center"><Users className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black text-black">No customers found</p></div>
        )}
      </section>

      {pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white px-4 py-3">
          <p className="text-xs font-bold text-black/50">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</p>
          <div className="flex gap-2">
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={pagination.page <= 1 || isLoading} type="button" onClick={() => void loadCustomers(pagination.page - 1)}><ChevronLeft size={16} /></button>
            <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={pagination.page >= pagination.totalPages || isLoading} type="button" onClick={() => void loadCustomers(pagination.page + 1)}><ChevronRight size={16} /></button>
          </div>
        </div>
      ) : null}

      {selectedCustomer ? (
        <Modal
          title={selectedCustomer.fullName}
          subtitle="Customer"
          wide
          onClose={() => {
            setSelectedCustomer(null);
            setCustomerOrders([]);
          }}
        >
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              <Detail label="Email" value={selectedCustomer.email} />
              <Detail label="Role" value={formatLabel(selectedCustomer.role)} />
              <Detail label="Joined" value={formatDate(selectedCustomer.createdAt)} />
            </div>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-black">Order history</h3>
                <span className="rounded-full bg-[#fff0f0] px-3 py-1 text-[10px] font-black text-[#f10606]">
                  {ordersPagination.total || customerOrders.length}
                </span>
              </div>

              {ordersError ? <p className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{ordersError}</p> : null}

              <div className="overflow-hidden rounded-xl border border-black/10">
                <div className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.5fr] gap-3 bg-[#fafafa] px-4 py-3 text-[10px] font-black uppercase text-black/45">
                  <span>Order</span><span>Status</span><span>Payment</span><span>Total</span><span className="text-right">Actions</span>
                </div>
                {isOrdersLoading ? (
                  <div className="space-y-2 p-4">{[0, 1].map((item) => <div className="h-12 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
                ) : customerOrders.length ? (
                  customerOrders.map((order) => (
                    <article className="grid grid-cols-[1fr_0.7fr_0.7fr_0.7fr_0.5fr] items-center gap-3 border-t border-black/10 px-4 py-3 text-xs" key={order.id}>
                      <div className="min-w-0">
                        <p className="truncate font-black text-black">#{order.id.slice(0, 8)}</p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-black/40">{formatDate(order.createdAt)}</p>
                      </div>
                      <span className={`w-max rounded-full px-2.5 py-1 text-[10px] font-black ${statusTone(order.status)}`}>{formatLabel(order.status)}</span>
                      <span className={`w-max rounded-full px-2.5 py-1 text-[10px] font-black ${statusTone(order.paymentStatus)}`}>{formatLabel(order.paymentStatus)}</span>
                      <p className="font-black text-black">{formatMoney(order.total)}</p>
                      <div className="flex justify-end">
                        <ActionButton label={`View order ${order.id}`} busy={isOrderDetailLoading} onClick={() => void openOrderDetail(order.id)}><Eye size={14} /></ActionButton>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="p-6 text-center"><PackageCheck className="mx-auto text-[#f10606]" size={22} /><p className="mt-2 text-xs font-black text-black">No orders yet</p></div>
                )}
              </div>

              {ordersPagination.totalPages > 1 ? (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[10px] font-bold text-black/45">Page {ordersPagination.page} of {ordersPagination.totalPages}</p>
                  <div className="flex gap-2">
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={ordersPagination.page <= 1 || isOrdersLoading} type="button" onClick={() => void loadCustomerOrders(selectedCustomer.id, ordersPagination.page - 1)}><ChevronLeft size={14} /></button>
                    <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/10 text-black/60 disabled:opacity-40" disabled={ordersPagination.page >= ordersPagination.totalPages || isOrdersLoading} type="button" onClick={() => void loadCustomerOrders(selectedCustomer.id, ordersPagination.page + 1)}><ChevronRight size={14} /></button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        </Modal>
      ) : null}

      {selectedOrder || isOrderDetailLoading ? (
        <Modal title={selectedOrder ? `Order #${selectedOrder.id.slice(0, 8)}` : "Loading order..."} subtitle="Order detail" onClose={() => setSelectedOrder(null)}>
          {orderDetailError ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{orderDetailError}</p> : null}
          {!selectedOrder ? (
            <div className="flex items-center justify-center py-10"><LoaderCircle className="animate-spin text-[#f10606]" size={26} /></div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-4">
                <Detail label="Status" value={formatLabel(selectedOrder.status)} />
                <Detail label="Payment" value={formatLabel(selectedOrder.paymentStatus)} />
                <Detail label="Subtotal" value={formatMoney(selectedOrder.subtotal)} />
                <Detail label="Total" value={formatMoney(selectedOrder.total)} />
              </div>

              <section className="rounded-xl border border-black/10 bg-[#fafafa] p-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-black"><ShoppingBag size={15} /> Delivery</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Detail label="Recipient" value={selectedOrder.deliveryRecipientName || "Not provided"} />
                  <Detail label="Phone" value={selectedOrder.deliveryPhoneNumber || "Not provided"} />
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-black/62">{selectedOrder.deliveryAddress || "No delivery address provided."}</p>
              </section>

              <section className="rounded-xl border border-black/10 bg-white p-4">
                <h3 className="text-sm font-black text-black">Items</h3>
                <div className="mt-3 space-y-2">
                  {selectedOrder.items.length ? selectedOrder.items.map((item) => (
                    <article className="grid grid-cols-[1fr_0.4fr_0.5fr_0.5fr] gap-3 rounded-lg bg-[#fafafa] p-3 text-sm" key={item.id}>
                      <p className="font-black text-black">{item.productName}</p>
                      <p className="font-bold text-black/60">{item.quantity} {item.unit}</p>
                      <p className="font-bold text-black/60">{formatMoney(item.unitPrice)}</p>
                      <p className="text-right font-black text-black">{formatMoney(item.totalPrice)}</p>
                    </article>
                  )) : <p className="rounded-lg bg-[#fafafa] p-3 text-xs font-bold text-black/45">No items returned for this order.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-black/10 bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-black"><Wallet size={15} /> Payments</h3>
                <div className="mt-3 space-y-2">
                  {selectedOrder.payments.length ? selectedOrder.payments.map((payment) => (
                    <article className="grid grid-cols-[0.8fr_0.8fr_1fr_0.7fr] items-center gap-3 rounded-lg bg-[#fafafa] p-3 text-xs" key={payment.id}>
                      <span className={`w-max rounded-full px-2.5 py-1 font-black ${statusTone(payment.status)}`}>{formatLabel(payment.status)}</span>
                      <p className="font-bold text-black/70">{payment.method ? formatLabel(payment.method) : "Not provided"}</p>
                      <p className="truncate font-bold text-black/50">{payment.reference || "No reference"}</p>
                      <p className="text-right font-black text-black">{formatMoney(payment.amount)}</p>
                    </article>
                  )) : <p className="rounded-lg bg-[#fafafa] p-3 text-xs font-bold text-black/45">No payment records for this order.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-black/10 bg-white p-4">
                <h3 className="flex items-center gap-2 text-sm font-black text-black"><MessageSquareText size={15} /> Feedback</h3>
                {selectedOrder.feedback ? (
                  <div className="mt-3 rounded-lg bg-[#fafafa] p-3">
                    {selectedOrder.feedback.rating !== undefined ? (
                      <div className="flex items-center gap-1 text-amber-500">
                        {Array.from({ length: 5 }, (_, index) => (
                          <Star fill={index < Math.round(selectedOrder.feedback!.rating!) ? "currentColor" : "none"} key={index} size={14} />
                        ))}
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm font-medium leading-6 text-black/62">{selectedOrder.feedback.comment || "No comment provided."}</p>
                  </div>
                ) : (
                  <p className="mt-3 rounded-lg bg-[#fafafa] p-3 text-xs font-bold text-black/45">No feedback submitted for this order.</p>
                )}
              </section>

              {selectedOrder.note ? (
                <section className="rounded-xl bg-[#fafafa] p-4">
                  <p className="text-xs font-black uppercase text-black/42">Note</p>
                  <p className="mt-2 text-sm font-medium leading-6 text-black/62">{selectedOrder.note}</p>
                </section>
              ) : null}
            </div>
          )}
        </Modal>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <p className="text-xs font-black uppercase text-black/45">{label}</p>
      <p className="mt-2 text-2xl font-black text-black">{value}</p>
    </section>
  );
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>
      {busy ? <LoaderCircle className="animate-spin" size={15} /> : children}
    </button>
  );
}

function Modal({
  title,
  subtitle,
  wide,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className={`max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${wide ? "max-w-3xl" : "max-w-2xl"}`} role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#f10606]">{subtitle || "Details"}</p>
            <h2 className="mt-1 text-lg font-black text-black">{title}</h2>
          </div>
          <button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={onClose}><X size={18} /></button>
        </header>
        {children}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-4">
      <p className="text-[10px] font-black uppercase text-black/40">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-black/70">{value}</p>
    </div>
  );
}

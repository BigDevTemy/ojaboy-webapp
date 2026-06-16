"use client";

import { API_BASE_URL, PRICE_ALERTS_URL, PRODUCTS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  Bell,
  CheckCircle2,
  Edit3,
  Heart,
  LoaderCircle,
  Plus,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";

type AlertCondition = "below" | "above" | "at_or_below" | "at_or_above";
type AlertFrequency = "one_time" | "once_per_day" | "once_per_week" | "every_price_change";
type AlertStatus = "active" | "paused" | "triggered" | "cancelled" | string;

type PriceAlert = {
  id: string;
  productId: string;
  productName: string;
  targetPrice: number;
  unit: string;
  condition: AlertCondition | string;
  currency: string;
  frequency: AlertFrequency | string;
  status: AlertStatus;
  currentPrice?: number;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  availableUnits: {
    unit: string;
    currentPrice?: number;
    currency?: string;
  }[];
};

type AlertFormState = {
  productId: string;
  productSearch: string;
  targetPrice: string;
  unit: string;
  condition: AlertCondition;
  currency: string;
  frequency: AlertFrequency;
  status: AlertStatus;
};

const priceAlertsEndpoint = `${API_BASE_URL}${PRICE_ALERTS_URL}`;
const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;
const conditions: AlertCondition[] = ["below", "above", "at_or_below", "at_or_above"];
const frequencies: AlertFrequency[] = [
  "one_time",
  "once_per_day",
  "once_per_week",
  "every_price_change",
];
const statuses: AlertStatus[] = ["active", "paused", "triggered", "cancelled"];

function createEmptyForm(): AlertFormState {
  return {
    productId: "",
    productSearch: "",
    targetPrice: "",
    unit: "bag",
    condition: "at_or_below",
    currency: "NGN",
    frequency: "one_time",
    status: "active",
  };
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

function parseProductOption(value: unknown): ProductOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const name = readText(value, ["name", "title"]);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    sku: readText(value, ["sku"]) || undefined,
    category: readText(value, ["category"]) || undefined,
    availableUnits: Array.isArray(value.availableUnits)
      ? value.availableUnits.flatMap((unitValue): ProductOption["availableUnits"] => {
          if (!isRecord(unitValue)) {
            return [];
          }

          const unit = readText(unitValue, ["unit"]);
          return unit
            ? [{
                unit,
                currentPrice: readNumber(unitValue, ["currentPrice"]),
                currency: readText(unitValue, ["currency"]) || undefined,
              }]
            : [];
        })
      : [],
  };
}

function parsePriceAlert(value: unknown): PriceAlert | null {
  if (!isRecord(value)) {
    return null;
  }

  const product = isRecord(value.product) ? value.product : null;
  const id = readText(value, ["id"]);
  const productId = readText(value, ["productId"]) || (product ? readText(product, ["id"]) : "");
  const targetPrice = readNumber(value, ["targetPrice", "target_price"]);

  if (!id || !productId || targetPrice === undefined) {
    return null;
  }

  return {
    id,
    productId,
    productName:
      (product ? readText(product, ["name", "title"]) : "") ||
      readText(value, ["productName"]) ||
      "Product",
    targetPrice,
    unit: readText(value, ["unit"]) || "unit",
    condition: readText(value, ["condition"]) || "at_or_below",
    currency: readText(value, ["currency"]) || "NGN",
    frequency: readText(value, ["frequency"]) || "one_time",
    status: readText(value, ["status"]) || "active",
    currentPrice: readNumber(value, ["currentPrice", "current_price"]),
  };
}

function parsePriceAlerts(body: unknown) {
  const value = isRecord(body)
    ? body.data ?? body.alerts ?? body.priceAlerts ?? body.results ?? body
    : body;
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((item) => {
    const alert = parsePriceAlert(item);
    return alert ? [alert] : [];
  });
}

async function fetchProductOptions(query: string, signal: AbortSignal) {
  const params = new URLSearchParams({
    search: query,
    limit: "10",
  });
  const response = await authenticatedFetch(`${productsEndpoint}?${params}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  const body = (await response.json().catch(() => null)) as unknown;

  if (!response.ok) {
    throw new Error(getResponseMessage(body, `Unable to search products (${response.status}).`));
  }

  const data = isRecord(body) ? body.data : null;

  return Array.isArray(data)
    ? data.flatMap((item) => {
        const product = parseProductOption(item);
        return product ? [product] : [];
      })
    : [];
}

function formatMoney(value?: number, currency = "NGN") {
  if (value === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toPayload(form: AlertFormState) {
  return {
    productId: form.productId.trim(),
    targetPrice: Number(form.targetPrice),
    unit: form.unit.trim(),
    condition: form.condition,
    currency: form.currency.trim() || "NGN",
    frequency: form.frequency,
  };
}

export function CustomerMobilePriceAlerts() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState("");
  const [form, setForm] = useState<AlertFormState>(createEmptyForm);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedProductUnits, setSelectedProductUnits] = useState<ProductOption["availableUnits"]>([]);
  const [isProductLoading, setIsProductLoading] = useState(false);
  const [productSearchError, setProductSearchError] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchControllerRef = useRef<AbortController | null>(null);

  const loadAlerts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(priceAlertsEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load price alerts (${response.status}).`));
      }

      setAlerts(parsePriceAlerts(body));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load price alerts.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadAlerts();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadAlerts]);

  useEffect(() => {
    const searchTimer = searchTimerRef;
    const searchController = searchControllerRef;

    return () => {
      if (searchTimer.current) {
        clearTimeout(searchTimer.current);
      }

      searchController.current?.abort();
    };
  }, []);

  const activeCount = alerts.filter((alert) => alert.status === "active").length;
  const triggeredCount = alerts.filter((alert) => alert.status === "triggered").length;

  function openCreateForm() {
    setEditingAlertId("");
    setForm(createEmptyForm());
    setProductOptions([]);
    setSelectedProductUnits([]);
    setProductSearchError("");
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEditForm(alert: PriceAlert) {
    setEditingAlertId(alert.id);
    setForm({
      productId: alert.productId,
      productSearch: alert.productName,
      targetPrice: String(alert.targetPrice),
      unit: alert.unit,
      condition: conditions.includes(alert.condition as AlertCondition)
        ? (alert.condition as AlertCondition)
        : "at_or_below",
      currency: alert.currency,
      frequency: frequencies.includes(alert.frequency as AlertFrequency)
        ? (alert.frequency as AlertFrequency)
        : "one_time",
      status: alert.status,
    });
    setProductOptions([]);
    setSelectedProductUnits(alert.unit ? [{ unit: alert.unit }] : []);
    setProductSearchError("");
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function closeForm() {
    if (!busyAction) {
      setIsFormOpen(false);
    }
  }

  function queueProductSearch(query: string) {
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current);
    }

    searchControllerRef.current?.abort();

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setProductOptions([]);
      setSelectedProductUnits([]);
      setIsProductLoading(false);
      setProductSearchError("");
      return;
    }

    setIsProductLoading(true);
    setProductSearchError("");

    searchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      searchControllerRef.current = controller;

      void fetchProductOptions(trimmedQuery, controller.signal)
        .then(setProductOptions)
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") {
            return;
          }

          setProductOptions([]);
          setProductSearchError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to search products.",
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsProductLoading(false);
          }
        });
    }, 350);
  }

  function updateProductSearch(value: string) {
    setForm((current) => ({
      ...current,
      productSearch: value,
      productId: "",
      unit: "",
    }));
    setSelectedProductUnits([]);
    queueProductSearch(value);
  }

  function selectProduct(product: ProductOption) {
    const defaultUnit = product.availableUnits[0];

    setForm((current) => ({
      ...current,
      productId: product.id,
      productSearch: product.name,
      unit: product.availableUnits.some((unitValue) => unitValue.unit === current.unit)
        ? current.unit
        : defaultUnit?.unit ?? "",
      currency: defaultUnit?.currency ?? current.currency,
    }));
    setSelectedProductUnits(product.availableUnits);
    setProductOptions([]);
    setProductSearchError("");
  }

  async function submitAlert(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = toPayload(form);

    if (
      !payload.productId ||
      !payload.unit ||
      !Number.isFinite(payload.targetPrice) ||
      payload.targetPrice <= 0
    ) {
      setError("Select a product, then provide a valid target price and unit.");
      return;
    }

    const isEditing = Boolean(editingAlertId);
    setBusyAction(isEditing ? `update-${editingAlertId}` : "create");

    try {
      const response = await authenticatedFetch(
        isEditing ? `${priceAlertsEndpoint}/${editingAlertId}` : priceAlertsEndpoint,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            isEditing
              ? {
                  ...payload,
                  status: form.status,
                }
              : payload,
          ),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          getResponseMessage(
            body,
            isEditing
              ? `Unable to update alert (${response.status}).`
              : `Unable to create alert (${response.status}).`,
          ),
        );
      }

      setNotice(isEditing ? "Price alert updated." : "Price alert created.");
      setIsFormOpen(false);
      await loadAlerts();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to save price alert.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function updateAlertStatus(alert: PriceAlert, status: AlertStatus) {
    setBusyAction(`status-${alert.id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${priceAlertsEndpoint}/${alert.id}`, {
        method: "PATCH",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: alert.productId,
          targetPrice: alert.targetPrice,
          unit: alert.unit,
          condition: alert.condition,
          currency: alert.currency,
          frequency: alert.frequency,
          status,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to update status (${response.status}).`));
      }

      setAlerts((current) =>
        current.map((item) => (item.id === alert.id ? { ...item, status } : item)),
      );
      setNotice("Price alert status updated.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to update status.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function deleteAlert(id: string) {
    setBusyAction(`delete-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${priceAlertsEndpoint}/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to delete alert (${response.status}).`));
      }

      setAlerts((current) => current.filter((alert) => alert.id !== id));
      setNotice("Price alert deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete alert.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-black">
            Price Alerts
          </h2>
          <p className="mt-1 text-xs font-medium text-black/48">
            Get notified when products reach your preferred price.
          </p>
        </div>
        <button
          aria-label="Create price alert"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f10606] text-white"
          type="button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
        </button>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <article className="rounded-2xl bg-[#fff0f0] p-4">
          <Bell className="text-[#f10606]" size={19} />
          <p className="mt-3 text-xl font-black text-black">{activeCount}</p>
          <p className="text-[9px] font-black uppercase text-black/42">Active</p>
        </article>
        <article className="rounded-2xl bg-emerald-50 p-4">
          <CheckCircle2 className="text-emerald-600" size={19} />
          <p className="mt-3 text-xl font-black text-black">{triggeredCount}</p>
          <p className="text-[9px] font-black uppercase text-black/42">Triggered</p>
        </article>
      </section>

      <button
        className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white text-xs font-black text-black/55"
        disabled={isLoading}
        type="button"
        onClick={() => void loadAlerts()}
      >
        <RefreshCw className={isLoading ? "animate-spin" : ""} size={15} />
        Refresh alerts
      </button>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
          {notice}
        </p>
      ) : null}

      {isLoading ? (
        <section className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div
              className="h-32 animate-pulse rounded-2xl border border-black/10 bg-white"
              key={item}
            />
          ))}
        </section>
      ) : alerts.length ? (
        <section className="space-y-3">
          {alerts.map((alert) => {
            const isTriggered = alert.status === "triggered";

            return (
              <article
                className="rounded-2xl border border-black/10 bg-white p-3.5 shadow-[0_10px_26px_rgba(0,0,0,0.04)]"
                key={alert.id}
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-13 w-13 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                    <Bell size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-black">
                          {alert.productName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] font-bold text-black/42">
                          {formatLabel(alert.condition)} - {alert.unit} - {formatLabel(alert.frequency)}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${
                          isTriggered
                            ? "bg-emerald-50 text-emerald-700"
                            : alert.status === "active"
                              ? "bg-[#fff0f0] text-[#f10606]"
                              : "bg-black/[0.04] text-black/50"
                        }`}
                      >
                        {formatLabel(alert.status)}
                      </span>
                    </div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-bold text-black/38">Current</p>
                        <p className="text-xs font-black text-black">
                          {formatMoney(alert.currentPrice, alert.currency)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-bold text-black/38">Target</p>
                        <p className="text-xs font-black text-[#f10606]">
                          {formatMoney(alert.targetPrice, alert.currency)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-2 border-t border-black/[0.06] pt-3">
                  <select
                    className="h-9 min-w-0 rounded-xl border border-black/10 bg-white px-2 text-[10px] font-bold text-black/60 outline-none"
                    disabled={busyAction === `status-${alert.id}`}
                    value={alert.status}
                    onChange={(event) => void updateAlertStatus(alert, event.target.value)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {formatLabel(status)}
                      </option>
                    ))}
                  </select>
                  <button
                    aria-label={`Edit alert for ${alert.productName}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/50"
                    type="button"
                    onClick={() => openEditForm(alert)}
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    aria-label={`Delete alert for ${alert.productName}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-red-50 text-[#f10606] disabled:opacity-50"
                    disabled={busyAction === `delete-${alert.id}`}
                    type="button"
                    onClick={() => void deleteAlert(alert.id)}
                  >
                    {busyAction === `delete-${alert.id}` ? (
                      <LoaderCircle className="animate-spin" size={15} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-center">
          <Bell className="mx-auto text-[#f10606]" size={24} />
          <p className="mt-3 text-sm font-black text-black">No price alerts yet</p>
          <p className="mt-1 text-xs font-medium text-black/48">
            Create an alert for a product and target price.
          </p>
        </section>
      )}

      <Link
        className="flex h-11 items-center justify-center gap-2 rounded-xl border border-[#f10606]/20 bg-[#fff0f0] text-xs font-black text-[#f10606]"
        href="/dashboard/watchlist"
      >
        <Heart size={16} />
        Manage wishlist
      </Link>

      {isFormOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeForm();
            }
          }}
        >
          <section
            aria-labelledby="price-alert-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black" id="price-alert-title">
                  {editingAlertId ? "Edit Price Alert" : "Create Price Alert"}
                </h2>
                <p className="mt-1 text-xs font-medium text-black/48">
                  Choose a product and the price condition to watch.
                </p>
              </div>
              <button
                aria-label="Close price alert form"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                type="button"
                onClick={closeForm}
              >
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={submitAlert}>
              <div className="relative">
                <label className="text-xs font-black text-black" htmlFor="price-alert-product">
                  Product
                </label>
                <input
                  aria-autocomplete="list"
                  className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#f10606]/45"
                  id="price-alert-product"
                  placeholder="Search product, e.g. rice"
                  value={form.productSearch}
                  onChange={(event) => updateProductSearch(event.target.value)}
                />
                {form.productId ? (
                  <p className="mt-1 text-[10px] font-bold text-emerald-700">
                    Selected product ID: {form.productId}
                  </p>
                ) : null}
                {isProductLoading ? (
                  <p className="mt-1 text-[10px] font-bold text-black/45">
                    Searching products...
                  </p>
                ) : null}
                {productSearchError ? (
                  <p className="mt-1 text-[10px] font-bold text-red-700">
                    {productSearchError}
                  </p>
                ) : null}
                {productOptions.length ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                    {productOptions.map((product) => (
                      <button
                        className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]"
                        key={product.id}
                        type="button"
                        value={product.id}
                        onClick={() => selectProduct(product)}
                      >
                        <span className="block text-xs font-black text-black">
                          {product.name}
                        </span>
                        <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">
                          {[product.category, product.sku, product.id].filter(Boolean).join(" - ")}
                        </span>
                        {product.availableUnits.length ? (
                          <span className="mt-0.5 block truncate text-[10px] font-bold text-emerald-700">
                            Units: {product.availableUnits.map((item) => item.unit).join(", ")}
                          </span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-black text-black">Target price</span>
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#f10606]/45"
                    min="1"
                    placeholder="60000"
                    type="number"
                    value={form.targetPrice}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, targetPrice: event.target.value }))
                    }
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Unit</span>
                  <select
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#f10606]/45"
                    disabled={!selectedProductUnits.length}
                    value={form.unit}
                    onChange={(event) => {
                      const unit = selectedProductUnits.find(
                        (item) => item.unit === event.target.value,
                      );

                      setForm((current) => ({
                        ...current,
                        unit: event.target.value,
                        currency: unit?.currency ?? current.currency,
                      }));
                    }}
                  >
                    <option value="">
                      {selectedProductUnits.length ? "Select unit" : "Select product first"}
                    </option>
                    {selectedProductUnits.map((unitValue) => (
                      <option key={unitValue.unit} value={unitValue.unit}>
                        {unitValue.unit}
                        {unitValue.currentPrice !== undefined
                          ? ` - ${formatMoney(unitValue.currentPrice, unitValue.currency ?? form.currency)}`
                          : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-black text-black">Condition</span>
                  <select
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/45"
                    value={form.condition}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        condition: event.target.value as AlertCondition,
                      }))
                    }
                  >
                    {conditions.map((condition) => (
                      <option key={condition} value={condition}>
                        {formatLabel(condition)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Currency</span>
                  <input
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs outline-none focus:border-[#f10606]/45"
                    value={form.currency}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, currency: event.target.value }))
                    }
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-black text-black">Frequency</span>
                <select
                  className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/45"
                  value={form.frequency}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      frequency: event.target.value as AlertFrequency,
                    }))
                  }
                >
                  {frequencies.map((frequency) => (
                    <option key={frequency} value={frequency}>
                      {formatLabel(frequency)}
                    </option>
                  ))}
                </select>
              </label>

              {editingAlertId ? (
                <label className="block">
                  <span className="text-xs font-black text-black">Status</span>
                  <select
                    className="mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/45"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, status: event.target.value }))
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {formatLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60"
                disabled={busyAction === "create" || busyAction === `update-${editingAlertId}`}
                type="submit"
              >
                {busyAction === "create" || busyAction === `update-${editingAlertId}` ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Bell size={17} />
                )}
                {editingAlertId ? "Update Alert" : "Create Alert"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

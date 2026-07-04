"use client";

import {
  CalendarDays,
  Eye,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  API_BASE_URL,
  MARKET_PRICES_URL,
  MARKETS_URL,
  PRODUCTS_URL,
} from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type MarketOption = {
  id: string;
  name: string;
  address?: string;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
};

type MarketPrice = {
  id: string;
  productId: string;
  productName: string;
  productOfferingId?: string;
  offeringSku?: string;
  variantName?: string;
  brandName?: string;
  marketId: string;
  marketName: string;
  marketAddress?: string;
  amount: number;
  currency: string;
  unit: string;
  quantity: number;
  qualityGrade?: string;
  source?: string;
  observedAt?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type MarketPriceForm = {
  productId: string;
  productSearch: string;
  marketId: string;
  amount: string;
  currency: string;
  unit: string;
  quantity: string;
  qualityGrade: string;
  source: string;
  observedAt: string;
  notes: string;
};
type BulkUploadResult = {
  valid?: boolean;
  message: string;
  summary: Record<string, number>;
  errors: string[];
  preview: Array<{
    row?: number;
    productOfferingSku: string;
    marketName: string;
    amount?: number;
    unit: string;
    observedAt?: string;
  }>;
};

const marketPricesEndpoint = `${API_BASE_URL}${MARKET_PRICES_URL}`;
const marketPriceBulkUploadTemplateEndpoint = `${marketPricesEndpoint}/bulk-upload/template`;
const marketPriceBulkUploadValidateEndpoint = `${marketPricesEndpoint}/bulk-upload/validate`;
const marketPriceBulkUploadCommitEndpoint = `${marketPricesEndpoint}/bulk-upload/commit`;
const marketsEndpoint = `${API_BASE_URL}${MARKETS_URL}`;
const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;

function createEmptyForm(): MarketPriceForm {
  return {
    productId: "",
    productSearch: "",
    marketId: "",
    amount: "",
    currency: "NGN",
    unit: "bag",
    quantity: "1",
    qualityGrade: "standard",
    source: "manual",
    observedAt: new Date().toISOString().slice(0, 10),
    notes: "",
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

function parseMarket(value: unknown): MarketOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const name = readText(value, ["marketname", "name"]);

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    address: readText(value, ["marketaddress", "address"]) || undefined,
  };
}

function parseProduct(value: unknown): ProductOption | null {
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
  };
}

function parseMarketPrice(value: unknown): MarketPrice | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const product = isRecord(value.product) ? value.product : null;
  const market = isRecord(value.market) ? value.market : null;
  const offering = isRecord(value.productOffering) ? value.productOffering : null;
  const priceUnit = isRecord(value.priceUnit) ? value.priceUnit : null;
  const variant = offering && isRecord(offering.variant) ? offering.variant : null;
  const brand = offering && isRecord(offering.brand) ? offering.brand : null;
  const productId = readText(value, ["productId"]) || (product ? readText(product, ["id"]) : "");
  const marketId = readText(value, ["marketId"]) || (market ? readText(market, ["id"]) : "");
  const amount = readNumber(value, ["amount", "currentPrice", "price"]);

  if (!id || !productId || !marketId || amount === undefined) {
    return null;
  }

  return {
    id,
    productId,
    productName:
      (product ? readText(product, ["name", "title"]) : "") ||
      readText(value, ["productName"]) ||
      "Product",
    productOfferingId:
      readText(value, ["productOfferingId"]) ||
      (offering ? readText(offering, ["id"]) : "") ||
      undefined,
    offeringSku: offering ? readText(offering, ["sku"]) || undefined : undefined,
    variantName: variant ? readText(variant, ["name"]) || undefined : undefined,
    brandName: brand ? readText(brand, ["name"]) || undefined : undefined,
    marketId,
    marketName:
      (market ? readText(market, ["marketname", "name"]) : "") ||
      readText(value, ["marketName"]) ||
      "Market",
    marketAddress:
      (market ? readText(market, ["marketaddress", "address"]) : "") ||
      readText(value, ["marketAddress"]) ||
      undefined,
    amount,
    currency: readText(value, ["currency"]) || "NGN",
    unit:
      readText(value, ["unit"]) ||
      (priceUnit ? readText(priceUnit, ["label", "code"]) : "") ||
      "unit",
    quantity: readNumber(value, ["quantity"]) ?? 1,
    qualityGrade: readText(value, ["qualityGrade", "quality_grade"]) || undefined,
    source: readText(value, ["source"]) || undefined,
    observedAt: readText(value, ["observedAt", "observed_at"]) || undefined,
    notes: readText(value, ["notes"]) || undefined,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
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

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
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
  }).format(date);
}

function formatLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseBulkUploadResult(value: unknown): BulkUploadResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const payload = isRecord(value.data) ? value.data : value;
  const summary = isRecord(payload.summary) ? payload.summary : payload;
  const rawErrors = Array.isArray(payload.errors)
    ? payload.errors
    : Array.isArray(value.errors)
      ? value.errors
      : [];
  const rawPreview = Array.isArray(payload.preview)
    ? payload.preview
    : Array.isArray(value.preview)
      ? value.preview
      : [];
  const parsedSummary = Object.fromEntries(
    Object.entries(summary).flatMap(([key, item]) => {
      const parsed = Number(item);
      return Number.isFinite(parsed) ? [[key, parsed]] : [];
    }),
  );

  return {
    valid:
      typeof payload.valid === "boolean"
        ? payload.valid
        : typeof value.valid === "boolean"
          ? value.valid
          : undefined,
    message:
      readText(payload, ["message"]) ||
      readText(value, ["message"]) ||
      "Market price bulk upload processed.",
    summary: Object.keys(parsedSummary).length
      ? parsedSummary
      : {
          received: readNumber(summary, ["received", "receivedRows", "total", "totalRows"]) ?? 0,
          failed: readNumber(summary, ["failed", "invalid", "invalidRows"]) ?? rawErrors.length,
        },
    errors: rawErrors.flatMap((item): string[] => {
      if (typeof item === "string") {
        return [item];
      }

      if (isRecord(item)) {
        const row = readText(item, ["row", "rowNumber", "line"]);
        const field = readText(item, ["field", "column"]);
        const message = readText(item, ["message", "error", "reason"]) || JSON.stringify(item);
        const location = [row ? `Row ${row}` : "", field].filter(Boolean).join(", ");
        return [`${location ? `${location}: ` : ""}${message}`];
      }

      return [];
    }),
    preview: rawPreview.flatMap((item): BulkUploadResult["preview"] => {
      if (!isRecord(item)) {
        return [];
      }

      return [{
        row: readNumber(item, ["row", "rowNumber", "line"]),
        productOfferingSku: readText(item, ["productOfferingSku", "sku", "offeringSku"]) || "-",
        marketName: readText(item, ["marketName", "market"]) || "-",
        amount: readNumber(item, ["amount", "price"]),
        unit: readText(item, ["unit"]) || "-",
        observedAt: readText(item, ["observedAt", "observed_at"]) || undefined,
      }];
    }),
  };
}

function toPayload(form: MarketPriceForm) {
  return {
    productId: form.productId.trim(),
    marketId: form.marketId.trim(),
    amount: Number(form.amount),
    currency: form.currency.trim() || "NGN",
    unit: form.unit.trim(),
    quantity: Number(form.quantity),
    qualityGrade: form.qualityGrade.trim() || "standard",
    source: form.source.trim() || "manual",
    observedAt: form.observedAt ? new Date(form.observedAt).toISOString() : undefined,
    ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
  };
}

export function DashboardMarketPrices() {
  const [marketPrices, setMarketPrices] = useState<MarketPrice[]>([]);
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [filterProductId, setFilterProductId] = useState("");
  const [filterProductSearch, setFilterProductSearch] = useState("");
  const [filterMarketId, setFilterMarketId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [form, setForm] = useState<MarketPriceForm>(createEmptyForm);
  const [editingId, setEditingId] = useState("");
  const [selectedPrice, setSelectedPrice] = useState<MarketPrice | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkStage, setBulkStage] = useState<"idle" | "validating" | "validated" | "committing" | "committed">("idle");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const productSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productSearchControllerRef = useRef<AbortController | null>(null);

  const loadMarkets = useCallback(async () => {
    try {
      const response = await authenticatedFetch(marketsEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (response.ok) {
        setMarkets(parseList(body, "markets", parseMarket));
      }
    } catch {
      setMarkets([]);
    }
  }, []);

  const loadMarketPrices = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams();

    if (filterProductId) {
      params.set("productId", filterProductId);
    }

    if (filterMarketId) {
      params.set("marketId", filterMarketId);
    }

    if (from) {
      params.set("from", from);
    }

    if (to) {
      params.set("to", to);
    }

    const endpoint = `${marketPricesEndpoint}${params.size ? `?${params}` : ""}`;

    try {
      const response = await authenticatedFetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load market prices (${response.status}).`));
      }

      setMarketPrices(parseList(body, "marketPrices", parseMarketPrice));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load market prices.");
    } finally {
      setIsLoading(false);
    }
  }, [filterMarketId, filterProductId, from, to]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMarkets();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadMarkets]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadMarketPrices();
    }, 250);

    return () => clearTimeout(timer);
  }, [loadMarketPrices]);

  useEffect(() => {
    const timerRef = productSearchTimerRef;
    const controllerRef = productSearchControllerRef;

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      controllerRef.current?.abort();
    };
  }, []);

  function searchProducts(query: string) {
    if (productSearchTimerRef.current) {
      clearTimeout(productSearchTimerRef.current);
    }

    productSearchControllerRef.current?.abort();

    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setProductOptions([]);
      return;
    }

    productSearchTimerRef.current = setTimeout(() => {
      const controller = new AbortController();
      productSearchControllerRef.current = controller;

      const params = new URLSearchParams({ search: trimmed, limit: "10" });

      void authenticatedFetch(`${productsEndpoint}?${params}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            return [];
          }

          const body = (await response.json().catch(() => null)) as unknown;
          return parseList(body, "products", parseProduct);
        })
        .then(setProductOptions)
        .catch(() => setProductOptions([]));
    }, 300);
  }

  function selectFilterProduct(product: ProductOption) {
    setFilterProductId(product.id);
    setFilterProductSearch(product.name);
    setProductOptions([]);
  }

  function selectFormProduct(product: ProductOption) {
    setForm((current) => ({
      ...current,
      productId: product.id,
      productSearch: product.name,
    }));
    setProductOptions([]);
  }

  function openCreateForm() {
    setEditingId("");
    setForm(createEmptyForm());
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEditForm(price: MarketPrice) {
    setEditingId(price.id);
    setForm({
      productId: price.productId,
      productSearch: price.productName,
      marketId: price.marketId,
      amount: String(price.amount),
      currency: price.currency,
      unit: price.unit,
      quantity: String(price.quantity),
      qualityGrade: price.qualityGrade ?? "standard",
      source: price.source ?? "manual",
      observedAt: price.observedAt ? new Date(price.observedAt).toISOString().slice(0, 10) : "",
      notes: price.notes ?? "",
    });
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function loadPriceDetails(id: string) {
    setBusyAction(`detail-${id}`);
    setError("");

    try {
      const response = await authenticatedFetch(`${marketPricesEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load price (${response.status}).`));
      }

      const value = isRecord(body) ? body.data ?? body.marketPrice ?? body : body;
      const price = parseMarketPrice(value);

      if (!price) {
        throw new Error("The market price response was not in the expected format.");
      }

      setSelectedPrice(price);
      setMarketPrices((current) => current.map((item) => (item.id === price.id ? price : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load market price.");
    } finally {
      setBusyAction("");
    }
  }

  async function loadByProduct(productId: string) {
    if (!productId) {
      return;
    }

    setBusyAction("product-route");
    setError("");

    try {
      const response = await authenticatedFetch(`${marketPricesEndpoint}/product/${productId}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load product prices (${response.status}).`));
      }

      setMarketPrices(parseList(body, "marketPrices", parseMarketPrice));
      setNotice("Loaded prices through the product route.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load product prices.");
    } finally {
      setBusyAction("");
    }
  }

  async function loadByMarket(marketId: string) {
    if (!marketId) {
      return;
    }

    setBusyAction("market-route");
    setError("");

    try {
      const response = await authenticatedFetch(`${marketPricesEndpoint}/market/${marketId}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load market prices (${response.status}).`));
      }

      setMarketPrices(parseList(body, "marketPrices", parseMarketPrice));
      setNotice("Loaded prices through the market route.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load market prices.");
    } finally {
      setBusyAction("");
    }
  }

  async function submitMarketPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = toPayload(form);

    if (!payload.productId || !payload.marketId || !payload.unit || !Number.isFinite(payload.amount) || payload.amount <= 0 || !Number.isFinite(payload.quantity) || payload.quantity <= 0) {
      setError("Select product and market, then provide a valid amount, quantity, and unit.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(
        editingId ? `${marketPricesEndpoint}/${editingId}` : marketPricesEndpoint,
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          getResponseMessage(
            body,
            editingId
              ? `Unable to update market price (${response.status}).`
              : `Unable to create market price (${response.status}).`,
          ),
        );
      }

      setNotice(editingId ? "Market price updated." : "Market price created.");
      setIsFormOpen(false);
      await loadMarketPrices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save market price.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteMarketPrice(id: string) {
    setBusyAction(`delete-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${marketPricesEndpoint}/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to delete market price (${response.status}).`));
      }

      setMarketPrices((current) => current.filter((item) => item.id !== id));
      setNotice("Market price deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete market price.");
    } finally {
      setBusyAction("");
    }
  }

  async function downloadTemplate() {
    setError("");

    try {
      const response = await authenticatedFetch(marketPriceBulkUploadTemplateEndpoint, {
        headers: { Accept: "text/csv,application/octet-stream,*/*" },
      });

      if (!response.ok) {
        throw new Error(`Unable to download template (${response.status}).`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || "market-prices-bulk-upload-template.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to download market price template.");
    }
  }

  async function submitBulkUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBulkResult(null);
    setBulkStage("validating");
    let requestStage: "validating" | "committing" = "validating";

    if (!bulkFile) {
      setError("Choose a CSV or spreadsheet file to upload.");
      setBulkStage("idle");
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const validationFormData = new FormData();
      validationFormData.append("file", bulkFile);
      const validationResponse = await authenticatedFetch(marketPriceBulkUploadValidateEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: validationFormData,
      });
      const validationBody = (await validationResponse.json().catch(() => null)) as unknown;
      const validationResult = parseBulkUploadResult(validationBody);

      if (validationResult && (validationResult.valid === false || validationResult.errors.length > 0)) {
        setBulkResult(validationResult);
        setBulkStage("idle");
        setError("Validation found errors. Correct the file and upload it again.");
        return;
      }

      if (!validationResponse.ok) {
        throw new Error(getResponseMessage(validationBody, `Unable to validate market price upload (${validationResponse.status}).`));
      }

      if (!validationResult) {
        throw new Error("The validation response was not in the expected format.");
      }

      if (validationResult.valid !== true) {
        throw new Error("The validation response did not confirm that the file is valid.");
      }

      setBulkResult(validationResult);
      setBulkStage("validated");

      const commitFormData = new FormData();
      commitFormData.append("file", bulkFile);
      requestStage = "committing";
      setBulkStage("committing");
      const commitResponse = await authenticatedFetch(marketPriceBulkUploadCommitEndpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: commitFormData,
      });
      const commitBody = (await commitResponse.json().catch(() => null)) as unknown;
      const commitResult = parseBulkUploadResult(commitBody);

      if (!commitResponse.ok) {
        throw new Error(getResponseMessage(commitBody, `Unable to commit market price upload (${commitResponse.status}).`));
      }

      if (!commitResult) {
        throw new Error("The commit response was not in the expected format.");
      }

      setBulkResult(commitResult);
      setBulkStage("committed");
      setNotice(commitResult.message || "Market prices validated and committed successfully.");
      await loadMarketPrices();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : requestStage === "committing"
            ? "Validation passed, but the market price upload could not be committed."
            : "Unable to validate the market price upload.",
      );
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  function resetFilters() {
    setFilterProductId("");
    setFilterProductSearch("");
    setFilterMarketId("");
    setFrom("");
    setTo("");
    setProductOptions([]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Market Prices</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Create, update, and filter live commodity prices across markets.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid gap-3 xl:grid-cols-[1fr_0.8fr_0.45fr_0.45fr_auto_auto_auto] xl:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Search product to filter..."
              value={filterProductSearch}
              onChange={(event) => {
                setFilterProductSearch(event.target.value);
                setFilterProductId("");
                searchProducts(event.target.value);
              }}
            />
            {productOptions.length ? (
              <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                {productOptions.map((product) => (
                  <button
                    className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]"
                    key={product.id}
                    type="button"
                    onClick={() => selectFilterProduct(product)}
                  >
                    <span className="block text-xs font-black text-black">{product.name}</span>
                    <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">
                      {[product.category, product.sku, product.id].filter(Boolean).join(" - ")}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black/70 outline-none"
            value={filterMarketId}
            onChange={(event) => setFilterMarketId(event.target.value)}
          >
            <option value="">All markets</option>
            {markets.map((market) => (
              <option key={market.id} value={market.id}>{market.name}</option>
            ))}
          </select>
          <input
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black/70 outline-none"
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <input
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-bold text-black/70 outline-none"
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/70 transition hover:text-[#f10606]"
            type="button"
            onClick={() => void loadMarketPrices()}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]"
            type="button"
            onClick={openCreateForm}
          >
            <Plus size={17} />
            Add price
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#f10606]/20 bg-[#fff0f0] px-5 text-sm font-black text-[#f10606]"
            type="button"
            onClick={() => {
              setBulkFile(null);
              setBulkResult(null);
              setBulkStage("idle");
              setError("");
              setNotice("");
              setIsBulkOpen(true);
            }}
          >
            <Upload size={17} />
            Bulk upload
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="text-xs font-black text-black/50 transition hover:text-[#f10606]" type="button" onClick={resetFilters}>
            Reset filters
          </button>
          <button
            className="text-xs font-black text-black/50 transition hover:text-[#f10606] disabled:opacity-40"
            disabled={!filterProductId || busyAction === "product-route"}
            type="button"
            onClick={() => void loadByProduct(filterProductId)}
          >
            {busyAction === "product-route" ? "Loading..." : ""}
          </button>
          <button
            className="text-xs font-black text-black/50 transition hover:text-[#f10606] disabled:opacity-40"
            disabled={!filterMarketId || busyAction === "market-route"}
            type="button"
            onClick={() => void loadByMarket(filterMarketId)}
          >
            {busyAction === "market-route" ? "Loading..." : ""}
          </button>
        </div>
      </section>

      {error ? (
        <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">{error}</p>
      ) : null}
      {notice ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">{notice}</p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1.15fr_1fr_0.55fr_0.6fr_0.6fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Product</span>
          <span>Market</span>
          <span>Unit</span>
          <span>Price</span>
          <span>Observed</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => (
              <div className="h-16 animate-pulse rounded-lg bg-black/[0.04]" key={item} />
            ))}
          </div>
        ) : marketPrices.length ? (
          marketPrices.map((price) => (
            <article
              className="grid grid-cols-[1.15fr_1fr_0.55fr_0.6fr_0.6fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
              key={price.id}
            >
              <div className="min-w-0">
                <p className="truncate font-black text-black">{price.offeringSku || price.productName}</p>
                <p className="mt-1 truncate text-xs font-medium text-black/50">
                  {[price.productName, price.variantName, price.brandName].filter(Boolean).join(" · ") || price.productId}
                </p>
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-black/72">{price.marketName}</p>
                <p className="mt-1 truncate text-xs font-medium text-black/45">{price.marketAddress || price.marketId}</p>
              </div>
              <p className="font-bold text-black/64">{price.quantity} {price.unit}</p>
              <p className="font-black text-black">{formatMoney(price.amount, price.currency)}</p>
              <p className="text-xs font-bold text-black/45">{formatDate(price.observedAt || price.updatedAt)}</p>
              <div className="flex justify-end gap-2">
                <button
                  aria-label={`View ${price.offeringSku || price.productName} price`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => void loadPriceDetails(price.id)}
                >
                  {busyAction === `detail-${price.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Eye size={16} />}
                </button>
                <button
                  aria-label={`Edit ${price.offeringSku || price.productName} price`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => openEditForm(price)}
                >
                  <Pencil size={16} />
                </button>
                <button
                  aria-label={`Delete ${price.offeringSku || price.productName} price`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  disabled={busyAction === `delete-${price.id}`}
                  type="button"
                  onClick={() => void deleteMarketPrice(price.id)}
                >
                  {busyAction === `delete-${price.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={16} />}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="p-8 text-center">
            <Search className="mx-auto text-[#f10606]" size={26} />
            <p className="mt-3 text-sm font-black text-black">No market prices found</p>
            <p className="mt-1 text-xs font-medium text-black/48">Adjust filters or add a market price.</p>
          </div>
        )}
      </section>

      {isFormOpen ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
          <section className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]" role="dialog" aria-modal="true">
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black">{editingId ? "Edit Market Price" : "Add Market Price"}</h2>
                <p className="mt-1 text-xs font-medium text-black/48">Select a product, market, and price details.</p>
              </div>
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={() => setIsFormOpen(false)}>
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={submitMarketPrice}>
              <div className="relative">
                <label className="text-xs font-black text-black" htmlFor="market-price-product">Product</label>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                  id="market-price-product"
                  placeholder="Search product"
                  value={form.productSearch}
                  onChange={(event) => {
                    setForm((current) => ({ ...current, productSearch: event.target.value, productId: "" }));
                    searchProducts(event.target.value);
                  }}
                />
                {form.productId ? <p className="mt-1 text-[10px] font-bold text-emerald-700">Selected product ID: {form.productId}</p> : null}
                {productOptions.length ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                    {productOptions.map((product) => (
                      <button className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]" key={product.id} type="button" onClick={() => selectFormProduct(product)}>
                        <span className="block text-xs font-black text-black">{product.name}</span>
                        <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">{[product.category, product.sku, product.id].filter(Boolean).join(" - ")}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <label className="block">
                <span className="text-xs font-black text-black">Market</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.marketId} onChange={(event) => setForm((current) => ({ ...current, marketId: event.target.value }))}>
                  <option value="">Select market</option>
                  {markets.map((market) => (
                    <option key={market.id} value={market.id}>{market.name}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <label className="block">
                  <span className="text-xs font-black text-black">Amount</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" min="0" step="any" type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Currency</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.currency} onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Unit</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.unit} onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Quantity</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" min="0.01" step="any" type="number" value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <label className="block">
                  <span className="text-xs font-black text-black">Quality grade</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.qualityGrade} onChange={(event) => setForm((current) => ({ ...current, qualityGrade: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Source</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))} />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Observed at</span>
                  <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="date" value={form.observedAt} onChange={(event) => setForm((current) => ({ ...current, observedAt: event.target.value }))} />
                </label>
              </div>

              <label className="block">
                <span className="text-xs font-black text-black">Notes</span>
                <textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>

              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting} type="submit">
                {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
                {isSubmitting ? "Saving..." : editingId ? "Update Price" : "Create Price"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {isBulkOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isBulkSubmitting) {
              setIsBulkOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="market-price-bulk-upload-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black" id="market-price-bulk-upload-title">Bulk Upload Market Prices</h2>
                <p className="mt-1 text-xs font-medium text-black/48">Download the template, fill it, then upload the completed file.</p>
              </div>
              <button
                aria-label="Close bulk upload"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                disabled={isBulkSubmitting}
                type="button"
                onClick={() => setIsBulkOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <button
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#f10606]/20 bg-[#fff0f0] text-sm font-black text-[#f10606]"
              type="button"
              onClick={downloadTemplate}
            >
              <Upload size={16} />
              Download sample template
            </button>

            <form className="mt-4 space-y-4" onSubmit={submitBulkUpload}>
              <label className="block">
                <span className="text-xs font-black text-black">Upload file</span>
                <input
                  accept=".csv,.xlsx,.xls"
                  className="mt-2 block w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm file:mr-4 file:rounded-lg file:border-0 file:bg-[#f10606] file:px-4 file:py-2 file:text-xs file:font-black file:text-white"
                  type="file"
                  onChange={(event) => {
                    setBulkFile(event.target.files?.[0] ?? null);
                    setBulkResult(null);
                    setBulkStage("idle");
                    setError("");
                    setNotice("");
                  }}
                />
              </label>

              {bulkFile ? (
                <p className="rounded-xl bg-[#fafafa] px-3 py-2.5 text-xs font-bold text-black/55">
                  Selected: {bulkFile.name}
                </p>
              ) : null}

              {bulkResult ? (
                <section className={`rounded-xl border p-4 ${bulkResult.errors.length ? "border-red-200 bg-red-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <p className="text-sm font-black text-black">{bulkResult.message}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {Object.entries(bulkResult.summary).map(([label, value]) => (
                      <div className="rounded-lg bg-white p-3" key={label}>
                        <p className="text-[9px] font-black uppercase text-black/42">{formatLabel(label)}</p>
                        <p className="mt-1 text-lg font-black text-black">{value}</p>
                      </div>
                    ))}
                  </div>
                  {bulkResult.preview.length ? (
                    <div className="mt-3 overflow-hidden rounded-lg border border-black/10 bg-white">
                      <div className="grid grid-cols-[0.35fr_1fr_0.9fr_0.7fr_0.6fr_0.9fr] gap-2 bg-[#fff5f5] px-3 py-2 text-[9px] font-black uppercase text-black/45">
                        <span>Row</span><span>Offering</span><span>Market</span><span>Amount</span><span>Unit</span><span>Observed</span>
                      </div>
                      {bulkResult.preview.map((item, index) => (
                        <div className="grid grid-cols-[0.35fr_1fr_0.9fr_0.7fr_0.6fr_0.9fr] gap-2 border-t border-black/10 px-3 py-2 text-[10px] font-bold text-black/60" key={`${item.productOfferingSku}-${item.row ?? index}`}>
                          <span>{item.row ?? "-"}</span>
                          <span className="truncate">{item.productOfferingSku}</span>
                          <span className="truncate">{item.marketName}</span>
                          <span>{item.amount !== undefined ? formatMoney(item.amount) : "-"}</span>
                          <span>{item.unit}</span>
                          <span>{formatDate(item.observedAt)}</span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {bulkResult.errors.length ? (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                      <p className="text-xs font-black text-red-700">Errors</p>
                      <ul className="mt-2 space-y-1 text-xs font-bold text-red-700">
                        {bulkResult.errors.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </section>
              ) : null}

              {isBulkSubmitting || bulkStage === "validated" || bulkStage === "committed" ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className={`rounded-xl p-3 ${bulkStage === "validating" ? "bg-[#fff0f0] text-[#f10606]" : "bg-emerald-50 text-emerald-700"}`}>
                    <p className="text-[10px] font-black uppercase">1. Validate</p>
                    <p className="mt-1 text-xs font-bold">{bulkStage === "validating" ? "Checking file..." : "Passed"}</p>
                  </div>
                  <div className={`rounded-xl p-3 ${bulkStage === "committing" ? "bg-[#fff0f0] text-[#f10606]" : bulkStage === "committed" ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/40"}`}>
                    <p className="text-[10px] font-black uppercase">2. Commit</p>
                    <p className="mt-1 text-xs font-bold">{bulkStage === "committing" ? "Saving prices..." : bulkStage === "committed" ? "Completed" : "Waiting"}</p>
                  </div>
                </div>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBulkSubmitting}
                type="submit"
              >
                {isBulkSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />}
                {bulkStage === "validating"
                  ? "Validating file..."
                  : bulkStage === "committing"
                    ? "Committing prices..."
                    : "Validate & Upload Prices"}
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {selectedPrice ? (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedPrice(null); }}>
          <section className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]" role="dialog" aria-modal="true">
            <header className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase text-[#f10606]">{selectedPrice.marketName}</p>
                <h2 className="mt-1 text-lg font-black text-black">{selectedPrice.offeringSku || selectedPrice.productName}</h2>
                <p className="mt-1 text-xs font-bold text-black/42">{selectedPrice.productName}</p>
              </div>
              <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={() => setSelectedPrice(null)}>
                <X size={18} />
              </button>
            </header>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <DetailMetric label="Amount" value={formatMoney(selectedPrice.amount, selectedPrice.currency)} />
              <DetailMetric label="Unit" value={`${selectedPrice.quantity} ${selectedPrice.unit}`} />
              <DetailMetric label="Variant" value={selectedPrice.variantName || "Not provided"} />
              <DetailMetric label="Brand" value={selectedPrice.brandName || "Not provided"} />
              <DetailMetric label="Quality" value={selectedPrice.qualityGrade || "Not provided"} />
              <DetailMetric label="Source" value={selectedPrice.source || "Not provided"} />
              <DetailMetric label="Observed" value={formatDate(selectedPrice.observedAt)} />
              <DetailMetric label="Updated" value={formatDate(selectedPrice.updatedAt || selectedPrice.createdAt)} />
            </div>
            <div className="mt-4 rounded-xl bg-[#fafafa] p-4">
              <p className="text-xs font-black uppercase text-black/42">Notes</p>
              <p className="mt-2 text-sm font-medium leading-6 text-black/62">{selectedPrice.notes || "No notes provided."}</p>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#fafafa] p-4">
      <p className="text-xs font-black uppercase text-black/42">{label}</p>
      <p className="mt-1 text-sm font-black text-black">{value}</p>
    </div>
  );
}

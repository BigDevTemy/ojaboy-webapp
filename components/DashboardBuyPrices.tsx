"use client";

import {
  BadgeDollarSign,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  API_BASE_URL,
  BUY_PRICES_URL,
  MARKETS_URL,
  PRODUCT_CATEGORIES_URL,
  PRODUCTS_URL,
} from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type OfferingOption = {
  id: string;
  sku: string;
  label: string;
  variantId?: string;
  variantName?: string;
  brandId?: string;
  brandName?: string;
  packageId?: string;
  packageName?: string;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string;
  offerings: OfferingOption[];
};

type BuyPriceForm = {
  productId: string;
  productOfferingId: string;
  marketPriceId: string;
  marketId: string;
  baseMarketPrice: string;
  marginAmount: string;
  logisticsBuffer: string;
  riskBuffer: string;
  currency: string;
  strategyUsed: string;
  observedFrom: string;
  observedTo: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
};

type CreatedBuyPrice = {
  id: string;
  finalPrice: number;
  currency: string;
  strategyUsed: string;
  validFrom?: string;
  validUntil?: string;
};
type MarketOption = { id: string; name: string };
type CalculationResult = {
  strategyUsed: string;
  marketId: string;
  marketPriceId: string;
  baseMarketPrice: number;
  marginAmount: number;
  logisticsBuffer: number;
  riskBuffer: number;
  finalPrice: number;
  currency: string;
  explanation?: string;
  marketName?: string;
};
type BulkCalculationResult = {
  productId: string;
  productOfferingId: string;
  marketId?: string;
  marketPriceId?: string;
  strategyUsed: string;
  baseMarketPrice: number;
  marginAmount: number;
  logisticsBuffer: number;
  riskBuffer: number;
  finalPrice: number;
  currency: string;
  priceUnitCode?: string;
  explanation?: string;
};
type CategoryOption = { id: string; name: string };
type GeneratedBuyPrice = {
  id: string;
  productOfferingId: string;
  baseMarketPrice: number;
  finalPrice: number;
  currency: string;
  strategyUsed: string;
  isActive: boolean;
};
type BulkJobStatus = "pending" | "processing" | "completed" | "failed";
type BulkJob<T> = {
  jobId: string;
  mode: "calculate" | "generate";
  status: BulkJobStatus;
  totalTargets: number;
  processedTargets: number;
  done: boolean;
  failed: boolean;
  errorMessage: string | null;
  results: T[];
};
type BuyPriceRecord = {
  id: string;
  productId?: string;
  productOfferingId?: string;
  marketId?: string;
  productName?: string;
  offeringSku?: string;
  packageName?: string;
  marketName?: string;
  baseMarketPrice: number;
  marginAmount: number;
  logisticsBuffer: number;
  riskBuffer: number;
  finalPrice: number;
  currency: string;
  strategyUsed: string;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
};
type BuyPricePagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
type BuyPriceFilters = {
  search: string;
  productId: string;
  productOfferingId: string;
  marketId: string;
  marketPriceId: string;
  variantId: string;
  brandId: string;
  packageId: string;
  unit: string;
  strategyUsed: string;
  isActive: string;
  validFrom: string;
  validTo: string;
};
type BuyPriceEditForm = {
  marginAmount: string;
  logisticsBuffer: string;
  riskBuffer: string;
  finalPrice: string;
  validUntil: string;
  isActive: boolean;
};

const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;
const buyPricesEndpoint = `${API_BASE_URL}${BUY_PRICES_URL}`;
const calculateEndpoint = `${buyPricesEndpoint}/calculate`;
const bulkJobsEndpoint = `${buyPricesEndpoint}/bulk-jobs`;
const categoriesEndpoint = `${API_BASE_URL}${PRODUCT_CATEGORIES_URL}?isActive=true`;
const marketsEndpoint = `${API_BASE_URL}${MARKETS_URL}`;
const buyPriceStrategies = [
  "cheapest",
  "average",
  "median",
  "preferred_market",
  "single_market",
  "quality_first",
  "fastest_fulfillment",
  "hybrid_landed_cost",
  "manual_override",
] as const;

function formatLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function localDateTime(offsetDays = 0, endOfDay = false) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  if (endOfDay) date.setHours(23, 59, 59, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function emptyForm(): BuyPriceForm {
  const today = new Date();
  const observedTo = today.toISOString().slice(0, 10);
  today.setDate(today.getDate() - 2);
  return {
    productId: "",
    productOfferingId: "",
    marketPriceId: "",
    marketId: "",
    baseMarketPrice: "",
    marginAmount: "0",
    logisticsBuffer: "0",
    riskBuffer: "0",
    currency: "NGN",
    strategyUsed: "cheapest",
    observedFrom: today.toISOString().slice(0, 10),
    observedTo,
    isActive: true,
    validFrom: localDateTime(),
    validUntil: localDateTime(2, true),
  };
}

function emptyBuyPriceFilters(): BuyPriceFilters {
  return {
    search: "",
    productId: "",
    productOfferingId: "",
    marketId: "",
    marketPriceId: "",
    variantId: "",
    brandId: "",
    packageId: "",
    unit: "",
    strategyUsed: "",
    isActive: "",
    validFrom: "",
    validTo: "",
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

function parseProducts(body: unknown): ProductOption[] {
  const value = isRecord(body) ? body.data ?? body.products ?? body.results ?? body : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = readText(item, ["id"]);
    const name = readText(item, ["name"]);
    if (!id || !name) return [];
    const offerings = Array.isArray(item.offerings)
      ? item.offerings.flatMap((offering): OfferingOption[] => {
          if (!isRecord(offering)) return [];
          const offeringId = readText(offering, ["id"]);
          const sku = readText(offering, ["sku"]);
          if (!offeringId || !sku) return [];
          const variant = isRecord(offering.variant) ? readText(offering.variant, ["name"]) : "";
          const brand = isRecord(offering.brand) ? readText(offering.brand, ["name"]) : "Unbranded";
          const packageName = isRecord(offering.package) ? readText(offering.package, ["name"]) : "";
          return [{
            id: offeringId,
            sku,
            variantId: readText(offering, ["variantId"]) || undefined,
            variantName: variant || undefined,
            brandId: readText(offering, ["brandId"]) || undefined,
            brandName: brand || undefined,
            packageId: readText(offering, ["packageId"]) || undefined,
            packageName: packageName || undefined,
            label: [variant, brand, packageName].filter(Boolean).join(" · "),
          }];
        })
      : [];
    return [{ id, name, sku: readText(item, ["sku"]) || undefined, offerings }];
  });
}

function parseCreatedBuyPrice(body: unknown): CreatedBuyPrice | null {
  if (!isRecord(body)) return null;
  const value = isRecord(body.price)
    ? body.price
    : isRecord(body.data)
      ? body.data
      : body;
  const id = readText(value, ["id"]);
  const finalPrice = readNumber(value, ["finalPrice"]);
  if (!id || finalPrice === undefined) return null;
  return {
    id,
    finalPrice,
    currency: readText(value, ["currency"]) || "NGN",
    strategyUsed: readText(value, ["strategyUsed"]) || "cheapest",
    validFrom: readText(value, ["validFrom"]) || undefined,
    validUntil: readText(value, ["validUntil"]) || undefined,
  };
}

function parseMarkets(body: unknown): MarketOption[] {
  const value = isRecord(body) ? body.markets ?? body.results ?? body.data ?? body : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = readText(item, ["id"]);
    const name = readText(item, ["marketname", "name"]);
    return id && name ? [{ id, name }] : [];
  });
}

function parseCalculation(body: unknown): CalculationResult | null {
  if (!isRecord(body)) return null;
  const value = isRecord(body.result) ? body.result : isRecord(body.data) ? body.data : body;
  const consideredMarketPrice = Array.isArray(value.consideredMarketPrices)
    ? value.consideredMarketPrices.find(isRecord)
    : null;
  const selectedMarketPrice = isRecord(value.selectedMarketPrice)
    ? value.selectedMarketPrice
    : consideredMarketPrice;
  const marketId =
    readText(value, ["marketId"]) ||
    (selectedMarketPrice ? readText(selectedMarketPrice, ["marketId"]) : "");
  const marketPriceId =
    readText(value, ["marketPriceId"]) ||
    (selectedMarketPrice ? readText(selectedMarketPrice, ["id"]) : "");
  const baseMarketPrice = readNumber(value, ["baseMarketPrice"]);
  const finalPrice = readNumber(value, ["finalPrice"]);
  if (!marketId || !marketPriceId || baseMarketPrice === undefined || finalPrice === undefined) {
    return null;
  }
  const market = selectedMarketPrice && isRecord(selectedMarketPrice.market)
    ? selectedMarketPrice.market
    : null;
  return {
    strategyUsed: readText(value, ["strategyUsed"]) || "cheapest",
    marketId,
    marketPriceId,
    baseMarketPrice,
    marginAmount: readNumber(value, ["marginAmount"]) ?? 0,
    logisticsBuffer: readNumber(value, ["logisticsBuffer"]) ?? 0,
    riskBuffer: readNumber(value, ["riskBuffer"]) ?? 0,
    finalPrice,
    currency: readText(value, ["currency"]) || "NGN",
    explanation: readText(value, ["explanation"]) || undefined,
    marketName:
      (market ? readText(market, ["marketname", "name"]) : "") ||
      (selectedMarketPrice ? readText(selectedMarketPrice, ["marketName"]) : "") ||
      undefined,
  };
}

function parseBulkCalculationItem(item: unknown): BulkCalculationResult | null {
  if (!isRecord(item)) return null;
  const productId = readText(item, ["productId"]);
  const productOfferingId = readText(item, ["productOfferingId"]);
  const baseMarketPrice = readNumber(item, ["baseMarketPrice"]);
  const finalPrice = readNumber(item, ["finalPrice"]);
  if (!productId || !productOfferingId || baseMarketPrice === undefined || finalPrice === undefined) {
    return null;
  }
  return {
    productId,
    productOfferingId,
    marketId: readText(item, ["marketId"]) || undefined,
    marketPriceId: readText(item, ["marketPriceId"]) || undefined,
    strategyUsed: readText(item, ["strategyUsed"]) || "cheapest",
    baseMarketPrice,
    marginAmount: readNumber(item, ["marginAmount"]) ?? 0,
    logisticsBuffer: readNumber(item, ["logisticsBuffer"]) ?? 0,
    riskBuffer: readNumber(item, ["riskBuffer"]) ?? 0,
    finalPrice,
    currency: readText(item, ["currency"]) || "NGN",
    priceUnitCode: readText(item, ["priceUnitCode"]) || undefined,
    explanation: readText(item, ["explanation"]) || undefined,
  };
}

function parseGeneratedBuyPriceItem(item: unknown): GeneratedBuyPrice | null {
  if (!isRecord(item)) return null;
  const productOfferingId = readText(item, ["productOfferingId"]);
  const baseMarketPrice = readNumber(item, ["baseMarketPrice"]);
  const finalPrice = readNumber(item, ["finalPrice"]);
  if (!productOfferingId || baseMarketPrice === undefined || finalPrice === undefined) {
    return null;
  }
  return {
    id: readText(item, ["id"]) || productOfferingId,
    productOfferingId,
    baseMarketPrice,
    finalPrice,
    currency: readText(item, ["currency"]) || "NGN",
    strategyUsed: readText(item, ["strategyUsed"]) || "cheapest",
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
  };
}

function parseBulkJob<T>(body: unknown, parseItem: (item: unknown) => T | null): BulkJob<T> | null {
  if (!isRecord(body)) return null;
  const value = isRecord(body.data) ? body.data : body;
  const jobId = readText(value, ["jobId", "id"]);
  if (!jobId) return null;
  const status = (readText(value, ["status"]) || "pending") as BulkJobStatus;
  const results = Array.isArray(value.results)
    ? value.results.flatMap((item) => {
        const parsed = parseItem(item);
        return parsed ? [parsed] : [];
      })
    : [];
  return {
    jobId,
    mode: readText(value, ["mode"]) === "generate" ? "generate" : "calculate",
    status,
    totalTargets: readNumber(value, ["totalTargets"]) ?? 0,
    processedTargets: readNumber(value, ["processedTargets"]) ?? 0,
    done: typeof value.done === "boolean" ? value.done : status === "completed",
    failed: typeof value.failed === "boolean" ? value.failed : status === "failed",
    errorMessage: typeof value.errorMessage === "string" ? value.errorMessage : null,
    results,
  };
}

function parseCategories(body: unknown): CategoryOption[] {
  const value = isRecord(body)
    ? body.productCategories ?? body.categories ?? body.results ?? body.data ?? body
    : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = readText(item, ["id"]);
    const name = readText(item, ["name"]);
    return id && name ? [{ id, name }] : [];
  });
}

function parseBuyPrices(body: unknown): BuyPriceRecord[] {
  const value = isRecord(body) ? body.data ?? body.price ?? body.prices ?? body.results ?? body : body;
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item): BuyPriceRecord[] => {
    if (!isRecord(item)) return [];
    const id = readText(item, ["id"]);
    const productId = readText(item, ["productId"]);
    const productOfferingId = readText(item, ["productOfferingId"]);
    const marketId = readText(item, ["marketId"]);
    const baseMarketPrice = readNumber(item, ["baseMarketPrice"]);
    const finalPrice = readNumber(item, ["finalPrice"]);
    if (!id || baseMarketPrice === undefined || finalPrice === undefined) return [];
    const product = isRecord(item.product) ? item.product : null;
    const offering = isRecord(item.productOffering) ? item.productOffering : null;
    const packageValue = offering && isRecord(offering.package) ? offering.package : null;
    const market = isRecord(item.market) ? item.market : null;
    return [{
      id,
      productId: productId || undefined,
      productOfferingId: productOfferingId || undefined,
      marketId: marketId || undefined,
      productName: product ? readText(product, ["name"]) || undefined : undefined,
      offeringSku: offering ? readText(offering, ["sku"]) || undefined : undefined,
      packageName: packageValue ? readText(packageValue, ["name"]) || undefined : undefined,
      marketName: market ? readText(market, ["marketname", "name"]) || undefined : undefined,
      baseMarketPrice,
      marginAmount: readNumber(item, ["marginAmount"]) ?? 0,
      logisticsBuffer: readNumber(item, ["logisticsBuffer"]) ?? 0,
      riskBuffer: readNumber(item, ["riskBuffer"]) ?? 0,
      finalPrice,
      currency: readText(item, ["currency"]) || "NGN",
      strategyUsed: readText(item, ["strategyUsed"]) || "cheapest",
      isActive: typeof item.isActive === "boolean" ? item.isActive : true,
      validFrom: readText(item, ["validFrom"]) || undefined,
      validUntil: readText(item, ["validUntil"]) || undefined,
    }];
  });
}

function parseBuyPricePagination(body: unknown): BuyPricePagination {
  const pagination = isRecord(body) && isRecord(body.pagination) ? body.pagination : {};
  const page = readNumber(pagination, ["page"]) ?? 1;
  const limit = readNumber(pagination, ["limit"]) ?? 50;
  const total = readNumber(pagination, ["total"]) ?? 0;
  const totalPages = readNumber(pagination, ["totalPages"]) ?? 0;
  return { page, limit, total, totalPages };
}

function buildBuyPriceQuery(filters: BuyPriceFilters, page: number, limit: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  Object.entries(filters).forEach(([key, value]) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) return;
    if (key === "validFrom") {
      params.set(key, new Date(`${trimmedValue}T00:00:00.000Z`).toISOString());
      return;
    }
    if (key === "validTo") {
      params.set(key, new Date(`${trimmedValue}T23:59:59.999Z`).toISOString());
      return;
    }
    params.set(key, trimmedValue);
  });
  return params;
}

function formatMoney(value: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

function toLocalDateTime(value?: string) {
  if (!value) return localDateTime(2, true);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDateTime(2, true);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-NG", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatValidityRange(validFrom?: string, validUntil?: string) {
  return `${formatDate(validFrom)} - ${formatDate(validUntil)}`;
}

export function DashboardBuyPrices() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [buyPrices, setBuyPrices] = useState<BuyPriceRecord[]>([]);
  const [buyPriceFilters, setBuyPriceFilters] = useState<BuyPriceFilters>(emptyBuyPriceFilters);
  const [buyPricePagination, setBuyPricePagination] = useState<BuyPricePagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  });
  const [markets, setMarkets] = useState<MarketOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [mode, setMode] = useState<"single" | "bulk" | "generate">("single");
  const [form, setForm] = useState<BuyPriceForm>(emptyForm);
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [selectedOfferingIds, setSelectedOfferingIds] = useState<string[]>([]);
  const [calculateJob, setCalculateJob] = useState<BulkJob<BulkCalculationResult> | null>(null);
  const [createJob, setCreateJob] = useState<BulkJob<GeneratedBuyPrice> | null>(null);
  const [generateCategoryId, setGenerateCategoryId] = useState("");
  const [generateJob, setGenerateJob] = useState<BulkJob<GeneratedBuyPrice> | null>(null);
  const [createdPrice, setCreatedPrice] = useState<CreatedBuyPrice | null>(null);
  const [editingPrice, setEditingPrice] = useState<BuyPriceRecord | null>(null);
  const [editForm, setEditForm] = useState<BuyPriceEditForm | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadProducts = useCallback(async () => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    try {
      const [productsResponse, categoriesResponse, buyPricesResponse, marketsResponse] = await Promise.all([
        authenticatedFetch(`${productsEndpoint}?limit=100&offset=0`, {
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(categoriesEndpoint, {
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(`${buyPricesEndpoint}?${new URLSearchParams({ page: "1", limit: "50" })}`, {
          headers: { Accept: "application/json" },
        }),
        authenticatedFetch(marketsEndpoint, {
          headers: { Accept: "application/json" },
        }),
      ]);
      const productsBody = (await productsResponse.json().catch(() => null)) as unknown;
      const categoriesBody = (await categoriesResponse.json().catch(() => null)) as unknown;
      const buyPricesBody = (await buyPricesResponse.json().catch(() => null)) as unknown;
      const marketsBody = (await marketsResponse.json().catch(() => null)) as unknown;
      if (!productsResponse.ok) {
        throw new Error(responseMessage(productsBody, `Unable to load products (${productsResponse.status}).`));
      }
      if (!categoriesResponse.ok) {
        throw new Error(responseMessage(categoriesBody, `Unable to load product categories (${categoriesResponse.status}).`));
      }
      if (!buyPricesResponse.ok) {
        throw new Error(responseMessage(buyPricesBody, `Unable to load buy prices (${buyPricesResponse.status}).`));
      }
      if (!marketsResponse.ok) {
        throw new Error(responseMessage(marketsBody, `Unable to load markets (${marketsResponse.status}).`));
      }
      setProducts(parseProducts(productsBody));
      setCategories(parseCategories(categoriesBody));
      setBuyPrices(parseBuyPrices(buyPricesBody));
      setBuyPricePagination(parseBuyPricePagination(buyPricesBody));
      setMarkets(parseMarkets(marketsBody));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  const loadBuyPrices = useCallback(async (
    filters = buyPriceFilters,
    page = buyPricePagination.page,
  ) => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    const query = buildBuyPriceQuery(filters, page, buyPricePagination.limit);
    try {
      const response = await authenticatedFetch(`${buyPricesEndpoint}?${query}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load buy prices (${response.status}).`));
      }
      setBuyPrices(parseBuyPrices(body));
      setBuyPricePagination(parseBuyPricePagination(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load buy prices.");
    } finally {
      setIsLoading(false);
    }
  }, [buyPriceFilters, buyPricePagination.limit, buyPricePagination.page, isCustomer]);

  const loadActiveBuyPriceByProduct = useCallback(async (productId: string) => {
    if (isCustomer || !productId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`${buyPricesEndpoint}/product/${productId}/active`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load active product price (${response.status}).`));
      }
      setBuyPrices(parseBuyPrices(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load active product price.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  const loadBuyPricesByMarket = useCallback(async (marketId: string) => {
    if (isCustomer || !marketId) return;
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(`${buyPricesEndpoint}/market/${marketId}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load market buy prices (${response.status}).`));
      }
      setBuyPrices(parseBuyPrices(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load market buy prices.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadProducts(), 0);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const selectedProduct = products.find((product) => product.id === form.productId);
  const previewFinalPrice = useMemo(
    () =>
      ["baseMarketPrice", "marginAmount", "logisticsBuffer", "riskBuffer"].reduce(
        (total, key) => total + (Number(form[key as keyof BuyPriceForm]) || 0),
        0,
      ),
    [form],
  );

  function selectProduct(productId: string) {
    setForm((current) => ({
      ...current,
      productId,
      productOfferingId: "",
      marketPriceId: "",
      marketId: "",
      baseMarketPrice: "",
    }));
    setCreatedPrice(null);
    setCalculation(null);
  }

  function selectOffering(productOfferingId: string) {
    setForm((current) => ({
      ...current,
      productOfferingId,
      marketPriceId: "",
      marketId: "",
      baseMarketPrice: "",
    }));
    setCreatedPrice(null);
    setCalculation(null);
  }

  function invalidateCalculation(patch: Partial<BuyPriceForm>) {
    setForm((current) => ({ ...current, ...patch }));
    setCalculation(null);
    setCalculateJob(null);
    setCreateJob(null);
    setGenerateJob(null);
    setCreatedPrice(null);
  }

  function toggleBulkOffering(offeringId: string) {
    setSelectedOfferingIds((current) =>
      current.includes(offeringId)
        ? current.filter((id) => id !== offeringId)
        : [...current, offeringId],
    );
    setCalculateJob(null);
    setCreateJob(null);
  }

  async function calculateBuyPrice() {
    if (
      !form.productId ||
      !form.productOfferingId ||
      !form.observedFrom ||
      !form.observedTo
    ) {
      setError("Select a product, offering, and observation date range.");
      return;
    }
    if (new Date(form.observedTo) < new Date(form.observedFrom)) {
      setError("Observed to must be on or after observed from.");
      return;
    }
    setIsCalculating(true);
    setError("");
    setNotice("");
    setCalculation(null);
    setCreatedPrice(null);
    try {
      const response = await authenticatedFetch(calculateEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          productOfferingId: form.productOfferingId,
          strategy: form.strategyUsed,
          observedFrom: form.observedFrom,
          observedTo: form.observedTo,
          marginAmount: Number(form.marginAmount),
          logisticsBuffer: Number(form.logisticsBuffer),
          riskBuffer: Number(form.riskBuffer),
          currency: form.currency.trim() || "NGN",
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to calculate buy price (${response.status}).`));
      }
      const result = parseCalculation(body);
      if (!result) throw new Error("The buy-price calculation response was not in the expected format.");
      setCalculation(result);
      setForm((current) => ({
        ...current,
        marketId: result.marketId,
        marketPriceId: result.marketPriceId,
        baseMarketPrice: String(result.baseMarketPrice),
        marginAmount: String(result.marginAmount),
        logisticsBuffer: String(result.logisticsBuffer),
        riskBuffer: String(result.riskBuffer),
        currency: result.currency,
        strategyUsed: result.strategyUsed,
      }));
      setNotice(responseMessage(body, "Buy price calculated successfully."));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to calculate buy price.");
    } finally {
      setIsCalculating(false);
    }
  }

  const jobPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeoutRef = jobPollTimeoutRef;
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  function pollBulkJobUntilDone<T>(
    jobId: string,
    parseItem: (item: unknown) => T | null,
    onUpdate: (job: BulkJob<T>) => void,
  ): Promise<BulkJob<T>> {
    return new Promise((resolve, reject) => {
      const step = async () => {
        try {
          const response = await authenticatedFetch(`${bulkJobsEndpoint}/${jobId}/process-next`, {
            method: "POST",
            headers: { Accept: "application/json" },
          });
          const body = (await response.json().catch(() => null)) as unknown;
          if (!response.ok) {
            reject(new Error(responseMessage(body, `Unable to process bulk job (${response.status}).`)));
            return;
          }
          const job = parseBulkJob(body, parseItem);
          if (!job) {
            reject(new Error("The bulk job response was not in the expected format."));
            return;
          }
          onUpdate(job);
          if (job.done || job.failed) {
            resolve(job);
            return;
          }
          jobPollTimeoutRef.current = setTimeout(step, 1500);
        } catch (requestError) {
          reject(requestError instanceof Error ? requestError : new Error("Unable to process bulk job."));
        }
      };
      void step();
    });
  }

  async function startBulkJob<T>(
    kind: "calculate" | "generate",
    payload: Record<string, unknown>,
    parseItem: (item: unknown) => T | null,
    onUpdate: (job: BulkJob<T> | null) => void,
  ): Promise<BulkJob<T>> {
    onUpdate(null);
    const response = await authenticatedFetch(`${bulkJobsEndpoint}/${kind}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new Error(responseMessage(body, `Unable to start ${kind} job (${response.status}).`));
    }
    const job = parseBulkJob(body, parseItem);
    if (!job) throw new Error("The bulk job response was not in the expected format.");
    onUpdate(job);
    if (job.done || job.failed) return job;
    return pollBulkJobUntilDone(job.jobId, parseItem, onUpdate);
  }

  async function calculateBulkBuyPrices() {
    if (
      !selectedOfferingIds.length ||
      !form.observedFrom ||
      !form.observedTo
    ) {
      setError("Select at least one offering and an observation date range.");
      return;
    }
    if (new Date(form.observedTo) < new Date(form.observedFrom)) {
      setError("Observed to must be on or after observed from.");
      return;
    }
    if (
      [form.marginAmount, form.riskBuffer].some(
        (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
      )
    ) {
      setError("Margin and risk buffer must be valid non-negative numbers.");
      return;
    }
    setIsCalculating(true);
    setError("");
    setNotice("");
    setCreateJob(null);
    try {
      const job = await startBulkJob(
        "calculate",
        {
          strategy: form.strategyUsed,
          productOfferingIds: selectedOfferingIds,
          observedFrom: form.observedFrom,
          observedTo: form.observedTo,
          marginAmount: Number(form.marginAmount),
          riskBuffer: Number(form.riskBuffer),
          currency: form.currency.trim() || "NGN",
        },
        parseBulkCalculationItem,
        setCalculateJob,
      );
      if (job.failed) {
        throw new Error(job.errorMessage || "The bulk calculation job failed.");
      }
      setNotice(`${job.results.length} buy prices calculated successfully.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to calculate bulk buy prices.");
    } finally {
      setIsCalculating(false);
    }
  }

  async function createBulkBuyPrices() {
    if (!calculateJob?.done || calculateJob.failed || !calculateJob.results.length) {
      setError("Calculate bulk buy prices before creating them.");
      return;
    }
    if (!form.validFrom || !form.validUntil || new Date(form.validUntil) <= new Date(form.validFrom)) {
      setError("Valid until must be later than valid from.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const job = await startBulkJob(
        "generate",
        {
          strategy: form.strategyUsed,
          productOfferingIds: selectedOfferingIds,
          observedFrom: form.observedFrom,
          observedTo: form.observedTo,
          marginAmount: Number(form.marginAmount),
          riskBuffer: Number(form.riskBuffer),
          currency: form.currency.trim() || "NGN",
          isActive: form.isActive,
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil).toISOString(),
        },
        parseGeneratedBuyPriceItem,
        setCreateJob,
      );
      if (job.failed) {
        throw new Error(job.errorMessage || "The bulk create job failed.");
      }
      setNotice(`${job.results.length} buy prices created successfully.`);
      await loadBuyPrices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create bulk buy prices.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function generateBulkBuyPrices() {
    if (
      !generateCategoryId ||
      !form.observedFrom ||
      !form.observedTo ||
      !form.validFrom ||
      !form.validUntil
    ) {
      setError("Select a category, observation dates, and validity window.");
      return;
    }
    if (new Date(form.observedTo) < new Date(form.observedFrom)) {
      setError("Observed to must be on or after observed from.");
      return;
    }
    if (new Date(form.validUntil) <= new Date(form.validFrom)) {
      setError("Valid until must be later than valid from.");
      return;
    }
    if (
      [form.marginAmount, form.riskBuffer].some(
        (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
      )
    ) {
      setError("Margin and risk buffer must be valid non-negative numbers.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const job = await startBulkJob(
        "generate",
        {
          strategy: form.strategyUsed,
          categoryId: generateCategoryId,
          observedFrom: form.observedFrom,
          observedTo: form.observedTo,
          marginAmount: Number(form.marginAmount),
          riskBuffer: Number(form.riskBuffer),
          currency: form.currency.trim() || "NGN",
          isActive: form.isActive,
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil).toISOString(),
        },
        parseGeneratedBuyPriceItem,
        setGenerateJob,
      );
      if (job.failed) {
        throw new Error(job.errorMessage || "The bulk generation job failed.");
      }
      setNotice(`${job.results.length} buy prices generated successfully.`);
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate bulk buy prices.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditBuyPrice(price: BuyPriceRecord) {
    setEditingPrice(price);
    setEditForm({
      marginAmount: String(price.marginAmount),
      logisticsBuffer: String(price.logisticsBuffer),
      riskBuffer: String(price.riskBuffer),
      finalPrice: String(price.finalPrice),
      validUntil: toLocalDateTime(price.validUntil),
      isActive: price.isActive,
    });
    setError("");
    setNotice("");
  }

  async function updateBuyPrice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingPrice || !editForm) return;
    const amounts = [
      editForm.marginAmount,
      editForm.logisticsBuffer,
      editForm.riskBuffer,
      editForm.finalPrice,
    ];
    if (
      amounts.some((value) => value.trim() === "" || !Number.isFinite(Number(value)) || Number(value) < 0) ||
      !editForm.validUntil
    ) {
      setError("Enter valid non-negative amounts and a valid-until date.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${buyPricesEndpoint}/${editingPrice.id}`, {
        method: "PATCH",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          marginAmount: Number(editForm.marginAmount),
          logisticsBuffer: Number(editForm.logisticsBuffer),
          riskBuffer: Number(editForm.riskBuffer),
          finalPrice: Number(editForm.finalPrice),
          validUntil: new Date(editForm.validUntil).toISOString(),
          isActive: editForm.isActive,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to update buy price (${response.status}).`));
      }
      setEditingPrice(null);
      setEditForm(null);
      setNotice(responseMessage(body, "Buy price updated successfully."));
      await loadBuyPrices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update buy price.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !form.productId ||
      !form.productOfferingId ||
      !form.marketId ||
      !form.marketPriceId ||
      form.baseMarketPrice.trim() === ""
    ) {
      setError("Select a product, offering, and market price, then complete the pricing fields.");
      return;
    }
    if (!calculation) {
      setError("Calculate the buy price before creating it.");
      return;
    }
    if (
      [form.baseMarketPrice, form.marginAmount, form.logisticsBuffer, form.riskBuffer].some(
        (value) => !Number.isFinite(Number(value)) || Number(value) < 0,
      )
    ) {
      setError("All price amounts must be valid non-negative numbers.");
      return;
    }
    if (!form.validFrom || !form.validUntil || new Date(form.validUntil) <= new Date(form.validFrom)) {
      setError("Valid until must be later than valid from.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");
    setCreatedPrice(null);
    try {
      const response = await authenticatedFetch(buyPricesEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          productOfferingId: form.productOfferingId,
          marketId: form.marketId,
          marketPriceId: form.marketPriceId,
          baseMarketPrice: Number(form.baseMarketPrice),
          marginAmount: Number(form.marginAmount),
          logisticsBuffer: Number(form.logisticsBuffer),
          riskBuffer: Number(form.riskBuffer),
          currency: form.currency.trim() || "NGN",
          strategyUsed: form.strategyUsed,
          isActive: form.isActive,
          validFrom: new Date(form.validFrom).toISOString(),
          validUntil: new Date(form.validUntil).toISOString(),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to create buy price (${response.status}).`));
      }
      const price = parseCreatedBuyPrice(body);
      if (!price) throw new Error("The buy-price response was not in the expected format.");
      setCreatedPrice(price);
      setNotice(responseMessage(body, "Buy price created successfully."));
      await loadBuyPrices();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create buy price.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function applyBuyPriceFilters(patch: Partial<BuyPriceFilters>) {
    const nextFilters = { ...buyPriceFilters, ...patch };
    setBuyPriceFilters(nextFilters);
    setBuyPricePagination((current) => ({ ...current, page: 1 }));
    void loadBuyPrices(nextFilters, 1);
  }

  function clearBuyPriceFilters() {
    const nextFilters = emptyBuyPriceFilters();
    setBuyPriceFilters(nextFilters);
    setBuyPricePagination((current) => ({ ...current, page: 1 }));
    void loadBuyPrices(nextFilters, 1);
  }

  function goToBuyPricePage(page: number) {
    const nextPage = Math.max(1, Math.min(page, Math.max(buyPricePagination.totalPages, 1)));
    setBuyPricePagination((current) => ({ ...current, page: nextPage }));
    void loadBuyPrices(buyPriceFilters, nextPage);
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <BadgeDollarSign className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Buy prices are restricted</h1>
        <p className="mt-2 text-sm font-medium text-black/50">
          This page is available only in the non-customer dashboard.
        </p>
      </section>
    );
  }

  const inputClass =
    "mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45 disabled:opacity-60";
  const allOfferings = products.flatMap((product) =>
    product.offerings.map((offering) => ({ ...offering, productName: product.name })),
  );
  const variantOptions = Array.from(
    new Map(
      allOfferings
        .filter((offering) => offering.variantId && offering.variantName)
        .map((offering) => [offering.variantId, { id: offering.variantId!, name: offering.variantName! }]),
    ).values(),
  );
  const brandOptions = Array.from(
    new Map(
      allOfferings
        .filter((offering) => offering.brandId && offering.brandName)
        .map((offering) => [offering.brandId, { id: offering.brandId!, name: offering.brandName! }]),
    ).values(),
  );
  const packageOptions = Array.from(
    new Map(
      allOfferings
        .filter((offering) => offering.packageId && offering.packageName)
        .map((offering) => [offering.packageId, { id: offering.packageId!, name: offering.packageName! }]),
    ).values(),
  );

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Buy Prices</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Build an active buying price from an observed market price and operational buffers.
          </p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadProducts()}>
          <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
          Refresh catalogue
        </button>
      </header>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="space-y-4 border-b border-black/10 px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div><h2 className="text-base font-black text-black">Existing Buy Prices</h2><p className="mt-1 text-xs font-medium text-black/45">{buyPricePagination.total} total records - showing {buyPrices.length}</p></div>
            <div className="flex gap-2">
              <button className="flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-xs font-black text-black/60" type="button" onClick={() => void loadBuyPrices()}><RefreshCw className={isLoading ? "animate-spin" : ""} size={15} />Refresh</button>
              <button className="flex h-11 items-center justify-center rounded-xl border border-[#f10606]/20 bg-[#fff0f0] px-4 text-xs font-black text-[#f10606]" type="button" onClick={clearBuyPriceFilters}>Clear</button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" placeholder="Search buy prices..." value={buyPriceFilters.search} onChange={(event) => applyBuyPriceFilters({ search: event.target.value })} />
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.productId} onChange={(event) => applyBuyPriceFilters({ productId: event.target.value, productOfferingId: "" })}>
              <option value="">All products</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.productOfferingId} onChange={(event) => applyBuyPriceFilters({ productOfferingId: event.target.value })}>
              <option value="">All sellable offerings</option>
              {allOfferings.filter((offering) => !buyPriceFilters.productId || products.find((product) => product.id === buyPriceFilters.productId)?.offerings.some((item) => item.id === offering.id)).map((offering) => (
                <option key={offering.id} value={offering.id}>{offering.productName} · {offering.sku}</option>
              ))}
            </select>
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.marketId} onChange={(event) => applyBuyPriceFilters({ marketId: event.target.value })}>
              <option value="">All markets</option>
              {markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}
            </select>
            <input className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" placeholder="Market price ID" value={buyPriceFilters.marketPriceId} onChange={(event) => applyBuyPriceFilters({ marketPriceId: event.target.value })} />
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.variantId} onChange={(event) => applyBuyPriceFilters({ variantId: event.target.value })}>
              <option value="">All variants</option>
              {variantOptions.map((variant) => <option key={variant.id} value={variant.id}>{variant.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.brandId} onChange={(event) => applyBuyPriceFilters({ brandId: event.target.value })}>
              <option value="">All brands</option>
              {brandOptions.map((brand) => <option key={brand.id} value={brand.id}>{brand.name}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.packageId} onChange={(event) => applyBuyPriceFilters({ packageId: event.target.value })}>
              <option value="">All packages</option>
              {packageOptions.map((packageOption) => <option key={packageOption.id} value={packageOption.id}>{packageOption.name}</option>)}
            </select>
            <input className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" placeholder="Unit, e.g. bag" value={buyPriceFilters.unit} onChange={(event) => applyBuyPriceFilters({ unit: event.target.value })} />
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.strategyUsed} onChange={(event) => applyBuyPriceFilters({ strategyUsed: event.target.value })}>
              <option value="">All strategies</option>
              {buyPriceStrategies.map((strategy) => <option key={strategy} value={strategy}>{formatLabel(strategy)}</option>)}
            </select>
            <select className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" value={buyPriceFilters.isActive} onChange={(event) => applyBuyPriceFilters({ isActive: event.target.value })}>
              <option value="">Any status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" type="date" value={buyPriceFilters.validFrom} onChange={(event) => applyBuyPriceFilters({ validFrom: event.target.value })} />
              <input className="h-11 rounded-xl border border-black/10 bg-[#fafafa] px-3 text-xs font-bold outline-none focus:border-[#f10606]/40" type="date" value={buyPriceFilters.validTo} onChange={(event) => applyBuyPriceFilters({ validTo: event.target.value })} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-[1.08fr_0.58fr_0.7fr_0.7fr_0.55fr_0.78fr_0.46fr_0.3fr] gap-4 bg-[#fff5f5] px-5 py-3 text-[10px] font-black uppercase text-black/45">
          <span>Offering</span><span>Unit</span><span>Base price</span><span>Final price</span><span>Strategy</span><span>Validity</span><span>Status</span><span className="text-right">Edit</span>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
        ) : buyPrices.length ? (
          buyPrices.map((price) => {
            const product =
              products.find((item) => item.id === price.productId) ??
              products.find((item) => item.offerings.some((offering) => offering.id === price.productOfferingId));
            const offering = product?.offerings.find((item) => item.id === price.productOfferingId);
            const packageName = price.packageName || offering?.packageName || "-";
            const marketName =
              price.marketName ||
              markets.find((market) => market.id === price.marketId)?.name;
            return (
              <article className="grid grid-cols-[1.08fr_0.58fr_0.7fr_0.7fr_0.55fr_0.78fr_0.46fr_0.3fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-xs" key={price.id}>
                <div className="min-w-0"><p className="truncate font-black text-black">{price.offeringSku || offering?.sku || price.productOfferingId || "Offering unavailable"}</p><p className="mt-1 truncate text-[10px] font-bold text-black/40">{price.productName || product?.name || price.productId || "Product unavailable"}{marketName ? ` · ${marketName}` : ""}</p></div>
                <p className="truncate font-bold text-black/55">{packageName}</p>
                <p className="font-bold text-black/60">{formatMoney(price.baseMarketPrice, price.currency)}</p>
                <p className="font-black text-[#f10606]">{formatMoney(price.finalPrice, price.currency)}</p>
                <p className="font-bold capitalize text-black/55">{price.strategyUsed}</p>
                <p className="font-bold text-black/55">{formatValidityRange(price.validFrom, price.validUntil)}</p>
                <span className={`w-max rounded-full px-2 py-1 text-[9px] font-black ${price.isActive ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/45"}`}>{price.isActive ? "Active" : "Inactive"}</span>
                <div className="flex justify-end"><button aria-label={`Edit buy price ${price.id}`} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606]" type="button" onClick={() => openEditBuyPrice(price)}><Pencil size={15} /></button></div>
              </article>
            );
          })
        ) : <div className="p-8 text-center"><p className="text-sm font-black text-black">No buy prices found</p></div>}
        <div className="flex flex-col gap-3 border-t border-black/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-black/45">
            Page {buyPricePagination.page} of {Math.max(buyPricePagination.totalPages, 1)} · {buyPricePagination.limit} per page
          </p>
          <div className="flex gap-2">
            <button className="h-10 rounded-xl border border-black/10 px-4 text-xs font-black text-black/60 disabled:opacity-40" disabled={isLoading || buyPricePagination.page <= 1} type="button" onClick={() => goToBuyPricePage(buyPricePagination.page - 1)}>Previous</button>
            <button className="h-10 rounded-xl border border-black/10 px-4 text-xs font-black text-black/60 disabled:opacity-40" disabled={isLoading || buyPricePagination.page >= Math.max(buyPricePagination.totalPages, 1)} type="button" onClick={() => goToBuyPricePage(buyPricePagination.page + 1)}>Next</button>
          </div>
        </div>
      </section>

      <div className="grid max-w-2xl grid-cols-3 rounded-xl bg-black/[0.04] p-1">
        <button className={`h-11 rounded-lg text-xs font-black ${mode === "single" ? "bg-white text-[#f10606] shadow-sm" : "text-black/45"}`} type="button" onClick={() => setMode("single")}>Single buy price</button>
        <button className={`h-11 rounded-lg text-xs font-black ${mode === "bulk" ? "bg-white text-[#f10606] shadow-sm" : "text-black/45"}`} type="button" onClick={() => setMode("bulk")}>Bulk calculation</button>
        <button className={`h-11 rounded-lg text-xs font-black ${mode === "generate" ? "bg-white text-[#f10606] shadow-sm" : "text-black/45"}`} type="button" onClick={() => setMode("generate")}>Generate by category</button>
      </div>

      {mode === "single" ? (
      <form className="grid gap-5 xl:grid-cols-[1fr_19rem]" onSubmit={submit}>
        <div className="space-y-5">
          <Section number="1" title="Calculation Inputs" description="Choose the offering, strategy, and observation window.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Product"><select className={inputClass} disabled={isLoading} value={form.productId} onChange={(event) => selectProduct(event.target.value)}><option value="">{isLoading ? "Loading products..." : "Select product"}</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}{product.sku ? ` · ${product.sku}` : ""}</option>)}</select></Field>
              <Field label="Sellable offering"><select className={inputClass} disabled={!selectedProduct} value={form.productOfferingId} onChange={(event) => selectOffering(event.target.value)}><option value="">Select offering</option>{selectedProduct?.offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.sku} · {offering.label}</option>)}</select></Field>
              <Field label="Strategy"><select className={inputClass} value={form.strategyUsed} onChange={(event) => invalidateCalculation({ strategyUsed: event.target.value })}>{buyPriceStrategies.map((strategy) => <option key={strategy} value={strategy}>{formatLabel(strategy)}</option>)}</select></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Observed from"><input className={inputClass} type="date" value={form.observedFrom} onChange={(event) => invalidateCalculation({ observedFrom: event.target.value })} /></Field>
                <Field label="Observed to"><input className={inputClass} type="date" value={form.observedTo} onChange={(event) => invalidateCalculation({ observedTo: event.target.value })} /></Field>
              </div>
            </div>
          </Section>

          <Section number="2" title="Price Composition" description="The final price is calculated from these four amounts.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <NumberField disabled label="Base market price" value={form.baseMarketPrice} onChange={() => {}} />
              <NumberField label="Margin amount" value={form.marginAmount} onChange={(value) => invalidateCalculation({ marginAmount: value })} />
              <NumberField label="Logistics buffer" value={form.logisticsBuffer} onChange={(value) => invalidateCalculation({ logisticsBuffer: value })} />
              <NumberField label="Risk buffer" value={form.riskBuffer} onChange={(value) => invalidateCalculation({ riskBuffer: value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Currency"><input className={inputClass} value={form.currency} onChange={(event) => invalidateCalculation({ currency: event.target.value })} /></Field>
              <ReadOnly label="Selected market" value={calculation?.marketName || (calculation ? calculation.marketId : "Calculated automatically")} />
            </div>
            <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-[#f10606]/20 bg-[#fff0f0] px-5 text-sm font-black text-[#f10606] disabled:opacity-60" disabled={isCalculating || isLoading} type="button" onClick={() => void calculateBuyPrice()}>{isCalculating ? <LoaderCircle className="animate-spin" size={17} /> : <BadgeDollarSign size={17} />}{isCalculating ? "Calculating..." : "Calculate buy price"}</button>
            {calculation?.explanation ? <p className="rounded-xl bg-emerald-50 p-3 text-xs font-bold text-emerald-700">{calculation.explanation}</p> : null}
          </Section>

          <Section number="3" title="Validity" description="Control when this buy price should be available.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Valid from"><input className={inputClass} type="datetime-local" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} /></Field>
              <Field label="Valid until"><input className={inputClass} type="datetime-local" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /></Field>
              <Field label="Status"><select className={inputClass} value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            </div>
          </Section>
        </div>

        <aside className="xl:sticky xl:top-24 xl:h-max">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-black uppercase text-black/42">Final buy price</p>
            <p className="mt-2 text-3xl font-black text-[#f10606]">{formatMoney(calculation?.finalPrice ?? previewFinalPrice, form.currency || "NGN")}</p>
            <div className="mt-4 space-y-2 text-xs font-bold text-black/55">
              <PriceLine label="Market price" value={Number(form.baseMarketPrice) || 0} />
              <PriceLine label="Margin" value={Number(form.marginAmount) || 0} />
              <PriceLine label="Logistics" value={Number(form.logisticsBuffer) || 0} />
              <PriceLine label="Risk" value={Number(form.riskBuffer) || 0} />
            </div>
            {createdPrice ? (
              <div className="mt-4 rounded-xl bg-emerald-50 p-3">
                <p className="flex items-center gap-2 text-xs font-black text-emerald-700"><Check size={14} /> Created successfully</p>
                <p className="mt-2 break-all text-[10px] font-bold text-emerald-700">{createdPrice.id}</p>
                <p className="mt-1 text-sm font-black text-emerald-800">{formatMoney(createdPrice.finalPrice, createdPrice.currency)}</p>
              </div>
            ) : null}
            <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting || isLoading || !calculation} type="submit">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{isSubmitting ? "Creating..." : "Create buy price"}</button>
          </section>
        </aside>
      </form>
      ) : mode === "bulk" ? (
        <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <Section number="1" title="Select Sellable Offerings" description="Choose offerings across one or more products.">
              {(() => {
                const allOfferingIds = products.flatMap((product) => product.offerings.map((offering) => offering.id));
                const allSelected = allOfferingIds.length > 0 && allOfferingIds.every((id) => selectedOfferingIds.includes(id));
                return (
                  <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-black/10 bg-[#fafafa] p-3 text-xs font-black text-black">
                    <input
                      checked={allSelected}
                      type="checkbox"
                      onChange={() => {
                        setSelectedOfferingIds(allSelected ? [] : allOfferingIds);
                        setCalculateJob(null);
                        setCreateJob(null);
                      }}
                    />
                    {allSelected ? "Clear all offerings" : "Select all offerings"}
                    <span className="ml-auto text-[10px] font-bold text-black/40">{selectedOfferingIds.length} selected</span>
                  </label>
                );
              })()}
              <div className="max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                {products.map((product) => (
                  <article className="rounded-xl border border-black/10 bg-[#fafafa] p-3" key={product.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-sm font-black text-black">{product.name}</p><p className="mt-1 text-[10px] font-bold text-black/40">{product.sku || product.id}</p></div>
                      <button className="text-[10px] font-black text-[#f10606]" type="button" onClick={() => {
                        const ids = product.offerings.map((offering) => offering.id);
                        const allSelected = ids.every((id) => selectedOfferingIds.includes(id));
                        setSelectedOfferingIds((current) => allSelected ? current.filter((id) => !ids.includes(id)) : Array.from(new Set([...current, ...ids])));
                        setCalculateJob(null);
                        setCreateJob(null);
                      }}>{product.offerings.every((offering) => selectedOfferingIds.includes(offering.id)) ? "Clear product" : "Select product"}</button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {product.offerings.map((offering) => (
                        <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${selectedOfferingIds.includes(offering.id) ? "border-[#f10606]/30 bg-[#fff0f0]" : "border-black/10 bg-white"}`} key={offering.id}>
                          <input checked={selectedOfferingIds.includes(offering.id)} className="mt-0.5" type="checkbox" onChange={() => toggleBulkOffering(offering.id)} />
                          <span className="min-w-0"><span className="block truncate text-xs font-black text-black">{offering.sku}</span><span className="mt-1 block truncate text-[10px] font-bold text-black/45">{offering.label || "Sellable offering"}</span></span>
                        </label>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </Section>

            <Section number="2" title="Shared Calculation Inputs" description="These settings apply to every selected offering.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Strategy"><select className={inputClass} value={form.strategyUsed} onChange={(event) => invalidateCalculation({ strategyUsed: event.target.value })}>{buyPriceStrategies.map((strategy) => <option key={strategy} value={strategy}>{formatLabel(strategy)}</option>)}</select></Field>
                <Field label="Currency"><input className={inputClass} value={form.currency} onChange={(event) => invalidateCalculation({ currency: event.target.value })} /></Field>
                <Field label="Observed from"><input className={inputClass} type="date" value={form.observedFrom} onChange={(event) => invalidateCalculation({ observedFrom: event.target.value })} /></Field>
                <Field label="Observed to"><input className={inputClass} type="date" value={form.observedTo} onChange={(event) => invalidateCalculation({ observedTo: event.target.value })} /></Field>
                <NumberField label="Margin amount" value={form.marginAmount} onChange={(value) => invalidateCalculation({ marginAmount: value })} />
                <NumberField label="Risk buffer" value={form.riskBuffer} onChange={(value) => invalidateCalculation({ riskBuffer: value })} />
                <Field label="Valid from"><input className={inputClass} type="datetime-local" value={form.validFrom} onChange={(event) => setForm((current) => ({ ...current, validFrom: event.target.value }))} /></Field>
                <Field label="Valid until"><input className={inputClass} type="datetime-local" value={form.validUntil} onChange={(event) => setForm((current) => ({ ...current, validUntil: event.target.value }))} /></Field>
                <Field label="Status"><select className={inputClass} value={form.isActive ? "active" : "inactive"} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === "active" }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            </Section>

            {calculateJob ? (
              <Section
                number="3"
                title="Calculation Results"
                description={calculateJob.done ? `${calculateJob.results.length} offering prices were calculated.` : "Calculating selected offerings..."}
              >
                <BulkJobProgress job={calculateJob} />
                {calculateJob.results.length ? (
                  <div className="overflow-hidden rounded-xl border border-black/10">
                    <div className="grid grid-cols-[1.25fr_0.8fr_0.8fr] gap-3 bg-[#fff5f5] px-4 py-3 text-[10px] font-black uppercase text-black/45"><span>Offering</span><span>Base price</span><span>Final price</span></div>
                    {calculateJob.results.map((result) => {
                      const product = products.find((item) => item.id === result.productId);
                      const offering = product?.offerings.find((item) => item.id === result.productOfferingId);
                      return <article className="grid grid-cols-[1.25fr_0.8fr_0.8fr] items-center gap-3 border-t border-black/10 px-4 py-3 text-xs" key={result.productOfferingId}><div className="min-w-0"><p className="truncate font-black text-black">{offering?.sku || result.productOfferingId}</p><p className="mt-1 truncate text-[10px] font-bold text-black/40">{product?.name || result.productId}</p></div><p className="font-bold text-black/60">{formatMoney(result.baseMarketPrice, result.currency)}</p><p className="font-black text-[#f10606]">{formatMoney(result.finalPrice, result.currency)}</p></article>;
                    })}
                  </div>
                ) : null}
              </Section>
            ) : null}
          </div>

          <aside className="xl:sticky xl:top-24 xl:h-max">
            <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-black uppercase text-black/42">Bulk calculation</p>
              <p className="mt-2 text-3xl font-black text-black">{selectedOfferingIds.length}</p>
              <p className="mt-1 text-xs font-bold text-black/45">offerings selected</p>
              {calculateJob?.done && !calculateJob.failed ? <div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-emerald-700"><Check size={14} /> Calculation completed</p><p className="mt-2 text-sm font-black text-emerald-800">{calculateJob.results.length} results</p></div> : null}
              <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isCalculating || isLoading || !selectedOfferingIds.length} type="button" onClick={() => void calculateBulkBuyPrices()}>{isCalculating ? <LoaderCircle className="animate-spin" size={17} /> : <BadgeDollarSign size={17} />}{isCalculating ? "Calculating..." : "Calculate bulk prices"}</button>
              {calculateJob?.done && !calculateJob.failed && calculateJob.results.length ? (
                <button className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#f10606]/20 bg-[#fff0f0] text-sm font-black text-[#f10606] disabled:opacity-60" disabled={isSubmitting || isLoading} type="button" onClick={() => void createBulkBuyPrices()}>{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{isSubmitting ? "Creating..." : "Create buy prices"}</button>
              ) : null}
              {createJob ? (
                <div className="mt-3">
                  <BulkJobProgress job={createJob} />
                  {createJob.done && !createJob.failed ? <p className="mt-2 text-xs font-bold text-emerald-700">{createJob.results.length} buy prices created.</p> : null}
                </div>
              ) : null}
            </section>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[1fr_20rem]">
          <div className="space-y-5">
            <Section number="1" title="Category Scope" description="Generate persisted buy prices for every eligible offering in a category.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Product category"><select className={inputClass} disabled={isLoading} value={generateCategoryId} onChange={(event) => { setGenerateCategoryId(event.target.value); setGenerateJob(null); }}><option value="">Select active category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></Field>
                <Field label="Strategy"><select className={inputClass} value={form.strategyUsed} onChange={(event) => invalidateCalculation({ strategyUsed: event.target.value })}>{buyPriceStrategies.map((strategy) => <option key={strategy} value={strategy}>{formatLabel(strategy)}</option>)}</select></Field>
                <Field label="Currency"><input className={inputClass} value={form.currency} onChange={(event) => invalidateCalculation({ currency: event.target.value })} /></Field>
              </div>
            </Section>

            <Section number="2" title="Calculation & Validity" description="These values apply to every generated buy price.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Field label="Observed from"><input className={inputClass} type="date" value={form.observedFrom} onChange={(event) => invalidateCalculation({ observedFrom: event.target.value })} /></Field>
                <Field label="Observed to"><input className={inputClass} type="date" value={form.observedTo} onChange={(event) => invalidateCalculation({ observedTo: event.target.value })} /></Field>
                <NumberField label="Margin amount" value={form.marginAmount} onChange={(value) => invalidateCalculation({ marginAmount: value })} />
                <NumberField label="Risk buffer" value={form.riskBuffer} onChange={(value) => invalidateCalculation({ riskBuffer: value })} />
                <Field label="Valid from"><input className={inputClass} type="datetime-local" value={form.validFrom} onChange={(event) => invalidateCalculation({ validFrom: event.target.value })} /></Field>
                <Field label="Valid until"><input className={inputClass} type="datetime-local" value={form.validUntil} onChange={(event) => invalidateCalculation({ validUntil: event.target.value })} /></Field>
                <Field label="Status"><select className={inputClass} value={form.isActive ? "active" : "inactive"} onChange={(event) => invalidateCalculation({ isActive: event.target.value === "active" })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
            </Section>

            {generateJob ? (
              <Section
                number="3"
                title="Generated Buy Prices"
                description={generateJob.done ? `${generateJob.results.length} persisted buy prices were returned.` : "Generating buy prices..."}
              >
                <BulkJobProgress job={generateJob} />
                {generateJob.results.length ? (
                  <div className="overflow-hidden rounded-xl border border-black/10">
                    <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.55fr] gap-3 bg-[#fff5f5] px-4 py-3 text-[10px] font-black uppercase text-black/45"><span>Offering</span><span>Base price</span><span>Final price</span><span>Status</span></div>
                    {generateJob.results.map((price) => {
                      const product = products.find((item) => item.offerings.some((offering) => offering.id === price.productOfferingId));
                      const offering = product?.offerings.find((item) => item.id === price.productOfferingId);
                      return <article className="grid grid-cols-[1.2fr_0.8fr_0.8fr_0.55fr] items-center gap-3 border-t border-black/10 px-4 py-3 text-xs" key={price.id}><div className="min-w-0"><p className="truncate font-black text-black">{offering?.sku || price.productOfferingId}</p><p className="mt-1 truncate text-[9px] font-bold text-black/40">{price.id}</p></div><p className="font-bold text-black/60">{formatMoney(price.baseMarketPrice, price.currency)}</p><p className="font-black text-[#f10606]">{formatMoney(price.finalPrice, price.currency)}</p><span className={`w-max rounded-full px-2 py-1 text-[9px] font-black ${price.isActive ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/45"}`}>{price.isActive ? "Active" : "Inactive"}</span></article>;
                    })}
                  </div>
                ) : null}
              </Section>
            ) : null}
          </div>

          <aside className="xl:sticky xl:top-24 xl:h-max">
            <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
              <p className="text-xs font-black uppercase text-black/42">Category generation</p>
              <p className="mt-2 text-lg font-black text-black">{categories.find((category) => category.id === generateCategoryId)?.name || "No category selected"}</p>
              <p className="mt-2 text-xs font-bold leading-5 text-black/45">Creates and persists buy prices for eligible offerings using the selected category and shared settings.</p>
              {generateJob?.done && !generateJob.failed ? <div className="mt-4 rounded-xl bg-emerald-50 p-3"><p className="flex items-center gap-2 text-xs font-black text-emerald-700"><Check size={14} /> Generation completed</p><p className="mt-2 text-sm font-black text-emerald-800">{generateJob.results.length} prices created</p></div> : null}
              <button className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting || isLoading || !generateCategoryId} type="button" onClick={() => void generateBulkBuyPrices()}>{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{isSubmitting ? "Creating..." : "Create buy prices"}</button>
            </section>
          </aside>
        </div>
      )}

      {editingPrice && editForm ? (
        <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) { setEditingPrice(null); setEditForm(null); } }}>
          <section aria-modal="true" className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog">
            <header className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-[#f10606]">Buy price</p><h2 className="mt-1 text-lg font-black text-black">Edit buy price</h2><p className="mt-1 break-all text-[10px] font-bold text-black/40">{editingPrice.id}</p></div><button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" disabled={isSubmitting} type="button" onClick={() => { setEditingPrice(null); setEditForm(null); }}><X size={18} /></button></header>
            <form className="space-y-4" onSubmit={updateBuyPrice}>
              <ReadOnly label="Base market price" value={formatMoney(editingPrice.baseMarketPrice, editingPrice.currency)} />
              <div className="grid gap-3 sm:grid-cols-2">
                <NumberField label="Margin amount" value={editForm.marginAmount} onChange={(value) => setEditForm((current) => current ? { ...current, marginAmount: value } : current)} />
                <NumberField label="Logistics buffer" value={editForm.logisticsBuffer} onChange={(value) => setEditForm((current) => current ? { ...current, logisticsBuffer: value } : current)} />
                <NumberField label="Risk buffer" value={editForm.riskBuffer} onChange={(value) => setEditForm((current) => current ? { ...current, riskBuffer: value } : current)} />
                <NumberField label="Final price" value={editForm.finalPrice} onChange={(value) => setEditForm((current) => current ? { ...current, finalPrice: value } : current)} />
                <Field label="Valid until"><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={editForm.validUntil} onChange={(event) => setEditForm((current) => current ? { ...current, validUntil: event.target.value } : current)} /></Field>
                <Field label="Status"><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={editForm.isActive ? "active" : "inactive"} onChange={(event) => setEditForm((current) => current ? { ...current, isActive: event.target.value === "active" } : current)}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
              </div>
              <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Pencil size={17} />}{isSubmitting ? "Updating..." : "Update buy price"}</button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function Section({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.03)]"><header className="mb-5 flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f10606] text-xs font-black text-white">{number}</span><div><h2 className="text-base font-black text-black">{title}</h2><p className="mt-1 text-xs font-medium text-black/45">{description}</p></div></header><div className="space-y-4">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-black text-black">{label} *</span>{children}</label>;
}

function NumberField({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <Field label={label}><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45 disabled:opacity-60" disabled={disabled} min="0" step="any" type="number" value={value} onChange={(event) => onChange(event.target.value)} /></Field>;
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-black text-black">{label}</p><p className="mt-2 flex h-12 items-center rounded-xl bg-[#fafafa] px-4 text-sm font-bold text-black/55">{value}</p></div>;
}

function PriceLine({ label, value }: { label: string; value: number }) {
  return <div className="flex items-center justify-between gap-3"><span>{label}</span><span>{formatMoney(value)}</span></div>;
}

function BulkJobProgress({ job }: { job: { status: string; done: boolean; failed: boolean; errorMessage: string | null; totalTargets: number; processedTargets: number } }) {
  const percent = job.totalTargets ? Math.min(100, Math.round((job.processedTargets / job.totalTargets) * 100)) : 0;
  const label = job.failed ? "Failed" : job.done ? "Completed" : job.status === "pending" ? "Starting..." : "Processing...";
  return (
    <div className="rounded-xl border border-black/10 bg-[#fafafa] p-3">
      <div className="flex items-center justify-between text-[10px] font-black uppercase text-black/45">
        <span>{label}</span>
        <span>{job.processedTargets}/{job.totalTargets}</span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-black/10">
        <div
          className={`h-full rounded-full transition-all ${job.failed ? "bg-red-500" : "bg-[#f10606]"}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      {job.failed ? <p className="mt-2 text-xs font-bold text-red-600">{job.errorMessage || "The job failed."}</p> : null}
    </div>
  );
}

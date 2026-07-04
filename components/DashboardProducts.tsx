"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  PackagePlus,
  PackageSearch,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE_URL, PRODUCTS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { ProductCreationFlow } from "@/components/ProductCreationFlow";

type ProductStatus = "active" | "inactive" | "draft" | string;

type ProductUnit = {
  unit: string;
  currentPrice?: number;
  currency?: string;
  marketName?: string;
};

export type ProductVariant = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

export type ProductOffering = {
  id: string;
  sku: string;
  isActive: boolean;
  variant?: ProductVariant;
  brand?: { id: string; name: string; manufacturerId?: string; manufacturerName?: string };
  package?: { id: string; name: string; packageType?: string; baseUnit?: string; quantity?: number };
};

export type ProductMarketPrice = {
  id: string;
  productOfferingId: string;
  marketId: string;
  marketName: string;
  amount: number;
  currency: string;
  unit: string;
  quantity: number;
  qualityGrade: string;
  observedAt?: string;
};

export type Product = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  categoryId?: string;
  category?: string;
  imageUrl?: string;
  status: ProductStatus;
  availableUnits: ProductUnit[];
  variants: ProductVariant[];
  offerings: ProductOffering[];
  marketPrices: ProductMarketPrice[];
  createdAt?: string;
  updatedAt?: string;
};

type BulkUploadResult = {
  valid?: boolean;
  message: string;
  summary: Record<string, number>;
  errors: string[];
};

const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;
const productBulkUploadTemplateEndpoint = `${API_BASE_URL}product-catalogue/bulk-upload/template`;
const productBulkUploadValidateEndpoint = `${API_BASE_URL}product-catalogue/bulk-upload/validate`;
const productBulkUploadCommitEndpoint = `${API_BASE_URL}product-catalogue/bulk-upload/commit`;
const pageSizeOptions = [10, 20, 50];
const statusOptions = ["all", "active", "inactive", "draft"];

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

function parseProductUnit(value: unknown): ProductUnit | null {
  if (!isRecord(value)) {
    return null;
  }

  const unit = readText(value, ["unit"]);

  if (!unit) {
    return null;
  }

  const market = isRecord(value.market) ? value.market : null;

  return {
    unit,
    currentPrice: readNumber(value, ["currentPrice", "amount"]),
    currency: readText(value, ["currency"]) || "NGN",
    marketName: market ? readText(market, ["marketname", "name"]) : undefined,
  };
}

function parseProduct(value: unknown): Product | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);
  const name = readText(value, ["name", "title"]);

  if (!id || !name) {
    return null;
  }

  const availableUnits = Array.isArray(value.availableUnits)
    ? value.availableUnits.flatMap((item) => {
        const unit = parseProductUnit(item);
        return unit ? [unit] : [];
      })
    : [];
  const category = isRecord(value.category) ? value.category : null;
  const variants = Array.isArray(value.variants)
    ? value.variants.flatMap((item): ProductVariant[] => {
        if (!isRecord(item)) return [];
        const variantId = readText(item, ["id"]);
        const variantName = readText(item, ["name"]);
        if (!variantId || !variantName) return [];
        return [{
          id: variantId,
          name: variantName,
          code: readText(item, ["code"]),
          isActive: typeof item.isActive === "boolean" ? item.isActive : true,
        }];
      })
    : [];
  const offerings = Array.isArray(value.offerings)
    ? value.offerings.flatMap((item): ProductOffering[] => {
        if (!isRecord(item)) return [];
        const offeringId = readText(item, ["id"]);
        const offeringSku = readText(item, ["sku"]);
        if (!offeringId || !offeringSku) return [];
        const variant = isRecord(item.variant) ? item.variant : null;
        const brand = isRecord(item.brand) ? item.brand : null;
        const manufacturer = brand && isRecord(brand.manufacturer) ? brand.manufacturer : null;
        const packageValue = isRecord(item.package) ? item.package : null;
        return [{
          id: offeringId,
          sku: offeringSku,
          isActive: typeof item.isActive === "boolean" ? item.isActive : true,
          variant: variant
            ? {
                id: readText(variant, ["id"]),
                name: readText(variant, ["name"]),
                code: readText(variant, ["code"]),
                isActive: typeof variant.isActive === "boolean" ? variant.isActive : true,
              }
            : undefined,
          brand: brand
            ? {
                id: readText(brand, ["id"]),
                name: readText(brand, ["name"]),
                manufacturerId: readText(brand, ["manufacturerId"]) || undefined,
                manufacturerName: manufacturer ? readText(manufacturer, ["name"]) || undefined : undefined,
              }
            : undefined,
          package: packageValue
            ? {
                id: readText(packageValue, ["id"]),
                name: readText(packageValue, ["name"]),
                packageType: readText(packageValue, ["packageType"]) || undefined,
                baseUnit: readText(packageValue, ["baseUnit"]) || undefined,
                quantity: readNumber(packageValue, ["quantity"]),
              }
            : undefined,
        }];
      })
    : [];
  const marketPrices = Array.isArray(value.marketPrices)
    ? value.marketPrices.flatMap((item): ProductMarketPrice[] => {
        if (!isRecord(item)) return [];
        const priceId = readText(item, ["id"]);
        const offeringId = readText(item, ["productOfferingId"]);
        const marketId = readText(item, ["marketId"]);
        const amount = readNumber(item, ["amount"]);
        if (!priceId || !offeringId || !marketId || amount === undefined) return [];
        const market = isRecord(item.market) ? item.market : null;
        return [{
          id: priceId,
          productOfferingId: offeringId,
          marketId,
          marketName: market ? readText(market, ["marketname", "name"]) : "Market",
          amount,
          currency: readText(item, ["currency"]) || "NGN",
          unit: readText(item, ["unit"]) || "unit",
          quantity: readNumber(item, ["quantity"]) ?? 1,
          qualityGrade: readText(item, ["qualityGrade"]) || "standard",
          observedAt: readText(item, ["observedAt"]) || undefined,
        }];
      })
    : [];

  return {
    id,
    name,
    description: readText(value, ["description"]) || undefined,
    sku: readText(value, ["sku"]) || undefined,
    categoryId: readText(value, ["categoryId"]) || (category ? readText(category, ["id"]) : "") || undefined,
    category: (category ? readText(category, ["name"]) : "") || readText(value, ["categoryName"]) || undefined,
    imageUrl: readText(value, ["imageUrl", "image"]) || undefined,
    status: readText(value, ["status"]) || "active",
    availableUnits,
    variants,
    offerings,
    marketPrices,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseProducts(body: unknown) {
  const value = isRecord(body)
    ? body.data ?? body.products ?? body.results ?? body
    : body;
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((item) => {
    const product = parseProduct(item);
    return product ? [product] : [];
  });
}

function formatMoney(value?: number, currency = "NGN") {
  if (value === undefined) {
    return "Price unavailable";
  }

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
      "Product bulk upload processed.",
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
  };
}

export function DashboardProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("all");
  const [limit, setLimit] = useState(20);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [busyAction, setBusyAction] = useState("");
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [bulkStage, setBulkStage] = useState<"idle" | "validating" | "validated" | "committing" | "committed">("idle");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const categoryOptions = useMemo(() => {
    return Array.from(
      new Set(products.map((product) => product.category).filter((item): item is string => Boolean(item))),
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError("");

    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
    });
    const trimmedSearch = search.trim();
    const trimmedCategory = category.trim();

    if (trimmedSearch) {
      params.set("search", trimmedSearch);
    }

    if (trimmedCategory) {
      params.set("category", trimmedCategory);
    }

    if (status !== "all") {
      params.set("status", status);
    }

    try {
      const endpoint =
        trimmedCategory && !trimmedSearch && status === "all"
          ? `${productsEndpoint}/category/${encodeURIComponent(trimmedCategory)}?${params}`
          : `${productsEndpoint}?${params}`;
      const response = await authenticatedFetch(endpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load products (${response.status}).`));
      }

      setProducts(parseProducts(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load products.");
    } finally {
      setIsLoading(false);
    }
  }, [category, limit, offset, search, status]);

  async function loadProductDetails(id: string) {
    setBusyAction(`view-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${productsEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load product (${response.status}).`));
      }

      const value = isRecord(body) ? body.data ?? body.product ?? body : body;
      const product = parseProduct(value);

      if (!product) {
        throw new Error("The product response was not in the expected format.");
      }

      setSelectedProduct(product);
      setProducts((current) =>
        current.map((item) => (item.id === product.id ? product : item)),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load product.");
    } finally {
      setBusyAction("");
    }
  }

  async function openEditProduct(id: string) {
    setBusyAction(`edit-${id}`);
    setError("");
    try {
      const response = await authenticatedFetch(`${productsEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load product (${response.status}).`));
      }
      const value = isRecord(body) ? body.data ?? body.product ?? body : body;
      const product = parseProduct(Array.isArray(value) ? value[0] : value);
      if (!product) throw new Error("The product response was not in the expected format.");
      setEditingProduct(product);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load product.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteProduct(product: Product) {
    if (!window.confirm(`Delete "${product.name}" and its catalogue relationships? This cannot be undone.`)) return;
    setBusyAction(`delete-${product.id}`);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${productsEndpoint}/${product.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to delete product (${response.status}).`));
      }
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice("Product deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete product.");
    } finally {
      setBusyAction("");
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadProducts]);

  function resetFilters() {
    setSearch("");
    setCategory("");
    setStatus("all");
    setLimit(20);
    setOffset(0);
  }

  function openCreateModal() {
    setError("");
    setNotice("");
    setIsCreateOpen(true);
  }

  function openBulkModal() {
    setBulkFile(null);
    setBulkResult(null);
    setBulkStage("idle");
    setError("");
    setNotice("");
    setIsBulkOpen(true);
  }

  function downloadFallbackTemplate() {
    const headers = ["name", "description", "sku", "category", "imageUrl", "status"];
    const rows = [
      [
        "Local Rice",
        "Clean local rice sold by bag.",
        "PROD-GRA-RICE",
        "Grains",
        "",
        "active",
      ],
      [
        "Beans",
        "Oloyin beans sold by bag.",
        "PROD-GRA-BEA",
        "Grains",
        "",
        "active",
      ],
    ];
    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((value) => `"${value.replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = "products-bulk-upload-template.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function downloadTemplate() {
    setError("");

    try {
      const response = await authenticatedFetch(productBulkUploadTemplateEndpoint, {
        headers: { Accept: "text/csv,application/octet-stream,*/*" },
      });

      if (!response.ok) {
        throw new Error(`Unable to download template (${response.status}).`);
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || "products-bulk-upload-template.csv";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? `${requestError.message} Downloaded a local fallback template instead.`
          : "Unable to download template. Downloaded a local fallback template instead.",
      );
      downloadFallbackTemplate();
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
      return;
    }

    setIsBulkSubmitting(true);

    try {
      const validationFormData = new FormData();
      validationFormData.append("file", bulkFile);
      const validationResponse = await authenticatedFetch(productBulkUploadValidateEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
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
        throw new Error(
          getResponseMessage(
            validationBody,
            `Unable to validate product upload (${validationResponse.status}).`,
          ),
        );
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
      const commitResponse = await authenticatedFetch(productBulkUploadCommitEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: commitFormData,
      });
      const commitBody = (await commitResponse.json().catch(() => null)) as unknown;
      const commitResult = parseBulkUploadResult(commitBody);

      if (!commitResponse.ok) {
        throw new Error(
          getResponseMessage(commitBody, `Unable to commit product upload (${commitResponse.status}).`),
        );
      }

      if (!commitResult) {
        throw new Error("The commit response was not in the expected format.");
      }

      setBulkResult(commitResult);
      setBulkStage("committed");
      setNotice(commitResult.message || "Products validated and committed successfully.");
      setOffset(0);
      await loadProducts();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : requestStage === "committing"
            ? "Validation passed, but the product upload could not be committed."
            : "Unable to validate the product upload.",
      );
    } finally {
      setIsBulkSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Products</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Create products, inspect units, and search the catalog.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          {formatDate(new Date().toISOString())}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-black uppercase text-black/48">Loaded Products</p>
          <p className="mt-2 text-2xl font-black text-black">{products.length}</p>
        </section>
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-black uppercase text-black/48">Categories</p>
          <p className="mt-2 text-2xl font-black text-black">{categoryOptions.length}</p>
        </section>
        <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-black uppercase text-black/48">Active Filter</p>
          <p className="mt-2 text-2xl font-black text-black">{status === "all" ? "All" : formatLabel(status)}</p>
        </section>
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid gap-3 lg:grid-cols-[1fr_0.65fr_0.5fr_0.35fr_auto_auto_auto] lg:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/38" size={18} />
            <input
              className="h-12 w-full rounded-lg border border-black/10 bg-white pl-11 pr-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
              placeholder="Search by name, SKU, category..."
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setOffset(0);
              }}
            />
          </div>
          <input
            className="h-12 rounded-lg border border-black/10 bg-white px-4 text-sm font-medium text-black outline-none placeholder:text-black/38"
            list="product-categories"
            placeholder="Category"
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setOffset(0);
            }}
          />
          <datalist id="product-categories">
            {categoryOptions.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
          >
            {statusOptions.map((item) => (
              <option key={item} value={item}>
                {formatLabel(item)}
              </option>
            ))}
          </select>
          <select
            className="h-12 rounded-lg border border-black/10 bg-white px-3 text-sm font-black text-black/70 outline-none"
            value={limit}
            onChange={(event) => {
              setLimit(Number(event.target.value));
              setOffset(0);
            }}
          >
            {pageSizeOptions.map((item) => (
              <option key={item} value={item}>
                {item} rows
              </option>
            ))}
          </select>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-black/10 px-4 text-sm font-black text-black/70 transition hover:text-[#f10606]"
            type="button"
            onClick={() => void loadProducts()}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]"
            type="button"
            onClick={openCreateModal}
          >
            <PackagePlus size={17} />
            Create
          </button>
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-lg border border-[#f10606]/20 bg-[#fff0f0] px-5 text-sm font-black text-[#f10606]"
            type="button"
            onClick={openBulkModal}
          >
            <Upload size={17} />
            Bulk upload
          </button>
        </div>
        <button className="mt-3 text-xs font-black text-black/50 transition hover:text-[#f10606]" type="button" onClick={resetFilters}>
          Reset filters
        </button>
      </section>

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

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1.25fr_0.75fr_0.8fr_0.65fr_0.55fr_0.35fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Product</span>
          <span>Category</span>
          <span>Units</span>
          <span>Status</span>
          <span>Updated</span>
          <span className="text-right">Actions</span>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3].map((item) => (
              <div className="h-16 animate-pulse rounded-lg bg-black/[0.04]" key={item} />
            ))}
          </div>
        ) : products.length ? (
          products.map((product) => (
            <article
              className="grid grid-cols-[1.25fr_0.75fr_0.8fr_0.65fr_0.55fr_0.35fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm"
              key={product.id}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#fff0f0] text-[#f10606]">
                  {product.imageUrl ? (
                    <Image src={product.imageUrl} alt={product.name} fill className="object-cover" sizes="44px" />
                  ) : (
                    <PackageSearch size={20} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-black text-black">{product.name}</p>
                  <p className="mt-1 truncate text-xs font-medium text-black/50">
                    {product.sku || product.id}
                  </p>
                </div>
              </div>
              <p className="min-w-0 truncate font-bold text-black/68">{product.category || "Uncategorized"}</p>
              <p className="min-w-0 truncate text-xs font-bold text-black/58">
                {Array.from(
                  new Set(
                    product.offerings
                      .map((offering) => offering.package?.name)
                      .filter((name): name is string => Boolean(name)),
                  ),
                ).join(", ") || "No packages"}
              </p>
              <span
                className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${
                  product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/50"
                }`}
              >
                {formatLabel(product.status)}
              </span>
              <p className="text-xs font-bold text-black/45">{formatDate(product.updatedAt || product.createdAt)}</p>
              <div className="flex justify-end gap-2">
                <button
                  aria-label={`View ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => void loadProductDetails(product.id)}
                >
                  {busyAction === `view-${product.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Eye size={16} />}
                </button>
                <button
                  aria-label={`Edit ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  disabled={Boolean(busyAction)}
                  type="button"
                  onClick={() => void openEditProduct(product.id)}
                >
                  {busyAction === `edit-${product.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Pencil size={16} />}
                </button>
                <button
                  aria-label={`Delete ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  disabled={Boolean(busyAction)}
                  type="button"
                  onClick={() => void deleteProduct(product)}
                >
                  {busyAction === `delete-${product.id}` ? <LoaderCircle className="animate-spin" size={15} /> : <Trash2 size={16} />}
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="p-8 text-center">
            <PackageSearch className="mx-auto text-[#f10606]" size={26} />
            <p className="mt-3 text-sm font-black text-black">No products found</p>
            <p className="mt-1 text-xs font-medium text-black/48">Adjust filters or create a product.</p>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={offset === 0 || isLoading}
          type="button"
          onClick={() => setOffset((current) => Math.max(0, current - limit))}
        >
          <ChevronLeft size={15} />
          Previous
        </button>
        <p className="text-xs font-black text-black/42">Offset {offset}</p>
        <button
          className="flex h-10 items-center gap-2 rounded-lg border border-black/10 px-4 text-xs font-black text-black/62 disabled:opacity-45"
          disabled={products.length < limit || isLoading}
          type="button"
          onClick={() => setOffset((current) => current + limit)}
        >
          Next
          <ChevronRight size={15} />
        </button>
      </div>

      {isCreateOpen ? (
        <ProductCreationFlow
          onClose={() => setIsCreateOpen(false)}
          onCreated={async () => {
            setNotice("Product, offerings, and initial prices created successfully.");
            setOffset(0);
            await loadProducts();
          }}
        />
      ) : null}

      {editingProduct ? (
        <ProductCreationFlow
          editProduct={editingProduct}
          onClose={() => setEditingProduct(null)}
          onCreated={async () => {
            setEditingProduct(null);
            setNotice("Product catalogue updated successfully.");
            await loadProducts();
          }}
        />
      ) : null}

      {selectedProduct ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedProduct(null);
            }
          }}
        >
          <section
            aria-labelledby="product-detail-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-2xl overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase text-[#f10606]">
                  {selectedProduct.category || "Product"}
                </p>
                <h2 className="mt-1 truncate text-xl font-black text-black" id="product-detail-title">
                  {selectedProduct.name}
                </h2>
                <p className="mt-1 text-xs font-bold text-black/45">
                  {selectedProduct.sku || selectedProduct.id}
                </p>
              </div>
              <button
                aria-label="Close product detail"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                type="button"
                onClick={() => setSelectedProduct(null)}
              >
                <X size={18} />
              </button>
            </header>

            <div className="mt-5 grid gap-4 sm:grid-cols-[9rem_1fr]">
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-[#fff0f0] text-[#f10606]">
                {selectedProduct.imageUrl ? (
                  <Image
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    fill
                    className="object-cover"
                    sizes="144px"
                  />
                ) : (
                  <PackageSearch size={34} />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-black/42">Description</p>
                <p className="mt-2 text-sm font-medium leading-6 text-black/62">
                  {selectedProduct.description || "No description provided."}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <DetailMetric label="Status" value={formatLabel(selectedProduct.status)} />
                  <DetailMetric label="Updated" value={formatDate(selectedProduct.updatedAt || selectedProduct.createdAt)} />
                </div>
              </div>
            </div>

            <section className="mt-5 rounded-xl border border-black/10 bg-[#fafafa] p-4">
              <h3 className="text-sm font-black text-black">Sellable Offerings</h3>
              {selectedProduct.offerings.length ? (
                <div className="mt-3 space-y-2">
                  {selectedProduct.offerings.map((offering) => (
                    <article className="rounded-lg bg-white p-3" key={offering.id}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-black">{offering.sku}</p>
                          <p className="mt-1 text-[10px] font-bold text-black/45">
                            {[offering.variant?.name, offering.brand?.name || "Unbranded", offering.package?.name].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-black ${offering.isActive ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/45"}`}>
                          {offering.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      {selectedProduct.marketPrices.filter((price) => price.productOfferingId === offering.id).map((price) => (
                        <div className="mt-2 flex items-center justify-between rounded-lg bg-[#fafafa] px-3 py-2" key={price.id}>
                          <p className="text-[10px] font-bold text-black/50">{price.marketName} · {price.quantity} {price.unit}</p>
                          <p className="text-xs font-black text-[#f10606]">{formatMoney(price.amount, price.currency)}</p>
                        </div>
                      ))}
                    </article>
                  ))}
                </div>
              ) : <p className="mt-3 text-xs font-bold text-black/45">No offerings returned.</p>}
            </section>
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
            aria-labelledby="bulk-upload-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black" id="bulk-upload-title">Bulk Upload Products</h2>
                <p className="mt-1 text-xs font-medium text-black/48">
                  Download the template, fill it, then upload the completed file.
                </p>
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
                    <p className="mt-1 text-xs font-bold">{bulkStage === "committing" ? "Saving products..." : bulkStage === "committed" ? "Completed" : "Waiting"}</p>
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
                    ? "Committing products..."
                    : "Validate & Upload Products"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[#fafafa] p-3">
      <p className="text-[10px] font-black uppercase text-black/42">{label}</p>
      <p className="mt-1 text-sm font-black text-black">{value}</p>
    </div>
  );
}

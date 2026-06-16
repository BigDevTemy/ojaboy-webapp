"use client";

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Eye,
  LoaderCircle,
  PackagePlus,
  PackageSearch,
  RefreshCw,
  Search,
  Upload,
  X,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE_URL, PRODUCTS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type ProductStatus = "active" | "inactive" | "draft" | string;

type ProductUnit = {
  unit: string;
  currentPrice?: number;
  currency?: string;
  marketName?: string;
};

type Product = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  imageUrl?: string;
  status: ProductStatus;
  availableUnits: ProductUnit[];
  createdAt?: string;
  updatedAt?: string;
};

type ProductFormState = {
  name: string;
  description: string;
  sku: string;
  category: string;
  imageUrl: string;
  status: ProductStatus;
};

type BulkUploadResult = {
  message: string;
  summary: {
    received: number;
    valid: number;
    inserted: number;
    skipped: number;
    failed: number;
  };
  errors: string[];
};

const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;
const productBulkUploadEndpoint = `${productsEndpoint}/bulk-upload`;
const productBulkUploadTemplateEndpoint = `${productBulkUploadEndpoint}/template`;
const pageSizeOptions = [10, 20, 50];
const statusOptions = ["all", "active", "inactive", "draft"];

function createEmptyForm(): ProductFormState {
  return {
    name: "",
    description: "",
    sku: "",
    category: "",
    imageUrl: "",
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

  return {
    id,
    name,
    description: readText(value, ["description"]) || undefined,
    sku: readText(value, ["sku"]) || undefined,
    category: readText(value, ["category"]) || undefined,
    imageUrl: readText(value, ["imageUrl", "image"]) || undefined,
    status: readText(value, ["status"]) || "active",
    availableUnits,
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
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toCreatePayload(form: ProductFormState) {
  return {
    name: form.name.trim(),
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.sku.trim() ? { sku: form.sku.trim() } : {}),
    ...(form.category.trim() ? { category: form.category.trim() } : {}),
    ...(form.imageUrl.trim() ? { imageUrl: form.imageUrl.trim() } : {}),
    status: form.status,
  };
}

function parseBulkUploadResult(value: unknown): BulkUploadResult | null {
  if (!isRecord(value) || !isRecord(value.summary)) {
    return null;
  }

  return {
    message: readText(value, ["message"]) || "Product bulk upload processed.",
    summary: {
      received: readNumber(value.summary, ["received"]) ?? 0,
      valid: readNumber(value.summary, ["valid"]) ?? 0,
      inserted: readNumber(value.summary, ["inserted"]) ?? 0,
      skipped: readNumber(value.summary, ["skipped"]) ?? 0,
      failed: readNumber(value.summary, ["failed"]) ?? 0,
    },
    errors: Array.isArray(value.errors)
      ? value.errors.flatMap((item): string[] => {
          if (typeof item === "string") {
            return [item];
          }

          if (isRecord(item)) {
            return [readText(item, ["message", "error"]) || JSON.stringify(item)];
          }

          return [];
        })
      : [],
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
  const [form, setForm] = useState<ProductFormState>(createEmptyForm);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setForm(createEmptyForm());
    setError("");
    setNotice("");
    setIsCreateOpen(true);
  }

  function openBulkModal() {
    setBulkFile(null);
    setBulkResult(null);
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

  async function submitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const payload = toCreatePayload(form);

    if (!payload.name) {
      setError("Enter a product name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(productsEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to create product (${response.status}).`));
      }

      setNotice("Product created successfully.");
      setIsCreateOpen(false);
      setOffset(0);
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create product.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBulkUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBulkResult(null);

    if (!bulkFile) {
      setError("Choose a CSV or spreadsheet file to upload.");
      return;
    }

    const formData = new FormData();
    formData.append("file", bulkFile);
    setIsBulkSubmitting(true);

    try {
      const response = await authenticatedFetch(productBulkUploadEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
        body: formData,
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to upload products (${response.status}).`));
      }

      const result = parseBulkUploadResult(body);

      if (!result) {
        throw new Error("The bulk upload response was not in the expected format.");
      }

      setBulkResult(result);
      setNotice(result.message);
      setOffset(0);
      await loadProducts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to upload products.");
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
          <span className="text-right">View</span>
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
              <div className="min-w-0">
                {product.availableUnits.length ? (
                  <div className="flex flex-wrap gap-1">
                    {product.availableUnits.slice(0, 3).map((unit) => (
                      <span className="rounded-full bg-[#fbfbfb] px-2 py-1 text-[10px] font-black text-black/55" key={`${product.id}-${unit.unit}`}>
                        {unit.unit}: {formatMoney(unit.currentPrice, unit.currency)}
                      </span>
                    ))}
                    {product.availableUnits.length > 3 ? (
                      <span className="rounded-full bg-black/[0.04] px-2 py-1 text-[10px] font-black text-black/45">
                        +{product.availableUnits.length - 3}
                      </span>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-black/38">No units yet</p>
                )}
              </div>
              <span
                className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${
                  product.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/50"
                }`}
              >
                {formatLabel(product.status)}
              </span>
              <p className="text-xs font-bold text-black/45">{formatDate(product.updatedAt || product.createdAt)}</p>
              <div className="flex justify-end">
                <button
                  aria-label={`View ${product.name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]"
                  type="button"
                  onClick={() => void loadProductDetails(product.id)}
                >
                  <Eye size={16} />
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
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !isSubmitting) {
              setIsCreateOpen(false);
            }
          }}
        >
          <section
            aria-labelledby="create-product-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-black" id="create-product-title">Create Product</h2>
                <p className="mt-1 text-xs font-medium text-black/48">Add a product to the catalog.</p>
              </div>
              <button
                aria-label="Close create product"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                disabled={isSubmitting}
                type="button"
                onClick={() => setIsCreateOpen(false)}
              >
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={submitProduct}>
              <label className="block">
                <span className="text-xs font-black text-black">Name</span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                  placeholder="Local Rice"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className="block">
                <span className="text-xs font-black text-black">Description</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45"
                  placeholder="Clean local rice sold by bag."
                  value={form.description}
                  onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-black text-black">SKU</span>
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                    placeholder="PROD-GRA-RICE"
                    value={form.sku}
                    onChange={(event) => setForm((current) => ({ ...current, sku: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Category</span>
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                    placeholder="Grains"
                    value={form.category}
                    onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
                  />
                </label>
              </div>
              <div className="grid grid-cols-[1fr_0.45fr] gap-3">
                <label className="block">
                  <span className="text-xs font-black text-black">Image URL</span>
                  <input
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                    placeholder="https://..."
                    value={form.imageUrl}
                    onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))}
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-black text-black">Status</span>
                  <select
                    className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm font-black outline-none focus:border-[#f10606]/45"
                    value={form.status}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                  >
                    {statusOptions.filter((item) => item !== "all").map((item) => (
                      <option key={item} value={item}>{formatLabel(item)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <PackagePlus size={17} />}
                {isSubmitting ? "Creating..." : "Create Product"}
              </button>
            </form>
          </section>
        </div>
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
              <h3 className="text-sm font-black text-black">Available Units</h3>
              {selectedProduct.availableUnits.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selectedProduct.availableUnits.map((unit) => (
                    <article className="rounded-lg bg-white p-3" key={`${selectedProduct.id}-${unit.unit}-${unit.marketName ?? ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black text-black">{unit.unit}</p>
                          <p className="mt-1 text-[10px] font-bold text-black/42">
                            {unit.marketName || "Market not attached"}
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-black text-[#f10606]">
                          {formatMoney(unit.currentPrice, unit.currency)}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-lg bg-white px-3 py-3 text-xs font-bold text-black/45">
                  No available units returned for this product.
                </p>
              )}
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
                  onChange={(event) => setBulkFile(event.target.files?.[0] ?? null)}
                />
              </label>

              {bulkFile ? (
                <p className="rounded-xl bg-[#fafafa] px-3 py-2.5 text-xs font-bold text-black/55">
                  Selected: {bulkFile.name}
                </p>
              ) : null}

              {bulkResult ? (
                <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
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

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isBulkSubmitting}
                type="submit"
              >
                {isBulkSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Upload size={17} />}
                {isBulkSubmitting ? "Uploading..." : "Upload Products"}
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

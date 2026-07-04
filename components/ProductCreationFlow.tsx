"use client";

import {
  AlertCircle,
  Check,
  Circle,
  ImageIcon,
  LoaderCircle,
  PackagePlus,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  API_BASE_URL,
  BRANDS_URL,
  MANUFACTURERS_URL,
  MARKET_PRICES_URL,
  MARKETS_URL,
  PRODUCT_CATEGORIES_URL,
  PRODUCT_OFFERINGS_URL,
  PRODUCT_PACKAGES_URL,
  PRODUCT_VARIANTS_URL,
  PRODUCTS_URL,
} from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type Lookup = { id: string; name: string; manufacturerId?: string };
type PackageLookup = Lookup & {
  packageType?: string;
  baseUnit?: string;
  quantity?: number;
};
type MarketPriceRow = {
  key: string;
  existingId?: string;
  marketId: string;
  amount: string;
  currency: string;
  observedAt: string;
  qualityGrade: string;
};
type OptionRow = {
  key: string;
  existingId?: string;
  variantId?: string;
  brandId?: string;
  manufacturerId?: string;
  packageId?: string;
  variantName: string;
  variantCode: string;
  brandName: string;
  unbranded: boolean;
  manufacturerName: string;
  packageName: string;
  packageType: string;
  baseUnit: string;
  quantity: string;
  sku: string;
  skuEdited: boolean;
  prices: MarketPriceRow[];
};
type EditableProduct = {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  categoryId?: string;
  category?: string;
  imageUrl?: string;
  variants: Array<{ id: string; name: string; code: string }>;
  offerings: Array<{
    id: string;
    sku: string;
    variant?: { id: string; name: string; code: string };
    brand?: { id: string; name: string; manufacturerId?: string; manufacturerName?: string };
    package?: { id: string; name: string; packageType?: string; baseUnit?: string; quantity?: number };
  }>;
  marketPrices: Array<{
    id: string;
    productOfferingId: string;
    marketId: string;
    amount: number;
    currency: string;
    unit: string;
    quantity: number;
    qualityGrade: string;
    observedAt?: string;
  }>;
};
type CreatedState = {
  productId: string;
  variants: Record<string, string>;
  manufacturers: Record<string, string>;
  brands: Record<string, string>;
  packages: Record<string, string>;
  offerings: Record<string, string>;
  prices: Record<string, string>;
};
type StageName =
  | "product"
  | "variants"
  | "catalogue"
  | "packages"
  | "offerings"
  | "prices"
  | "complete";
type StageState = { name: StageName; status: "pending" | "active" | "done" | "failed"; detail?: string };

const endpoints = {
  products: `${API_BASE_URL}${PRODUCTS_URL}`,
  variants: `${API_BASE_URL}${PRODUCT_VARIANTS_URL}`,
  categories: `${API_BASE_URL}${PRODUCT_CATEGORIES_URL}?isActive=true`,
  brands: `${API_BASE_URL}${BRANDS_URL}`,
  manufacturers: `${API_BASE_URL}${MANUFACTURERS_URL}`,
  packages: `${API_BASE_URL}${PRODUCT_PACKAGES_URL}`,
  offerings: `${API_BASE_URL}${PRODUCT_OFFERINGS_URL}`,
  prices: `${API_BASE_URL}${MARKET_PRICES_URL}`,
  markets: `${API_BASE_URL}${MARKETS_URL}`,
};
const emptyCreated: CreatedState = {
  productId: "",
  variants: {},
  manufacturers: {},
  brands: {},
  packages: {},
  offerings: {},
  prices: {},
};
const stageLabels: Record<StageName, string> = {
  product: "Create product",
  variants: "Create variants",
  catalogue: "Resolve brands & manufacturers",
  packages: "Resolve packages",
  offerings: "Create offerings",
  prices: "Create initial prices",
  complete: "Finished",
};

function keyOf(value: string) {
  return value.trim().toLocaleLowerCase();
}

function codeOf(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortCode(value: string) {
  const words = codeOf(value).split("-").filter(Boolean);
  return words.length > 1 ? words.map((word) => word.slice(0, 1)).join("") : (words[0] ?? "").slice(0, 5);
}

function localDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function newMarketPrice(): MarketPriceRow {
  return {
    key: crypto.randomUUID(),
    marketId: "",
    amount: "",
    currency: "NGN",
    observedAt: localDateTime(),
    qualityGrade: "standard",
  };
}

function newRow(productSku = ""): OptionRow {
  return {
    key: crypto.randomUUID(),
    variantName: "",
    variantCode: "",
    brandName: "",
    unbranded: false,
    manufacturerName: "",
    packageName: "",
    packageType: "other",
    baseUnit: "",
    quantity: "1",
    sku: codeOf(productSku),
    skuEdited: false,
    prices: [],
  };
}

function rowsFromProduct(product: EditableProduct): OptionRow[] {
  return product.offerings.map((offering) => ({
    key: offering.id,
    existingId: offering.id,
    variantId: offering.variant?.id,
    brandId: offering.brand?.id,
    manufacturerId: offering.brand?.manufacturerId,
    packageId: offering.package?.id,
    variantName: offering.variant?.name ?? "",
    variantCode: offering.variant?.code ?? "",
    brandName: offering.brand?.name ?? "",
    unbranded: !offering.brand,
    manufacturerName: offering.brand?.manufacturerName ?? "",
    packageName: offering.package?.name ?? "",
    packageType: offering.package?.packageType ?? "other",
    baseUnit:
      offering.package?.baseUnit ??
      product.marketPrices.find((price) => price.productOfferingId === offering.id)?.unit ??
      "unit",
    quantity: String(
      offering.package?.quantity ??
      product.marketPrices.find((price) => price.productOfferingId === offering.id)?.quantity ??
      1,
    ),
    sku: offering.sku,
    skuEdited: true,
    prices: product.marketPrices
      .filter((price) => price.productOfferingId === offering.id)
      .map((price) => ({
        key: price.id,
        existingId: price.id,
        marketId: price.marketId,
        amount: String(price.amount),
        currency: price.currency,
        observedAt: price.observedAt ? toLocalDateTime(price.observedAt) : localDateTime(),
        qualityGrade: price.qualityGrade,
      })),
  }));
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return localDateTime();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function text(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) return String(value).trim();
  }
  return "";
}

function numberValue(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }
  return undefined;
}

function unwrap(body: unknown, keys: string[]) {
  if (!isRecord(body)) return body;
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  if (body.data !== undefined) return unwrap(body.data, keys);
  return body;
}

function parseLookups(body: unknown, keys: string[]): Lookup[] {
  const value = unwrap(body, keys);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = text(item, ["id"]);
    const name = text(item, ["name", "categoryName", "title", "brandName", "manufacturerName", "marketname"]);
    return id && name ? [{ id, name, manufacturerId: text(item, ["manufacturerId"]) || undefined }] : [];
  });
}

function parsePackages(body: unknown): PackageLookup[] {
  const value = unwrap(body, ["productPackages", "packages", "results"]);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    if (!isRecord(item)) return [];
    const id = text(item, ["id"]);
    const name = text(item, ["name"]);
    return id && name
      ? [{
          id,
          name,
          packageType: text(item, ["packageType"]) || undefined,
          baseUnit: text(item, ["baseUnit"]) || undefined,
          quantity: numberValue(item, ["quantity"]),
        }]
      : [];
  });
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) return message.filter((item): item is string => typeof item === "string").join(" ");
  return typeof message === "string" && message.trim() ? message : fallback;
}

function idFrom(body: unknown, keys: string[]) {
  const value = unwrap(body, keys);
  if (isRecord(value)) return text(value, ["id"]);
  return "";
}

async function request(path: string, init?: RequestInit) {
  const response = await authenticatedFetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const body = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) throw new Error(responseMessage(body, `Request failed (${response.status}).`));
  return body;
}

function suggestedSku(productSku: string, row: OptionRow, hasVariants: boolean) {
  return [
    codeOf(productSku),
    hasVariants ? codeOf(row.variantCode || row.variantName) : "",
    row.unbranded ? "" : shortCode(row.brandName),
    codeOf(row.packageName),
  ].filter(Boolean).join("-");
}

function optionIdentity(row: OptionRow, hasVariants: boolean) {
  return [
    hasVariants ? keyOf(row.variantName) : "",
    row.unbranded ? "unbranded" : keyOf(row.brandName),
    keyOf(row.packageName),
  ].join("|");
}

export function ProductCreationFlow({
  onClose,
  onCreated,
  editProduct,
}: {
  onClose: () => void;
  onCreated: () => Promise<void> | void;
  editProduct?: EditableProduct;
}) {
  const isEditing = Boolean(editProduct);
  const [product, setProduct] = useState({
    name: editProduct?.name ?? "",
    sku: editProduct?.sku ?? "",
    category: editProduct?.categoryId ?? "",
    description: editProduct?.description ?? "",
    imageUrl: editProduct?.imageUrl ?? "",
    hasVariants: Boolean(editProduct?.variants.length),
  });
  const [rows, setRows] = useState<OptionRow[]>(
    editProduct ? rowsFromProduct(editProduct) : [newRow()],
  );
  const [categories, setCategories] = useState<Lookup[]>([]);
  const [brands, setBrands] = useState<Lookup[]>([]);
  const [manufacturers, setManufacturers] = useState<Lookup[]>([]);
  const [packages, setPackages] = useState<PackageLookup[]>([]);
  const [markets, setMarkets] = useState<Lookup[]>([]);
  const [isLoadingLookups, setIsLoadingLookups] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedState>(emptyCreated);
  const [stage, setStage] = useState<StageState>({ name: "product", status: "pending" });
  const [error, setError] = useState("");
  const [completed, setCompleted] = useState(false);

  async function updateRequest(endpoint: string, payload: Record<string, unknown>) {
    const response = await authenticatedFetch(endpoint, {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok) {
      throw new Error(responseMessage(body, `Unable to update catalogue record (${response.status}).`));
    }
  }

  const loadLookups = useCallback(async () => {
    setIsLoadingLookups(true);
    const results = await Promise.allSettled([
      request(endpoints.categories),
      request(endpoints.brands),
      request(endpoints.manufacturers),
      request(endpoints.packages),
      request(endpoints.markets),
    ]);
    if (results[0].status === "fulfilled") setCategories(parseLookups(results[0].value, ["productCategories", "categories", "results"]));
    if (results[1].status === "fulfilled") setBrands(parseLookups(results[1].value, ["brands", "results"]));
    if (results[2].status === "fulfilled") setManufacturers(parseLookups(results[2].value, ["manufacturers", "results"]));
    if (results[3].status === "fulfilled") setPackages(parsePackages(results[3].value));
    if (results[4].status === "fulfilled") setMarkets(parseLookups(results[4].value, ["markets", "results"]));
    if (results.some((result) => result.status === "rejected")) {
      setError("Some catalogue choices could not be loaded. Refresh the modal or retry before submitting.");
    }
    setIsLoadingLookups(false);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadLookups();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadLookups]);

  const duplicateKeys = useMemo(() => {
    const identities = new Map<string, number>();
    const skus = new Map<string, number>();
    rows.forEach((row) => {
      const identity = optionIdentity(row, product.hasVariants);
      const sku = keyOf(row.sku);
      identities.set(identity, (identities.get(identity) ?? 0) + 1);
      if (sku) skus.set(sku, (skus.get(sku) ?? 0) + 1);
    });
    return new Set(
      rows
        .filter((row) => (identities.get(optionIdentity(row, product.hasVariants)) ?? 0) > 1 || (skus.get(keyOf(row.sku)) ?? 0) > 1)
        .map((row) => row.key),
    );
  }, [product.hasVariants, rows]);

  function updateRow(key: string, patch: Partial<OptionRow>, regenerateSku = true) {
    setRows((current) =>
      current.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, ...patch };
        if ("variantName" in patch && !row.variantCode) next.variantCode = codeOf(patch.variantName ?? "");
        if (regenerateSku && !next.skuEdited) next.sku = suggestedSku(product.sku, next, product.hasVariants);
        return next;
      }),
    );
  }

  function addMarketPrice(rowKey: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey ? { ...row, prices: [...row.prices, newMarketPrice()] } : row,
      ),
    );
  }

  function updateMarketPrice(rowKey: string, priceKey: string, patch: Partial<MarketPriceRow>) {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey
          ? {
              ...row,
              prices: row.prices.map((price) =>
                price.key === priceKey ? { ...price, ...patch } : price,
              ),
            }
          : row,
      ),
    );
  }

  function removeMarketPrice(rowKey: string, priceKey: string) {
    setRows((current) =>
      current.map((row) =>
        row.key === rowKey
          ? { ...row, prices: row.prices.filter((price) => price.key !== priceKey) }
          : row,
      ),
    );
  }

  function updateProduct(patch: Partial<typeof product>) {
    setProduct((current) => ({ ...current, ...patch }));
    if (patch.sku !== undefined || patch.hasVariants !== undefined) {
      const nextProduct = { ...product, ...patch };
      setRows((current) =>
        current.map((row) => row.skuEdited ? row : { ...row, sku: suggestedSku(nextProduct.sku, row, nextProduct.hasVariants) }),
      );
    }
  }

  function validate() {
    if (!product.name.trim() || !product.sku.trim() || !product.category.trim()) return "Product name, SKU, and category are required.";
    if (!rows.length) return "Add at least one sellable option.";
    if (duplicateKeys.size) return "Remove duplicate offering rows or duplicate offering SKUs.";
    for (const [index, row] of rows.entries()) {
      if (product.hasVariants && !row.variantName.trim()) return `Option ${index + 1} needs a variant.`;
      if (!row.unbranded && !row.brandName.trim()) return `Option ${index + 1} needs a brand or must be marked Unbranded.`;
      if (!row.packageName.trim() || !row.baseUnit.trim() || !(Number(row.quantity) > 0)) return `Option ${index + 1} needs a package name, base unit, and positive quantity.`;
      if (!row.sku.trim()) return `Option ${index + 1} needs an offering SKU.`;
      for (const [priceIndex, price] of row.prices.entries()) {
        if (!price.marketId || price.amount.trim() === "" || !(Number(price.amount) >= 0) || !price.observedAt) {
          return `Complete market price ${priceIndex + 1} for option ${index + 1}.`;
        }
      }
    }
    return "";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError("");
    setIsSubmitting(true);

    if (editProduct) {
      try {
        setStage({ name: "product", status: "active", detail: "Updating product information" });
        await updateRequest(`${endpoints.products}/${editProduct.id}`, {
          name: product.name.trim(),
          sku: product.sku.trim(),
          categoryId: product.category.trim(),
          description: product.description.trim() || null,
          imageUrl: product.imageUrl.trim() || null,
        });

        setStage({ name: "variants", status: "active" });
        const variantIds = new Map(rows.map((row) => [row.key, row.variantId ?? ""]));
        for (const row of rows) {
          setStage({ name: "variants", status: "active", detail: row.variantName });
          if (row.variantId) {
            await updateRequest(
              `${endpoints.variants}/${row.variantId}`,
              { name: row.variantName.trim(), code: row.variantCode.trim() },
            );
          } else if (product.hasVariants) {
            const body = await request(`${endpoints.products}/${editProduct.id}/variants`, {
              method: "POST",
              body: JSON.stringify({
                name: row.variantName.trim(),
                code: row.variantCode.trim() || codeOf(row.variantName),
              }),
            });
            const variantId = idFrom(body, ["variant"]);
            if (!variantId) throw new Error(`Variant "${row.variantName}" was created, but its ID was missing.`);
            variantIds.set(row.key, variantId);
            updateRow(row.key, { variantId }, false);
          }
        }

        setStage({ name: "catalogue", status: "active" });
        const updatedBrands = new Set<string>();
        const updatedManufacturers = new Set<string>();
        const manufacturerIds = new Map(manufacturers.map((item) => [keyOf(item.name), item.id]));
        const brandIds = new Map(brands.map((item) => [keyOf(item.name), item.id]));
        for (const row of rows) {
          let manufacturerId = row.manufacturerId ?? "";
          if (row.manufacturerId && !updatedManufacturers.has(row.manufacturerId)) {
            setStage({ name: "catalogue", status: "active", detail: `Manufacturer: ${row.manufacturerName}` });
            await updateRequest(`${endpoints.manufacturers}/${row.manufacturerId}`, {
              name: row.manufacturerName.trim(),
            });
            updatedManufacturers.add(row.manufacturerId);
          } else if (!row.unbranded && row.manufacturerName.trim()) {
            manufacturerId = manufacturerIds.get(keyOf(row.manufacturerName)) ?? "";
            if (!manufacturerId) {
              const body = await request(endpoints.manufacturers, {
                method: "POST",
                body: JSON.stringify({ name: row.manufacturerName.trim() }),
              });
              manufacturerId = idFrom(body, ["manufacturer"]);
              if (!manufacturerId) throw new Error(`Manufacturer "${row.manufacturerName}" was created, but its ID was missing.`);
              manufacturerIds.set(keyOf(row.manufacturerName), manufacturerId);
            }
            updateRow(row.key, { manufacturerId }, false);
          }
          let brandId = row.brandId ?? "";
          if (row.brandId && !updatedBrands.has(row.brandId)) {
            setStage({ name: "catalogue", status: "active", detail: `Brand: ${row.brandName}` });
            await updateRequest(`${endpoints.brands}/${row.brandId}`, {
              name: row.brandName.trim(),
              ...(manufacturerId ? { manufacturerId } : {}),
            });
            updatedBrands.add(row.brandId);
          } else if (!row.unbranded) {
            brandId = brandIds.get(keyOf(row.brandName)) ?? "";
            if (!brandId) {
              const body = await request(endpoints.brands, {
                method: "POST",
                body: JSON.stringify({
                  name: row.brandName.trim(),
                  ...(manufacturerId ? { manufacturerId } : {}),
                }),
              });
              brandId = idFrom(body, ["brand"]);
              if (!brandId) throw new Error(`Brand "${row.brandName}" was created, but its ID was missing.`);
              brandIds.set(keyOf(row.brandName), brandId);
            }
            updateRow(row.key, { brandId }, false);
          }
        }

        setStage({ name: "packages", status: "active" });
        const updatedPackages = new Set<string>();
        const packageIds = new Map(packages.map((item) => [keyOf(item.name), item.id]));
        for (const row of rows) {
          if (row.packageId) {
            if (updatedPackages.has(row.packageId)) continue;
            setStage({ name: "packages", status: "active", detail: row.packageName });
            await updateRequest(`${endpoints.packages}/${row.packageId}`, {
              name: row.packageName.trim(),
              packageType: row.packageType.trim() || "other",
              baseUnit: row.baseUnit.trim(),
              quantity: Number(row.quantity),
            });
            updatedPackages.add(row.packageId);
          } else {
            let packageId = packageIds.get(keyOf(row.packageName)) ?? "";
            if (!packageId) {
              const body = await request(endpoints.packages, {
                method: "POST",
                body: JSON.stringify({
                  name: row.packageName.trim(),
                  packageType: row.packageType.trim() || "other",
                  baseUnit: row.baseUnit.trim(),
                  quantity: Number(row.quantity),
                }),
              });
              packageId = idFrom(body, ["productPackage", "package"]);
              if (!packageId) throw new Error(`Package "${row.packageName}" was created, but its ID was missing.`);
              packageIds.set(keyOf(row.packageName), packageId);
            }
            updateRow(row.key, { packageId }, false);
          }
        }

        setStage({ name: "offerings", status: "active" });
        const offeringIds = new Map(rows.map((row) => [row.key, row.existingId ?? ""]));
        for (const row of rows) {
          setStage({ name: "offerings", status: "active", detail: row.sku });
          if (row.existingId) {
            await updateRequest(`${endpoints.offerings}/${row.existingId}`, {
              sku: row.sku.trim(),
            });
          } else {
            const currentRow = rows.find((item) => item.key === row.key) ?? row;
            const packageId =
              currentRow.packageId ??
              packageIds.get(keyOf(row.packageName));
            const brandId =
              currentRow.brandId ??
              brandIds.get(keyOf(row.brandName));
            const body = await request(endpoints.offerings, {
              method: "POST",
              body: JSON.stringify({
                productId: editProduct.id,
                ...(product.hasVariants ? { variantId: variantIds.get(row.key) } : {}),
                ...(!row.unbranded && brandId ? { brandId } : {}),
                packageId,
                sku: row.sku.trim(),
              }),
            });
            const offeringId = idFrom(body, ["productOffering", "offering"]);
            if (!offeringId) throw new Error(`Offering "${row.sku}" was created, but its ID was missing.`);
            offeringIds.set(row.key, offeringId);
            updateRow(row.key, { existingId: offeringId }, false);
          }
        }

        setStage({ name: "prices", status: "active" });
        for (const row of rows) {
          for (const price of row.prices) {
            setStage({ name: "prices", status: "active", detail: row.sku });
            const payload = {
              productId: editProduct.id,
              productOfferingId: offeringIds.get(row.key),
              marketId: price.marketId,
              amount: Number(price.amount),
              currency: price.currency.trim() || "NGN",
              unit: row.baseUnit.trim(),
              quantity: Number(row.quantity),
              observedAt: new Date(price.observedAt).toISOString(),
              qualityGrade: price.qualityGrade.trim() || "standard",
            };
            if (price.existingId) {
              await updateRequest(`${endpoints.prices}/${price.existingId}`, payload);
            } else {
              const body = await request(endpoints.prices, {
                method: "POST",
                body: JSON.stringify(payload),
              });
              const priceId = idFrom(body, ["marketPrice"]) || "created";
              updateMarketPrice(row.key, price.key, { existingId: priceId });
            }
          }
        }

        setStage({ name: "complete", status: "done" });
        setCompleted(true);
        await onCreated();
      } catch (requestError) {
        setStage((current) => ({ ...current, status: "failed" }));
        setError(requestError instanceof Error ? requestError.message : "Unable to update product.");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    let checkpoint: CreatedState = {
      productId: created.productId,
      variants: { ...created.variants },
      manufacturers: { ...created.manufacturers },
      brands: { ...created.brands },
      packages: { ...created.packages },
      offerings: { ...created.offerings },
      prices: { ...created.prices },
    };
    const save = () => {
      checkpoint = {
        productId: checkpoint.productId,
        variants: { ...checkpoint.variants },
        manufacturers: { ...checkpoint.manufacturers },
        brands: { ...checkpoint.brands },
        packages: { ...checkpoint.packages },
        offerings: { ...checkpoint.offerings },
        prices: { ...checkpoint.prices },
      };
      setCreated(checkpoint);
    };
    const activate = (name: StageName, detail?: string) => setStage({ name, status: "active", detail });

    try {
      if (!checkpoint.productId) {
        activate("product");
        const body = await request(endpoints.products, {
          method: "POST",
          body: JSON.stringify({
            name: product.name.trim(),
            sku: product.sku.trim(),
            categoryId: product.category.trim(),
            ...(product.description.trim() ? { description: product.description.trim() } : {}),
            ...(product.imageUrl.trim() ? { imageUrl: product.imageUrl.trim() } : {}),
          }),
        });
        checkpoint.productId = idFrom(body, ["product"]);
        if (!checkpoint.productId) throw new Error("Product created, but its ID was missing from the response.");
        save();
      }

      activate("variants");
      if (product.hasVariants) {
        for (const row of rows) {
          const variantKey = keyOf(row.variantName);
          if (checkpoint.variants[variantKey]) continue;
          setStage({ name: "variants", status: "active", detail: row.variantName });
          const body = await request(`${endpoints.products}/${checkpoint.productId}/variants`, {
            method: "POST",
            body: JSON.stringify({ name: row.variantName.trim(), code: row.variantCode.trim() || codeOf(row.variantName) }),
          });
          const id = idFrom(body, ["variant"]);
          if (!id) throw new Error(`Variant "${row.variantName}" was created, but its ID was missing.`);
          checkpoint.variants[variantKey] = id;
          save();
        }
      }

      activate("catalogue");
      const manufacturerIds = new Map(manufacturers.map((item) => [keyOf(item.name), item.id]));
      const brandIds = new Map(brands.map((item) => [keyOf(item.name), item.id]));
      for (const row of rows) {
        let manufacturerId = "";
        const manufacturerKey = keyOf(row.manufacturerName);
        if (!row.unbranded && manufacturerKey) {
          manufacturerId = checkpoint.manufacturers[manufacturerKey] || manufacturerIds.get(manufacturerKey) || "";
          if (!manufacturerId) {
            setStage({ name: "catalogue", status: "active", detail: `Manufacturer: ${row.manufacturerName}` });
            const body = await request(endpoints.manufacturers, {
              method: "POST",
              body: JSON.stringify({ name: row.manufacturerName.trim() }),
            });
            manufacturerId = idFrom(body, ["manufacturer"]);
            if (!manufacturerId) throw new Error(`Manufacturer "${row.manufacturerName}" was created, but its ID was missing.`);
            checkpoint.manufacturers[manufacturerKey] = manufacturerId;
            manufacturerIds.set(manufacturerKey, manufacturerId);
            save();
          }
        }
        if (!row.unbranded) {
          const brandKey = keyOf(row.brandName);
          let brandId = checkpoint.brands[brandKey] || brandIds.get(brandKey) || "";
          if (!brandId) {
            setStage({ name: "catalogue", status: "active", detail: `Brand: ${row.brandName}` });
            const body = await request(endpoints.brands, {
              method: "POST",
              body: JSON.stringify({ name: row.brandName.trim(), ...(manufacturerId ? { manufacturerId } : {}) }),
            });
            brandId = idFrom(body, ["brand"]);
            if (!brandId) throw new Error(`Brand "${row.brandName}" was created, but its ID was missing.`);
            checkpoint.brands[brandKey] = brandId;
            brandIds.set(brandKey, brandId);
            save();
          }
        }
      }

      activate("packages");
      const packageIds = new Map(packages.map((item) => [keyOf(item.name), item.id]));
      for (const row of rows) {
        const packageKey = keyOf(row.packageName);
        let packageId = checkpoint.packages[packageKey] || packageIds.get(packageKey) || "";
        if (!packageId) {
          setStage({ name: "packages", status: "active", detail: row.packageName });
          const body = await request(endpoints.packages, {
            method: "POST",
            body: JSON.stringify({
              name: row.packageName.trim(),
              packageType: row.packageType.trim() || "other",
              baseUnit: row.baseUnit.trim(),
              quantity: Number(row.quantity),
            }),
          });
          packageId = idFrom(body, ["productPackage", "package"]);
          if (!packageId) throw new Error(`Package "${row.packageName}" was created, but its ID was missing.`);
          checkpoint.packages[packageKey] = packageId;
          packageIds.set(packageKey, packageId);
          save();
        }
      }

      activate("offerings");
      for (const [index, row] of rows.entries()) {
        if (checkpoint.offerings[row.key]) continue;
        setStage({ name: "offerings", status: "active", detail: row.sku });
        const body = await request(endpoints.offerings, {
          method: "POST",
          body: JSON.stringify({
            productId: checkpoint.productId,
            ...(product.hasVariants ? { variantId: checkpoint.variants[keyOf(row.variantName)] } : {}),
            ...(!row.unbranded ? { brandId: checkpoint.brands[keyOf(row.brandName)] || brandIds.get(keyOf(row.brandName)) } : {}),
            packageId: checkpoint.packages[keyOf(row.packageName)] || packageIds.get(keyOf(row.packageName)),
            sku: row.sku.trim(),
          }),
        });
        const id = idFrom(body, ["productOffering", "offering"]);
        if (!id) throw new Error(`Offering ${index + 1} was created, but its ID was missing.`);
        checkpoint.offerings[row.key] = id;
        save();
      }

      activate("prices");
      for (const row of rows) {
        const offeringId = checkpoint.offerings[row.key];
        if (!offeringId) throw new Error(`Cannot create price for ${row.sku} until its offering exists.`);
        for (const price of row.prices) {
          if (checkpoint.prices[price.key]) continue;
          const marketName = markets.find((market) => market.id === price.marketId)?.name;
          setStage({ name: "prices", status: "active", detail: `${row.sku}${marketName ? ` · ${marketName}` : ""}` });
          const body = await request(endpoints.prices, {
            method: "POST",
            body: JSON.stringify({
              productId: checkpoint.productId,
              productOfferingId: offeringId,
              marketId: price.marketId,
              amount: Number(price.amount),
              currency: price.currency.trim() || "NGN",
              unit: row.baseUnit.trim(),
              quantity: Number(row.quantity),
              observedAt: new Date(price.observedAt).toISOString(),
              qualityGrade: price.qualityGrade.trim() || "standard",
            }),
          });
          checkpoint.prices[price.key] = idFrom(body, ["marketPrice"]) || "created";
          save();
        }
      }

      setStage({ name: "complete", status: "done" });
      setCompleted(true);
      await onCreated();
    } catch (requestError) {
      setStage((current) => ({ ...current, status: "failed" }));
      setError(requestError instanceof Error ? requestError.message : "Product creation failed.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "mt-2 h-11 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 text-sm text-black outline-none focus:border-[#f10606]/45 disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation">
      <section aria-labelledby="create-product-title" aria-modal="true" className="max-h-[94dvh] w-full max-w-6xl overflow-y-auto rounded-t-[1.5rem] bg-[#f8f8f8] shadow-2xl sm:rounded-[1.5rem]" role="dialog">
        <header className="sticky top-0 z-30 flex items-start justify-between gap-4 border-b border-black/10 bg-white px-5 py-4 sm:px-7">
          <div>
            <h2 className="text-xl font-black text-black" id="create-product-title">{isEditing ? `Edit ${editProduct?.name}` : "Create catalogue product"}</h2>
            <p className="mt-1 text-xs font-medium text-black/48">{isEditing ? "Update the product using the same catalogue structure used during creation." : "One form creates the product, its sellable offerings, and optional starting prices."}</p>
          </div>
          <button aria-label="Close create product" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55" disabled={isSubmitting} type="button" onClick={onClose}>
            <X size={18} />
          </button>
        </header>

        <form className="grid gap-5 p-4 sm:p-7 xl:grid-cols-[1fr_17rem]" onSubmit={submit}>
          <div className="space-y-5">
            <FormSection number="1" title="Product Information" description="The general product shared by every offering.">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Product name" required><input className={inputClass} disabled={Boolean(created.productId)} value={product.name} onChange={(event) => updateProduct({ name: event.target.value })} placeholder="Spaghetti" /></Field>
                <Field label="Product SKU" required><input className={inputClass} disabled={Boolean(created.productId)} value={product.sku} onChange={(event) => updateProduct({ sku: event.target.value })} placeholder="SPAGHETTI" /></Field>
                <Field label="Category" required>
                  <select
                    className={inputClass}
                    disabled={Boolean(created.productId) || isLoadingLookups}
                    value={product.category}
                    onChange={(event) => updateProduct({ category: event.target.value })}
                  >
                    <option value="">{isLoadingLookups ? "Loading active categories..." : "Select category"}</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Image URL"><input className={inputClass} disabled={Boolean(created.productId)} value={product.imageUrl} onChange={(event) => updateProduct({ imageUrl: event.target.value })} placeholder="https://..." /></Field>
              </div>
              <Field label="Description"><textarea className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-[#fafafa] px-3 py-3 text-sm outline-none focus:border-[#f10606]/45 disabled:opacity-60" disabled={Boolean(created.productId)} value={product.description} onChange={(event) => updateProduct({ description: event.target.value })} placeholder="Packaged spaghetti products" /></Field>
              <div className="grid gap-4 md:grid-cols-[1fr_12rem] md:items-end">
                <Field label="Does this product have variants?" required>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[true, false].map((value) => (
                      <button className={`h-11 rounded-xl border text-sm font-black ${product.hasVariants === value ? "border-[#f10606] bg-[#fff0f0] text-[#f10606]" : "border-black/10 bg-white text-black/55"}`} disabled={Boolean(created.productId)} key={String(value)} type="button" onClick={() => updateProduct({ hasVariants: value })}>
                        {value ? "Yes" : "No"}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="flex h-20 items-center justify-center overflow-hidden rounded-xl border border-dashed border-black/10 bg-white text-black/30">
                  {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary API image URLs are previewed before their host is known */}
                  {product.imageUrl ? <img alt="" className="h-full w-full object-cover" src={product.imageUrl} /> : <ImageIcon size={25} />}
                </div>
              </div>
            </FormSection>

            <FormSection number="2" title="Sellable Options" description="Each row becomes one exact product offering.">
              <datalist id="brand-options">{brands.map((item) => <option key={item.id} value={item.name} />)}</datalist>
              <datalist id="manufacturer-options">{manufacturers.map((item) => <option key={item.id} value={item.name} />)}</datalist>
              <datalist id="package-options">{packages.map((item) => <option key={item.id} value={item.name} />)}</datalist>
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <article className={`rounded-2xl border bg-white p-4 ${duplicateKeys.has(row.key) ? "border-red-300" : "border-black/10"}`} key={row.key}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-black">Option {index + 1}</p>
                        {duplicateKeys.has(row.key) ? <p className="mt-1 text-[11px] font-bold text-red-600">This row duplicates another option or SKU.</p> : null}
                      </div>
                      <button aria-label={`Remove option ${index + 1}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-black/40 hover:bg-red-50 hover:text-red-600 disabled:opacity-30" disabled={Boolean(row.existingId) || rows.length === 1 || Boolean(created.offerings[row.key])} type="button" onClick={() => setRows((current) => current.filter((item) => item.key !== row.key))}><Trash2 size={16} /></button>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {product.hasVariants ? (
                        <>
                          <Field label="Variant" required><input className={inputClass} disabled={Boolean(created.variants[keyOf(row.variantName)])} value={row.variantName} onChange={(event) => updateRow(row.key, { variantName: event.target.value })} placeholder="North" /></Field>
                          <Field label="Variant code" required><input className={inputClass} disabled={Boolean(created.variants[keyOf(row.variantName)])} value={row.variantCode} onChange={(event) => updateRow(row.key, { variantCode: event.target.value })} placeholder="NORTH" /></Field>
                        </>
                      ) : null}
                      <Field label="Brand" required={!row.unbranded}>
                        <input className={inputClass} disabled={row.unbranded || Boolean(created.offerings[row.key])} list="brand-options" value={row.brandName} onChange={(event) => updateRow(row.key, { brandName: event.target.value })} placeholder="Golden Penny" />
                        <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-black/55"><input checked={row.unbranded} disabled={Boolean(created.offerings[row.key])} type="checkbox" onChange={(event) => updateRow(row.key, { unbranded: event.target.checked, brandName: event.target.checked ? "" : row.brandName, manufacturerName: event.target.checked ? "" : row.manufacturerName })} /> Unbranded</label>
                      </Field>
                      <Field label="Manufacturer"><input className={inputClass} disabled={row.unbranded || Boolean(created.offerings[row.key])} list="manufacturer-options" value={row.manufacturerName} onChange={(event) => updateRow(row.key, { manufacturerName: event.target.value })} placeholder="Optional" /></Field>
                      <Field label="Package" required><input className={inputClass} disabled={Boolean(created.offerings[row.key])} list="package-options" value={row.packageName} onChange={(event) => {
                        const match = packages.find((item) => keyOf(item.name) === keyOf(event.target.value));
                        updateRow(row.key, {
                          packageName: event.target.value,
                          ...(match?.packageType ? { packageType: match.packageType } : {}),
                          ...(match?.baseUnit ? { baseUnit: match.baseUnit } : {}),
                          ...(match?.quantity !== undefined ? { quantity: String(match.quantity) } : {}),
                        });
                      }} placeholder="500 g pack" /></Field>
                      <Field label="Package type" required><select className={inputClass} disabled={Boolean(created.offerings[row.key])} value={row.packageType} onChange={(event) => updateRow(row.key, { packageType: event.target.value }, false)}><option value="other">Other</option><option value="bag">Bag</option><option value="basket">Basket</option><option value="bottle">Bottle</option><option value="box">Box</option><option value="carton">Carton</option><option value="pack">Pack</option><option value="sack">Sack</option></select></Field>
                      <Field label="Base unit" required><input className={inputClass} disabled={Boolean(created.offerings[row.key])} value={row.baseUnit} onChange={(event) => updateRow(row.key, { baseUnit: event.target.value }, false)} placeholder="g, kg, basket..." /></Field>
                      <Field label="Quantity" required><input className={inputClass} disabled={Boolean(created.offerings[row.key])} min="0.01" step="any" type="number" value={row.quantity} onChange={(event) => updateRow(row.key, { quantity: event.target.value }, false)} /></Field>
                      <Field label="Offering SKU" required><input className={inputClass} disabled={Boolean(created.offerings[row.key])} value={row.sku} onChange={(event) => updateRow(row.key, { sku: event.target.value, skuEdited: true }, false)} placeholder="SPAG-GP-500G" /></Field>
                    </div>
                    {created.offerings[row.key] ? <p className="mt-3 flex items-center gap-1 text-[11px] font-bold text-emerald-700"><Check size={13} /> Offering created: {created.offerings[row.key]}</p> : null}
                  </article>
                ))}
              </div>
              <button className="mt-4 flex h-11 items-center gap-2 rounded-xl border border-dashed border-[#f10606]/30 px-4 text-xs font-black text-[#f10606] disabled:opacity-40" disabled={isSubmitting || Boolean(created.productId)} type="button" onClick={() => setRows((current) => [...current, newRow(product.sku)])}><Plus size={16} /> Add sellable option</button>
            </FormSection>

            <FormSection number="3" title="Initial Market Prices" description="Optional. Add multiple markets to each offering; prices submit only after that offering succeeds.">
              <div className="space-y-4">
                {rows.map((row, index) => (
                  <article className="rounded-2xl border border-black/10 bg-white p-4" key={`price-${row.key}`}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-black text-black">Option {index + 1}: {row.sku || "New offering"}</p>
                        <p className="mt-1 text-[11px] font-bold text-black/45">
                          {row.prices.length ? `${row.prices.length} market price${row.prices.length === 1 ? "" : "s"} added` : "No initial market prices added"}
                        </p>
                      </div>
                      <button
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#fff0f0] px-4 text-xs font-black text-[#f10606] disabled:opacity-40"
                        disabled={isSubmitting || completed}
                        type="button"
                        onClick={() => addMarketPrice(row.key)}
                      >
                        <Plus size={15} />
                        Add market price
                      </button>
                    </div>

                    {row.prices.length ? (
                      <div className="mt-4 space-y-3">
                        {row.prices.map((price, priceIndex) => {
                          const priceCreated = Boolean(created.prices[price.key]);
                          return (
                            <div className="rounded-xl border border-black/10 bg-[#fafafa] p-3" key={price.key}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-xs font-black text-black/60">Market price {priceIndex + 1}</p>
                                <button
                                  aria-label={`Remove market price ${priceIndex + 1} from option ${index + 1}`}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-black/35 hover:bg-red-50 hover:text-red-600 disabled:opacity-30"
                                  disabled={Boolean(price.existingId) || priceCreated || isSubmitting}
                                  type="button"
                                  onClick={() => removeMarketPrice(row.key, price.key)}
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                              <div className="mt-2 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                                <Field label="Market" required><select className={inputClass} disabled={priceCreated} value={price.marketId} onChange={(event) => updateMarketPrice(row.key, price.key, { marketId: event.target.value })}><option value="">Select market</option>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select></Field>
                                <Field label="Price" required><input className={inputClass} disabled={priceCreated} min="0" step="any" type="number" value={price.amount} onChange={(event) => updateMarketPrice(row.key, price.key, { amount: event.target.value })} /></Field>
                                <Field label="Currency" required><input className={inputClass} disabled={priceCreated} value={price.currency} onChange={(event) => updateMarketPrice(row.key, price.key, { currency: event.target.value })} /></Field>
                                <Field label="Observed at" required><input className={inputClass} disabled={priceCreated} type="datetime-local" value={price.observedAt} onChange={(event) => updateMarketPrice(row.key, price.key, { observedAt: event.target.value })} /></Field>
                                <Field label="Quality grade"><input className={inputClass} disabled={priceCreated} value={price.qualityGrade} onChange={(event) => updateMarketPrice(row.key, price.key, { qualityGrade: event.target.value })} /></Field>
                              </div>
                              {priceCreated ? <p className="mt-2 flex items-center gap-1 text-[10px] font-bold text-emerald-700"><Check size={12} /> Market price created: {created.prices[price.key]}</p> : null}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </FormSection>
          </div>

          <aside className="xl:sticky xl:top-24 xl:h-max">
            <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
              <h3 className="text-sm font-black text-black">{isEditing ? "Update progress" : "Creation progress"}</h3>
              <div className="mt-4 space-y-3">
                {(Object.keys(stageLabels) as StageName[]).map((name) => {
                  const names = Object.keys(stageLabels) as StageName[];
                  const currentIndex = names.indexOf(stage.name);
                  const itemIndex = names.indexOf(name);
                  const isDone = completed || itemIndex < currentIndex || (name === stage.name && stage.status === "done");
                  const isActive = name === stage.name && stage.status === "active";
                  const isFailed = name === stage.name && stage.status === "failed";
                  return (
                    <div className="flex gap-2.5" key={name}>
                      <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${isDone ? "bg-emerald-100 text-emerald-700" : isFailed ? "bg-red-100 text-red-700" : isActive ? "bg-[#fff0f0] text-[#f10606]" : "bg-black/[0.04] text-black/30"}`}>
                        {isDone ? <Check size={12} /> : isFailed ? <AlertCircle size={12} /> : isActive ? <LoaderCircle className="animate-spin" size={12} /> : <Circle size={9} />}
                      </div>
                      <div><p className="text-xs font-black text-black/70">{stageLabels[name]}</p>{name === stage.name && stage.detail ? <p className="mt-0.5 break-all text-[10px] font-bold text-black/40">{stage.detail}</p> : null}</div>
                    </div>
                  );
                })}
              </div>
              {isLoadingLookups ? <p className="mt-4 flex items-center gap-2 rounded-xl bg-[#fafafa] p-3 text-[11px] font-bold text-black/45"><LoaderCircle className="animate-spin" size={14} /> Loading existing catalogue data...</p> : null}
              {error ? <p aria-live="polite" className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">{error}</p> : null}
              {created.productId ? <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-[11px] font-bold text-emerald-800">Product ID retained: <span className="break-all">{created.productId}</span></p> : null}
              {completed ? (
                <div className="mt-4 rounded-xl bg-emerald-50 p-3">
                  <p className="text-sm font-black text-emerald-800">Catalogue product {isEditing ? "updated" : "created"}</p>
                  <p className="mt-1 text-xs font-bold text-emerald-700">{product.name} · {rows.length} offering(s) · {rows.reduce((total, row) => total + row.prices.length, 0)} price(s).</p>
                  <div className="mt-3 space-y-2">
                    {rows.map((row) => (
                      <div className="rounded-lg bg-white/80 p-2" key={`summary-${row.key}`}>
                        <p className="break-all text-[10px] font-black text-emerald-900">{row.sku}</p>
                        <p className="mt-0.5 break-all text-[9px] font-bold text-emerald-700">
                          Offering: {row.existingId || created.offerings[row.key]} · {row.prices.length} price(s)
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting || completed} type="submit">
                {isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : stage.status === "failed" ? <RotateCcw size={17} /> : <PackagePlus size={17} />}
                {isSubmitting ? (isEditing ? "Updating..." : "Creating...") : stage.status === "failed" ? "Retry failed stage" : isEditing ? "Update product" : "Create product"}
              </button>
              {completed ? <button className="mt-2 h-11 w-full rounded-xl border border-black/10 text-xs font-black text-black/60" type="button" onClick={onClose}>Close summary</button> : null}
            </section>
          </aside>
        </form>
      </section>
    </div>
  );
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.03)] sm:p-5">
      <header className="mb-5 flex gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f10606] text-xs font-black text-white">{number}</span>
        <div><h3 className="text-base font-black text-black">{title}</h3><p className="mt-1 text-xs font-medium text-black/45">{description}</p></div>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return <div className="block"><span className="text-xs font-black text-black">{label}{required ? <span className="text-[#f10606]"> *</span> : null}</span>{children}</div>;
}

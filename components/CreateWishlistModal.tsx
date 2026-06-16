"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { authenticatedFetch } from "@/lib/authClient";
import { API_BASE_URL, PRODUCTS_URL, WISHLISTS_URL } from "@/Serverurls";

type WishlistItemInput = {
  id: string;
  productId: string;
  productSearch: string;
  quantity: string;
  unit: string;
};

type ProductOption = {
  id: string;
  name: string;
  sku?: string;
  category?: string;
  availableUnits: string[];
};

const wishlistsEndpoint = `${API_BASE_URL}${WISHLISTS_URL}`;
const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;

function createEmptyItem(): WishlistItemInput {
  return {
    id: crypto.randomUUID(),
    productId: "",
    productSearch: "",
    quantity: "1",
    unit: "",
  };
}

function getResponseMessage(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const message = (body as { message?: unknown }).message;

  if (Array.isArray(message)) {
    return message
      .filter((item): item is string => typeof item === "string")
      .join(" ");
  }

  return typeof message === "string" && message.trim() ? message : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseProductOption(value: unknown): ProductOption | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = typeof value.id === "string" ? value.id.trim() : "";
  const name = typeof value.name === "string" ? value.name.trim() : "";

  if (!id || !name) {
    return null;
  }

  return {
    id,
    name,
    sku: typeof value.sku === "string" ? value.sku : undefined,
    category: typeof value.category === "string" ? value.category : undefined,
    availableUnits: Array.isArray(value.availableUnits)
      ? value.availableUnits.flatMap((unitValue): string[] => {
          if (!isRecord(unitValue)) {
            return [];
          }

          const unit = unitValue.unit;
          return typeof unit === "string" && unit.trim() ? [unit.trim()] : [];
        })
      : [],
  };
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
    throw new Error(
      getResponseMessage(body, `Unable to search products (${response.status}).`),
    );
  }

  const data = isRecord(body) ? body.data : null;
  return Array.isArray(data) ? data.flatMap((item) => {
    const product = parseProductOption(item);
    return product ? [product] : [];
  }) : [];
}

export function CreateWishlistModal({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<WishlistItemInput[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [productOptions, setProductOptions] = useState<Record<string, ProductOption[]>>({});
  const [selectedProductUnits, setSelectedProductUnits] = useState<Record<string, string[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<string, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<string, string>>({});
  const searchTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const searchControllersRef = useRef<Record<string, AbortController>>({});

  useEffect(() => {
    const searchTimers = searchTimersRef.current;
    const searchControllers = searchControllersRef.current;

    return () => {
      Object.values(searchTimers).forEach(clearTimeout);
      Object.values(searchControllers).forEach((controller) => controller.abort());
    };
  }, []);

  function openModal() {
    setName("");
    setItems([createEmptyItem()]);
    setError("");
    setSuccess("");
    setProductOptions({});
    setSelectedProductUnits({});
    setProductSearchLoading({});
    setProductSearchErrors({});
    setIsOpen(true);
  }

  function closeModal() {
    if (!isSubmitting) {
      setIsOpen(false);
    }
  }

  function updateItem(
    id: string,
    field: "productId" | "productSearch" | "quantity" | "unit",
    value: string,
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, [field]: value } : item,
      ),
    );
  }

  function queueProductSearch(itemId: string, query: string) {
    clearTimeout(searchTimersRef.current[itemId]);
    searchControllersRef.current[itemId]?.abort();

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setProductOptions((current) => ({ ...current, [itemId]: [] }));
      setProductSearchLoading((current) => ({ ...current, [itemId]: false }));
      setProductSearchErrors((current) => ({ ...current, [itemId]: "" }));
      return;
    }

    setProductSearchLoading((current) => ({ ...current, [itemId]: true }));
    setProductSearchErrors((current) => ({ ...current, [itemId]: "" }));

    searchTimersRef.current[itemId] = setTimeout(() => {
      const controller = new AbortController();
      searchControllersRef.current[itemId] = controller;

      void fetchProductOptions(trimmedQuery, controller.signal)
        .then((options) => {
          setProductOptions((current) => ({ ...current, [itemId]: options }));
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") {
            return;
          }

          setProductOptions((current) => ({ ...current, [itemId]: [] }));
          setProductSearchErrors((current) => ({
            ...current,
            [itemId]:
              requestError instanceof Error
                ? requestError.message
                : "Unable to search products.",
          }));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setProductSearchLoading((current) => ({ ...current, [itemId]: false }));
          }
        });
    }, 350);
  }

  function updateProductSearch(id: string, value: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === id ? { ...item, productSearch: value, productId: "", unit: "" } : item,
      ),
    );
    setSelectedProductUnits((current) => ({ ...current, [id]: [] }));
    queueProductSearch(id, value);
  }

  function selectProduct(itemId: string, product: ProductOption) {
    const defaultUnit = product.availableUnits[0] ?? "";

    setItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              productId: product.id,
              productSearch: product.name,
              unit: product.availableUnits.includes(item.unit) ? item.unit : defaultUnit,
            }
          : item,
      ),
    );
    setSelectedProductUnits((current) => ({
      ...current,
      [itemId]: product.availableUnits,
    }));
    setProductOptions((current) => ({ ...current, [itemId]: [] }));
    setProductSearchErrors((current) => ({ ...current, [itemId]: "" }));
  }

  function removeItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
    clearTimeout(searchTimersRef.current[id]);
    searchControllersRef.current[id]?.abort();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const wishlistName = name.trim();
    const normalizedItems = items.map((item) => ({
      productId: item.productId.trim(),
      quantity: Number(item.quantity),
      unit: item.unit.trim(),
    }));

    if (!wishlistName) {
      setError("Enter a name for the wishlist.");
      return;
    }

    if (!normalizedItems.length) {
      setError("Add at least one product.");
      return;
    }

    if (
      normalizedItems.some(
        (item) =>
          !item.productId ||
          !item.unit ||
          !Number.isFinite(item.quantity) ||
          item.quantity <= 0,
      )
    ) {
      setError("Select a product, then provide a valid quantity and unit for every item.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await authenticatedFetch(wishlistsEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: wishlistName,
          items: normalizedItems,
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(
          getResponseMessage(
            body,
            `Unable to create wishlist (${response.status}).`,
          ),
        );
      }

      setSuccess(getResponseMessage(body, "Wishlist created successfully."));
      onCreated?.();
      setTimeout(() => setIsOpen(false), 900);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create wishlist.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#f10606] px-4 text-xs font-black text-white shadow-[0_10px_22px_rgba(241,6,6,0.22)]"
        type="button"
        onClick={openModal}
      >
        <Plus size={16} />
        Add Wishlist
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            aria-labelledby="create-wishlist-title"
            aria-modal="true"
            className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.5rem] bg-white p-5 shadow-2xl sm:rounded-[1.5rem]"
            role="dialog"
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2
                  className="text-lg font-black text-black"
                  id="create-wishlist-title"
                >
                  Add Wishlist
                </h2>
                <p className="mt-1 text-xs font-medium text-black/48">
                  Group products you want to order later.
                </p>
              </div>
              <button
                aria-label="Close add wishlist"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/[0.04] text-black/55"
                disabled={isSubmitting}
                type="button"
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </header>

            <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="text-xs font-black text-black">
                  Wishlist name
                </span>
                <input
                  className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                  placeholder="Monthly Groceries"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-black">Products</p>
                  <button
                    className="flex items-center gap-1 text-[10px] font-black text-[#f10606]"
                    type="button"
                    onClick={() =>
                      setItems((current) => [...current, createEmptyItem()])
                    }
                  >
                    <Plus size={14} />
                    Add item
                  </button>
                </div>

                {items.map((item, index) => (
                  <fieldset
                    className="space-y-3 rounded-2xl border border-black/10 bg-[#fafafa] p-3.5"
                    key={item.id}
                  >
                    <div className="flex items-center justify-between">
                      <legend className="text-[10px] font-black uppercase text-black/42">
                        Item {index + 1}
                      </legend>
                      {items.length > 1 ? (
                        <button
                          aria-label={`Remove item ${index + 1}`}
                          className="text-[#f10606]"
                          type="button"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 size={15} />
                        </button>
                      ) : null}
                    </div>
                    <div className="relative">
                      <input
                        aria-autocomplete="list"
                        className="h-11 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                        placeholder="Search product, e.g. rice"
                        value={item.productSearch}
                        onChange={(event) =>
                          updateProductSearch(item.id, event.target.value)
                        }
                      />
                      {item.productId ? (
                        <p className="mt-1 text-[10px] font-bold text-emerald-700">
                          Selected product ID: {item.productId}
                        </p>
                      ) : null}
                      {productSearchLoading[item.id] ? (
                        <p className="mt-1 text-[10px] font-bold text-black/45">
                          Searching products...
                        </p>
                      ) : null}
                      {productSearchErrors[item.id] ? (
                        <p className="mt-1 text-[10px] font-bold text-red-700">
                          {productSearchErrors[item.id]}
                        </p>
                      ) : null}
                      {productOptions[item.id]?.length ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                          {productOptions[item.id].map((product) => (
                            <button
                              className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]"
                              key={product.id}
                              type="button"
                              value={product.id}
                              onClick={() => selectProduct(item.id, product)}
                            >
                              <span className="block text-xs font-black text-black">
                                {product.name}
                              </span>
                              <span className="mt-0.5 block truncate text-[10px] font-bold text-black/45">
                                {[product.category, product.sku, product.id].filter(Boolean).join(" - ")}
                              </span>
                              {product.availableUnits.length ? (
                                <span className="mt-0.5 block truncate text-[10px] font-bold text-emerald-700">
                                  Units: {product.availableUnits.join(", ")}
                                </span>
                              ) : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        className="h-11 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                        min="0.01"
                        placeholder="Quantity"
                        step="any"
                        type="number"
                        value={item.quantity}
                        onChange={(event) =>
                          updateItem(item.id, "quantity", event.target.value)
                        }
                      />
                      <select
                        className="h-11 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                        disabled={!selectedProductUnits[item.id]?.length}
                        value={item.unit}
                        onChange={(event) =>
                          updateItem(item.id, "unit", event.target.value)
                        }
                      >
                        <option value="">
                          {selectedProductUnits[item.id]?.length
                            ? "Select unit"
                            : "Select product first"}
                        </option>
                        {(selectedProductUnits[item.id] ?? []).map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </fieldset>
                ))}
              </div>

              {error ? (
                <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
                  {error}
                </p>
              ) : null}
              {success ? (
                <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-700">
                  {success}
                </p>
              ) : null}

              <button
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <Plus size={17} />
                )}
                {isSubmitting ? "Creating..." : "Create Wishlist"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </>
  );
}

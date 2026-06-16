"use client";

import { CreateWishlistModal } from "@/components/CreateWishlistModal";
import {
  API_BASE_URL,
  CREATE_ORDER_URL,
  PRODUCTS_URL,
  VERIFY_PAYMENT_URL,
  WISHLISTS_URL,
} from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle,
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Copy,
  Heart,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  ShoppingCart,
  Trash2,
} from "lucide-react";

type WishlistItem = {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
};

type Wishlist = {
  id: string;
  name: string;
  items: WishlistItem[];
};

type ItemDraft = {
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

type QuoteResponseItem = {
  original: string;
  status: string;
  interpretation: {
    product?: string;
    quantity?: number;
    unit?: string;
  };
  availableUnits: string[];
  buyPriceId?: string;
  unitPrice?: number;
  totalPrice?: number;
  message: string;
};

type WishlistQuote = {
  message: string;
  canProceed: boolean;
  items: QuoteResponseItem[];
  quoteItems: {
    buyPriceId: string;
    quantity: number;
  }[];
  summary: {
    received: number;
    matched: number;
    requiresAttention: number;
  };
  subtotal?: number;
  serviceFee?: number;
  deliveryFee?: number;
  total?: number;
};

type CreatedOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal?: number;
  serviceFee?: number;
  deliveryFee?: number;
  total?: number;
};

type PaymentChargeData = {
  status?: string;
  reference?: string;
  amount?: number;
  currency?: string;
  displayText?: string;
  accountName?: string;
  accountNumber?: string;
  bankName?: string;
  accountExpiresAt?: string;
};

type OrderPayment = {
  reference: string;
  status: string;
  paymentAction?: string;
  retryAfterSeconds?: number;
  message?: string;
  charge?: PaymentChargeData;
};

type CreateOrderResult = {
  message: string;
  order: CreatedOrder;
  payment: OrderPayment | null;
};

type PaymentVerification = {
  message: string;
  payment: {
    providerReference: string;
    status: string;
    paidAt?: string;
  };
};

const wishlistsEndpoint = `${API_BASE_URL}${WISHLISTS_URL}`;
const productsEndpoint = `${API_BASE_URL}${PRODUCTS_URL}`;
const createOrderEndpoint = `${API_BASE_URL}${CREATE_ORDER_URL}`;
const verifyPaymentEndpoint = `${API_BASE_URL}${VERIFY_PAYMENT_URL}`;

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
  const value = readText(record, keys);
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function parseWishlistItem(value: unknown): WishlistItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const product = isRecord(value.product) ? value.product : null;
  const productId =
    readText(value, ["productId", "product_id"]) || (product ? readText(product, ["id"]) : "");
  const id = readText(value, ["id", "itemId"]);

  if (!id || !productId) {
    return null;
  }

  return {
    id,
    productId,
    productName: (product ? readText(product, ["name", "title"]) : "") || "Wishlist product",
    quantity: readNumber(value, ["quantity"]) || 1,
    unit: readText(value, ["unit"]) || "unit",
  };
}

function parseWishlist(value: unknown): Wishlist | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readText(value, ["id"]);

  if (!id) {
    return null;
  }

  const rawItems = Array.isArray(value.items) ? value.items : [];

  return {
    id,
    name: readText(value, ["name", "title"]) || "Wishlist",
    items: rawItems.flatMap((item) => {
      const parsedItem = parseWishlistItem(item);
      return parsedItem ? [parsedItem] : [];
    }),
  };
}

function parseWishlistList(body: unknown) {
  const value = isRecord(body)
    ? body.data ?? body.wishlists ?? body.results ?? body
    : body;
  const list = Array.isArray(value) ? value : [value];

  return list.flatMap((item) => {
    const wishlist = parseWishlist(item);
    return wishlist ? [wishlist] : [];
  });
}

function parseWishlistResponse(body: unknown) {
  const value = isRecord(body) ? body.data ?? body.wishlist ?? body : body;
  return parseWishlist(value);
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
      ? value.availableUnits.flatMap((unitValue): string[] => {
          if (!isRecord(unitValue)) {
            return [];
          }

          const unit = readText(unitValue, ["unit"]);
          return unit ? [unit] : [];
        })
      : [],
  };
}

function parseWishlistQuote(value: unknown): WishlistQuote | null {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return null;
  }

  const items = value.items.flatMap((item): QuoteResponseItem[] => {
    if (!isRecord(item)) {
      return [];
    }

    const original =
      readText(item, ["original"]) ||
      readText(item, ["productName", "product", "name"]);
    const status = readText(item, ["status"]);

    if (!original || !status) {
      return [];
    }

    const interpretation = isRecord(item.interpretation) ? item.interpretation : {};
    const quantity = readNumber(interpretation, ["quantity"]) || readNumber(item, ["quantity"]);
    const unitPrice = readNumber(item, ["unitPrice"]);
    const totalPrice = readNumber(item, ["totalPrice"]);

    return [{
      original,
      status,
      interpretation: {
        product:
          readText(interpretation, ["product"]) ||
          readText(item, ["productName", "product", "name"]) ||
          undefined,
        quantity: quantity || undefined,
        unit: readText(interpretation, ["unit"]) || readText(item, ["unit"]) || undefined,
      },
      availableUnits: Array.isArray(item.availableUnits)
        ? item.availableUnits.filter((unit): unit is string => typeof unit === "string")
        : [],
      buyPriceId: readText(item, ["buyPriceId"]) || undefined,
      unitPrice: unitPrice || undefined,
      totalPrice: totalPrice || undefined,
      message: readText(item, ["message"]),
    }];
  });

  const rawQuoteItems = Array.isArray(value.quoteItems)
    ? value.quoteItems
    : Array.isArray(value.orderItems)
      ? value.orderItems
      : [];
  const quoteItems = rawQuoteItems.flatMap((item): WishlistQuote["quoteItems"] => {
    if (!isRecord(item)) {
      return [];
    }

    const buyPriceId = readText(item, ["buyPriceId"]);
    const quantity = readNumber(item, ["quantity"]);

    return buyPriceId && quantity > 0 ? [{ buyPriceId, quantity }] : [];
  });
  const summary = isRecord(value.summary) ? value.summary : {};
  const orderQuote = isRecord(value.orderQuote) ? value.orderQuote : {};
  const quote = isRecord(orderQuote.quote) ? orderQuote.quote : {};

  return {
    message: readText(value, ["message"]) || "Wishlist quote generated.",
    canProceed: value.canProceed === true,
    items,
    quoteItems,
    summary: {
      received: readNumber(summary, ["received"]) || items.length,
      matched: readNumber(summary, ["matched"]) || items.filter((item) => item.status === "matched").length,
      requiresAttention:
        readNumber(summary, ["requiresAttention"]) ||
        items.filter((item) => item.status !== "matched").length,
    },
    subtotal: readNumber(quote, ["subtotal"]) || undefined,
    serviceFee: readNumber(quote, ["serviceFee"]) || undefined,
    deliveryFee: readNumber(quote, ["deliveryFee"]) || undefined,
    total: readNumber(quote, ["total"]) || undefined,
  };
}

function parseCreateOrderResponse(value: unknown): CreateOrderResult | null {
  if (!isRecord(value) || !isRecord(value.order)) {
    return null;
  }

  const orderValue = value.order;
  const orderId = readText(orderValue, ["id"]);

  if (!orderId) {
    return null;
  }

  const paymentValue = isRecord(value.payment) ? value.payment : null;
  const chargeValue =
    paymentValue && isRecord(paymentValue.charge) ? paymentValue.charge : null;
  const chargeData =
    chargeValue && isRecord(chargeValue.data) ? chargeValue.data : null;
  const bankValue =
    chargeData && isRecord(chargeData.bank) ? chargeData.bank : null;

  return {
    message: readText(value, ["message"]) || "Order created successfully.",
    order: {
      id: orderId,
      status: readText(orderValue, ["status"]) || "pending",
      paymentStatus: readText(orderValue, ["paymentStatus"]) || "pending",
      subtotal: readNumber(orderValue, ["subtotal"]) || undefined,
      serviceFee: readNumber(orderValue, ["serviceFee"]) || undefined,
      deliveryFee: readNumber(orderValue, ["deliveryFee"]) || undefined,
      total: readNumber(orderValue, ["total"]) || undefined,
    },
    payment: paymentValue
      ? {
          reference: readText(paymentValue, ["reference"]),
          status: readText(paymentValue, ["status"]) || "pending",
          paymentAction: readText(paymentValue, ["paymentAction"]) || undefined,
          retryAfterSeconds: readNumber(paymentValue, ["retryAfterSeconds"]) || undefined,
          message: readText(paymentValue, ["message"]) || undefined,
          charge: chargeData
            ? {
                status: readText(chargeData, ["status"]) || undefined,
                reference: readText(chargeData, ["reference"]) || undefined,
                amount: readNumber(chargeData, ["amount"]) || undefined,
                currency: readText(chargeData, ["currency"]) || undefined,
                displayText:
                  readText(chargeData, ["display_text", "displayText"]) || undefined,
                accountName:
                  readText(chargeData, ["account_name", "accountName"]) || undefined,
                accountNumber:
                  readText(chargeData, ["account_number", "accountNumber"]) || undefined,
                bankName:
                  (bankValue ? readText(bankValue, ["name"]) : "") || undefined,
                accountExpiresAt:
                  readText(chargeData, ["account_expires_at", "accountExpiresAt"]) ||
                  undefined,
              }
            : undefined,
        }
      : null,
  };
}

function parsePaymentVerification(value: unknown): PaymentVerification | null {
  if (!isRecord(value) || !isRecord(value.payment)) {
    return null;
  }

  const payment = value.payment;
  const providerReference = readText(payment, ["providerReference"]);
  const status = readText(payment, ["status"]);

  if (!providerReference || !status) {
    return null;
  }

  return {
    message: readText(value, ["message"]) || "Payment verification record found.",
    payment: {
      providerReference,
      status,
      paidAt: readText(payment, ["paidAt"]) || undefined,
    },
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

function createEmptyDraft(): ItemDraft {
  return {
    productId: "",
    productSearch: "",
    quantity: "1",
    unit: "",
  };
}

function normalizeItemDraft(draft: ItemDraft) {
  return {
    productId: draft.productId.trim(),
    quantity: Number(draft.quantity),
    unit: draft.unit.trim(),
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function CustomerMobileWishlist() {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [expandedWishlistId, setExpandedWishlistId] = useState("");
  const [drafts, setDrafts] = useState<Record<string, ItemDraft>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quotes, setQuotes] = useState<Record<string, WishlistQuote>>({});
  const [orderResults, setOrderResults] = useState<Record<string, CreateOrderResult>>({});
  const [paymentVerifications, setPaymentVerifications] = useState<Record<string, PaymentVerification>>({});
  const [paymentVerificationErrors, setPaymentVerificationErrors] = useState<Record<string, string>>({});
  const [copiedValues, setCopiedValues] = useState<Record<string, string>>({});
  const [productOptions, setProductOptions] = useState<Record<string, ProductOption[]>>({});
  const [selectedProductUnits, setSelectedProductUnits] = useState<Record<string, string[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<string, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<string, string>>({});
  const searchTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const searchControllersRef = useRef<Record<string, AbortController>>({});

  const loadWishlists = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await authenticatedFetch(wishlistsEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load wishlists (${response.status}).`));
      }

      setWishlists(parseWishlistList(body));
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load wishlists.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadWishlists();
    }, 0);

    return () => clearTimeout(timer);
  }, [loadWishlists]);

  useEffect(() => {
    const searchTimers = searchTimersRef.current;
    const searchControllers = searchControllersRef.current;

    return () => {
      Object.values(searchTimers).forEach(clearTimeout);
      Object.values(searchControllers).forEach((controller) => controller.abort());
    };
  }, []);

  const totalItems = wishlists.reduce((total, wishlist) => total + wishlist.items.length, 0);

  function updateWishlist(nextWishlist: Wishlist) {
    setWishlists((current) =>
      current.map((wishlist) => (wishlist.id === nextWishlist.id ? nextWishlist : wishlist)),
    );
  }

  async function loadWishlistDetails(id: string) {
    setExpandedWishlistId((current) => (current === id ? "" : id));

    if (expandedWishlistId === id) {
      return;
    }

    setBusyAction(`details-${id}`);
    setError("");

    try {
      const response = await authenticatedFetch(`${wishlistsEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to load wishlist (${response.status}).`));
      }

      const wishlist = parseWishlistResponse(body);

      if (wishlist) {
        updateWishlist(wishlist);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to load wishlist.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function addWishlistItem(id: string, event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const draft = normalizeItemDraft(drafts[id] ?? createEmptyDraft());

    if (!draft.productId || !draft.unit || !Number.isFinite(draft.quantity) || draft.quantity <= 0) {
      setError("Select a product, then provide a valid quantity and unit.");
      return;
    }

    setBusyAction(`add-${id}`);

    try {
      const response = await authenticatedFetch(`${wishlistsEndpoint}/${id}/items`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to add item (${response.status}).`));
      }

      setDrafts((current) => ({ ...current, [id]: createEmptyDraft() }));
      setProductOptions((current) => ({ ...current, [id]: [] }));
      setSelectedProductUnits((current) => ({ ...current, [id]: [] }));
      setProductSearchErrors((current) => ({ ...current, [id]: "" }));
      setNotice("Wishlist item added.");
      await loadWishlistDetails(id);
      setExpandedWishlistId(id);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to add item.");
    } finally {
      setBusyAction("");
    }
  }

  async function patchWishlistItem(wishlistId: string, item: WishlistItem) {
    setBusyAction(`patch-${item.id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(
        `${wishlistsEndpoint}/${wishlistId}/items/${item.id}`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            quantity: item.quantity,
            unit: item.unit,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to update item (${response.status}).`));
      }

      setNotice("Wishlist item updated.");
      await loadWishlistDetails(wishlistId);
      setExpandedWishlistId(wishlistId);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update item.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteWishlistItem(wishlistId: string, itemId: string) {
    setBusyAction(`delete-item-${itemId}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(
        `${wishlistsEndpoint}/${wishlistId}/items/${itemId}`,
        {
          method: "DELETE",
          headers: { Accept: "application/json" },
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to delete item (${response.status}).`));
      }

      setWishlists((current) =>
        current.map((wishlist) =>
          wishlist.id === wishlistId
            ? { ...wishlist, items: wishlist.items.filter((item) => item.id !== itemId) }
            : wishlist,
        ),
      );
      setNotice("Wishlist item removed.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete item.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteWishlist(id: string) {
    setBusyAction(`delete-list-${id}`);
    setError("");
    setNotice("");

    try {
      const response = await authenticatedFetch(`${wishlistsEndpoint}/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to delete wishlist (${response.status}).`));
      }

      setWishlists((current) => current.filter((wishlist) => wishlist.id !== id));
      setNotice("Wishlist deleted.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to delete wishlist.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function quoteWishlist(id: string) {
    setBusyAction(`quote-${id}`);
    setError("");
    setNotice("");
    setPaymentVerifications((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPaymentVerificationErrors((current) => ({ ...current, [id]: "" }));

    try {
      const response = await authenticatedFetch(`${wishlistsEndpoint}/${id}/quote`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to quote wishlist (${response.status}).`));
      }

      const quote = parseWishlistQuote(body);

      if (!quote) {
        throw new Error("The wishlist quote response was not in the expected format.");
      }

      setQuotes((current) => ({ ...current, [id]: quote }));
      setNotice("Wishlist quote generated.");
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to quote wishlist.",
      );
    } finally {
      setBusyAction("");
    }
  }

  async function orderWishlistQuote(id: string) {
    const quote = quotes[id];

    if (!quote?.canProceed || !quote.quoteItems.length) {
      return;
    }

    setBusyAction(`order-${id}`);
    setError("");
    setNotice("");
    setOrderResults((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPaymentVerifications((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setPaymentVerificationErrors((current) => ({ ...current, [id]: "" }));

    try {
      const response = await authenticatedFetch(createOrderEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ items: quote.quoteItems }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to submit order (${response.status}).`));
      }

      const result = parseCreateOrderResponse(body);

      if (!result) {
        throw new Error("The order response was not in the expected format.");
      }

      setOrderResults((current) => ({ ...current, [id]: result }));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit order.");
    } finally {
      setBusyAction("");
    }
  }

  async function verifyWishlistPayment(wishlistId: string) {
    const orderResult = orderResults[wishlistId];
    const providerReference =
      orderResult?.payment?.reference ||
      orderResult?.payment?.charge?.reference ||
      (orderResult ? `order_${orderResult.order.id}` : "");

    if (!providerReference) {
      return;
    }

    setBusyAction(`verify-${wishlistId}`);
    setPaymentVerificationErrors((current) => ({ ...current, [wishlistId]: "" }));

    try {
      const response = await authenticatedFetch(verifyPaymentEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerReference }),
      });
      const body = (await response.json().catch(() => null)) as unknown;

      if (!response.ok) {
        throw new Error(getResponseMessage(body, `Unable to verify payment (${response.status}).`));
      }

      const verification = parsePaymentVerification(body);

      if (!verification) {
        throw new Error("The payment verification response was not in the expected format.");
      }

      setPaymentVerifications((current) => ({ ...current, [wishlistId]: verification }));
    } catch (requestError) {
      setPaymentVerificationErrors((current) => ({
        ...current,
        [wishlistId]:
          requestError instanceof Error
            ? requestError.message
            : "Unable to verify payment.",
      }));
    } finally {
      setBusyAction("");
    }
  }

  async function copyPaymentValue(key: string, value: string) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedValues((current) => ({ ...current, [key]: "copied" }));
    setTimeout(() => {
      setCopiedValues((current) => ({ ...current, [key]: "" }));
    }, 1400);
  }

  function updateDraft(wishlistId: string, field: keyof ItemDraft, value: string) {
    setDrafts((current) => ({
      ...current,
      [wishlistId]: {
        ...(current[wishlistId] ?? createEmptyDraft()),
        [field]: value,
      },
    }));
  }

  function queueProductSearch(wishlistId: string, query: string) {
    clearTimeout(searchTimersRef.current[wishlistId]);
    searchControllersRef.current[wishlistId]?.abort();

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      setProductOptions((current) => ({ ...current, [wishlistId]: [] }));
      setProductSearchLoading((current) => ({ ...current, [wishlistId]: false }));
      setProductSearchErrors((current) => ({ ...current, [wishlistId]: "" }));
      return;
    }

    setProductSearchLoading((current) => ({ ...current, [wishlistId]: true }));
    setProductSearchErrors((current) => ({ ...current, [wishlistId]: "" }));

    searchTimersRef.current[wishlistId] = setTimeout(() => {
      const controller = new AbortController();
      searchControllersRef.current[wishlistId] = controller;

      void fetchProductOptions(trimmedQuery, controller.signal)
        .then((options) => {
          setProductOptions((current) => ({ ...current, [wishlistId]: options }));
        })
        .catch((requestError: unknown) => {
          if (requestError instanceof DOMException && requestError.name === "AbortError") {
            return;
          }

          setProductOptions((current) => ({ ...current, [wishlistId]: [] }));
          setProductSearchErrors((current) => ({
            ...current,
            [wishlistId]:
              requestError instanceof Error
                ? requestError.message
                : "Unable to search products.",
          }));
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setProductSearchLoading((current) => ({ ...current, [wishlistId]: false }));
          }
        });
    }, 350);
  }

  function updateProductSearch(wishlistId: string, value: string) {
    setDrafts((current) => ({
      ...current,
      [wishlistId]: {
        ...(current[wishlistId] ?? createEmptyDraft()),
        productSearch: value,
        productId: "",
        unit: "",
      },
    }));
    setSelectedProductUnits((current) => ({ ...current, [wishlistId]: [] }));
    queueProductSearch(wishlistId, value);
  }

  function selectProduct(wishlistId: string, product: ProductOption) {
    const defaultUnit = product.availableUnits[0] ?? "";

    setDrafts((current) => ({
      ...current,
      [wishlistId]: {
        ...(current[wishlistId] ?? createEmptyDraft()),
        productId: product.id,
        productSearch: product.name,
        unit: product.availableUnits.includes(current[wishlistId]?.unit ?? "")
          ? current[wishlistId]?.unit ?? ""
          : defaultUnit,
      },
    }));
    setSelectedProductUnits((current) => ({
      ...current,
      [wishlistId]: product.availableUnits,
    }));
    setProductOptions((current) => ({ ...current, [wishlistId]: [] }));
    setProductSearchErrors((current) => ({ ...current, [wishlistId]: "" }));
  }

  function updateLocalItem(
    wishlistId: string,
    itemId: string,
    field: "quantity" | "unit",
    value: string,
  ) {
    setWishlists((current) =>
      current.map((wishlist) =>
        wishlist.id === wishlistId
          ? {
              ...wishlist,
              items: wishlist.items.map((item) =>
                item.id === itemId
                  ? {
                      ...item,
                      [field]: field === "quantity" ? Number(value) : value,
                    }
                  : item,
              ),
            }
          : wishlist,
      ),
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <section className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black tracking-tight text-black">
            My Wishlist
          </h2>
          <p className="mt-1 text-xs font-medium text-black/48">
            Keep products you plan to order and monitor their prices.
          </p>
        </div>
        <CreateWishlistModal onCreated={loadWishlists} />
      </section>

      <section className="rounded-2xl bg-[#fff0f0] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#f10606]">
              <Heart size={20} fill="currentColor" />
            </span>
            <div>
              <p className="text-lg font-black text-black">{totalItems}</p>
              <p className="text-[10px] font-black uppercase text-black/42">
                Saved products
              </p>
            </div>
          </div>
          <button
            aria-label="Refresh wishlists"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#f10606]"
            disabled={isLoading}
            type="button"
            onClick={() => void loadWishlists()}
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={16} />
          </button>
        </div>
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

      {isLoading ? (
        <section className="space-y-3">
          {[0, 1].map((item) => (
            <div
              className="h-32 animate-pulse rounded-2xl border border-black/10 bg-white"
              key={item}
            />
          ))}
        </section>
      ) : wishlists.length ? (
        <section className="space-y-3">
          {wishlists.map((wishlist) => {
            const isExpanded = expandedWishlistId === wishlist.id;
            const draft = drafts[wishlist.id] ?? createEmptyDraft();
            const quote = quotes[wishlist.id];
            const orderResult = orderResults[wishlist.id];
            const paymentVerification = paymentVerifications[wishlist.id];
            const paymentVerificationError = paymentVerificationErrors[wishlist.id];
            const subtotal =
              quote?.subtotal ??
              quote?.items.reduce((sum, item) => sum + (item.totalPrice ?? 0), 0) ??
              0;

            return (
              <article
                className="rounded-2xl border border-black/10 bg-white p-3.5 shadow-[0_10px_26px_rgba(0,0,0,0.04)]"
                key={wishlist.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    type="button"
                    onClick={() => void loadWishlistDetails(wishlist.id)}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                      {busyAction === `details-${wishlist.id}` ? (
                        <LoaderCircle className="animate-spin" size={18} />
                      ) : (
                        <Heart size={18} fill="currentColor" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-black">
                        {wishlist.name}
                      </span>
                      <span className="mt-1 block text-[10px] font-bold text-black/42">
                        {wishlist.items.length} saved item{wishlist.items.length === 1 ? "" : "s"}
                      </span>
                    </span>
                    <ChevronDown
                      className={`ml-auto shrink-0 text-black/42 transition ${
                        isExpanded ? "rotate-180" : ""
                      }`}
                      size={17}
                    />
                  </button>
                  <button
                    aria-label={`Delete ${wishlist.name}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#f10606] disabled:opacity-50"
                    disabled={busyAction === `delete-list-${wishlist.id}`}
                    type="button"
                    onClick={() => void deleteWishlist(wishlist.id)}
                  >
                    {busyAction === `delete-list-${wishlist.id}` ? (
                      <LoaderCircle className="animate-spin" size={15} />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>

                {isExpanded ? (
                  <div className="mt-4 space-y-3 border-t border-black/[0.06] pt-3">
                    {wishlist.items.length ? (
                      wishlist.items.map((item) => (
                        <div className="rounded-xl bg-[#fafafa] p-3" key={item.id}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-black">
                                {item.productName}
                              </p>
                              <p className="mt-1 truncate text-[10px] font-bold text-black/42">
                                {item.productId}
                              </p>
                            </div>
                            <button
                              aria-label={`Remove ${item.productName}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#f10606]"
                              disabled={busyAction === `delete-item-${item.id}`}
                              type="button"
                              onClick={() => void deleteWishlistItem(wishlist.id, item.id)}
                            >
                              {busyAction === `delete-item-${item.id}` ? (
                                <LoaderCircle className="animate-spin" size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
                            <input
                              className="h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                              min="0.01"
                              step="any"
                              type="number"
                              value={String(item.quantity)}
                              onChange={(event) =>
                                updateLocalItem(
                                  wishlist.id,
                                  item.id,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                            />
                            <input
                              className="h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                              value={item.unit}
                              onChange={(event) =>
                                updateLocalItem(wishlist.id, item.id, "unit", event.target.value)
                              }
                            />
                            <button
                              className="h-10 rounded-xl bg-black px-3 text-[10px] font-black text-white disabled:opacity-50"
                              disabled={busyAction === `patch-${item.id}`}
                              type="button"
                              onClick={() => void patchWishlistItem(wishlist.id, item)}
                            >
                              {busyAction === `patch-${item.id}` ? "Saving" : "Save"}
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl bg-[#fafafa] px-3 py-3 text-xs font-bold text-black/45">
                        No items in this wishlist yet.
                      </p>
                    )}

                    <form
                      className="rounded-xl border border-dashed border-black/15 p-3"
                      onSubmit={(event) => void addWishlistItem(wishlist.id, event)}
                    >
                      <p className="text-[10px] font-black uppercase text-black/42">
                        Add item
                      </p>
                      <div className="relative mt-2">
                        <input
                          aria-autocomplete="list"
                          className="h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                          placeholder="Search product, e.g. rice"
                          value={draft.productSearch}
                          onChange={(event) =>
                            updateProductSearch(wishlist.id, event.target.value)
                          }
                        />
                        {draft.productId ? (
                          <p className="mt-1 text-[10px] font-bold text-emerald-700">
                            Selected product ID: {draft.productId}
                          </p>
                        ) : null}
                        {productSearchLoading[wishlist.id] ? (
                          <p className="mt-1 text-[10px] font-bold text-black/45">
                            Searching products...
                          </p>
                        ) : null}
                        {productSearchErrors[wishlist.id] ? (
                          <p className="mt-1 text-[10px] font-bold text-red-700">
                            {productSearchErrors[wishlist.id]}
                          </p>
                        ) : null}
                        {productOptions[wishlist.id]?.length ? (
                          <div className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-20 overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_16px_35px_rgba(0,0,0,0.12)]">
                            {productOptions[wishlist.id].map((product) => (
                              <button
                                className="block w-full px-3 py-2.5 text-left transition hover:bg-[#fff0f0]"
                                key={product.id}
                                type="button"
                                value={product.id}
                                onClick={() => selectProduct(wishlist.id, product)}
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
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <input
                          className="h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                          min="0.01"
                          placeholder="Quantity"
                          step="any"
                          type="number"
                          value={draft.quantity}
                          onChange={(event) =>
                            updateDraft(wishlist.id, "quantity", event.target.value)
                          }
                        />
                        <select
                          className="h-10 min-w-0 rounded-xl border border-black/10 bg-white px-3 text-xs outline-none focus:border-[#f10606]/45"
                          disabled={!selectedProductUnits[wishlist.id]?.length}
                          value={draft.unit}
                          onChange={(event) => updateDraft(wishlist.id, "unit", event.target.value)}
                        >
                          <option value="">
                            {selectedProductUnits[wishlist.id]?.length
                              ? "Select unit"
                              : "Select product first"}
                          </option>
                          {(selectedProductUnits[wishlist.id] ?? []).map((unit) => (
                            <option key={unit} value={unit}>
                              {unit}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        className="mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-xs font-black text-white disabled:opacity-60"
                        disabled={busyAction === `add-${wishlist.id}`}
                        type="submit"
                      >
                        {busyAction === `add-${wishlist.id}` ? (
                          <LoaderCircle className="animate-spin" size={15} />
                        ) : (
                          <Plus size={15} />
                        )}
                        Add item
                      </button>
                    </form>

                    {quote ? (
                      <section
                        className={`rounded-xl border p-3 ${
                          quote.canProceed
                            ? "border-emerald-200 bg-emerald-50"
                            : "border-amber-200 bg-amber-50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {quote.canProceed ? (
                            <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={17} />
                          ) : (
                            <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={17} />
                          )}
                          <div className="min-w-0">
                            <p className="text-xs font-black text-black">{quote.message}</p>
                            <p className="mt-1 text-[10px] font-bold text-black/55">
                              {quote.summary.matched} of {quote.summary.received} items matched
                              {quote.summary.requiresAttention
                                ? `, ${quote.summary.requiresAttention} require attention`
                                : ""}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          {quote.items.map((item, index) => {
                            const isMatched = item.status === "matched";

                            return (
                              <article
                                className={`rounded-lg border bg-white p-3 ${
                                  isMatched ? "border-emerald-100" : "border-red-100"
                                }`}
                                key={`${item.original}-${index}`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-black text-black">
                                      {item.interpretation.product || item.original}
                                    </p>
                                    <p className="mt-1 text-[10px] font-bold text-black/45">
                                      {item.interpretation.quantity ?? "-"} {item.interpretation.unit ?? ""}
                                    </p>
                                  </div>
                                  <span
                                    className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${
                                      isMatched
                                        ? "bg-emerald-50 text-emerald-700"
                                        : "bg-red-50 text-[#f10606]"
                                    }`}
                                  >
                                    {item.status.replace(/[_-]+/g, " ")}
                                  </span>
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                  <p className="text-[10px] font-bold text-black/45">
                                    {item.message || "No extra note"}
                                  </p>
                                  <p className="shrink-0 text-xs font-black text-black">
                                    {item.totalPrice !== undefined
                                      ? formatCurrency(item.totalPrice)
                                      : "-"}
                                  </p>
                                </div>
                                {item.availableUnits.length ? (
                                  <p className="mt-1 text-[9px] font-bold text-black/38">
                                    Available units: {item.availableUnits.join(", ")}
                                  </p>
                                ) : null}
                              </article>
                            );
                          })}
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-white/70 p-3">
                          <div>
                            <p className="text-[9px] font-black uppercase text-black/42">
                              Matched
                            </p>
                            <p className="text-sm font-black text-black">
                              {quote.quoteItems.length}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-black uppercase text-black/42">
                              Subtotal
                            </p>
                            <p className="text-sm font-black text-black">
                              {formatCurrency(subtotal)}
                            </p>
                          </div>
                          {quote.serviceFee !== undefined ? (
                            <div>
                              <p className="text-[9px] font-black uppercase text-black/42">
                                Service fee
                              </p>
                              <p className="text-sm font-black text-black">
                                {formatCurrency(quote.serviceFee)}
                              </p>
                            </div>
                          ) : null}
                          {quote.deliveryFee !== undefined ? (
                            <div className="text-right">
                              <p className="text-[9px] font-black uppercase text-black/42">
                                Delivery
                              </p>
                              <p className="text-sm font-black text-black">
                                {formatCurrency(quote.deliveryFee)}
                              </p>
                            </div>
                          ) : null}
                          {quote.total !== undefined ? (
                            <div className="col-span-2 border-t border-black/10 pt-2">
                              <p className="text-[9px] font-black uppercase text-black/42">
                                Total
                              </p>
                              <p className="text-base font-black text-[#f10606]">
                                {formatCurrency(quote.total)}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {orderResult ? (
                          <section className="mt-3 rounded-xl border border-emerald-200 bg-white p-3">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={17} />
                              <div>
                                <p className="text-xs font-black text-black">
                                  {orderResult.message}
                                </p>
                                <p className="mt-1 text-[10px] font-bold text-black/45">
                                  Order #{orderResult.order.id}
                                </p>
                              </div>
                            </div>

                            <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-[#fafafa] p-3">
                              <div>
                                <p className="text-[9px] font-black uppercase text-black/42">
                                  Status
                                </p>
                                <p className="text-xs font-black capitalize text-black">
                                  {orderResult.order.status}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-[9px] font-black uppercase text-black/42">
                                  Total
                                </p>
                                <p className="text-xs font-black text-[#f10606]">
                                  {orderResult.order.total !== undefined
                                    ? formatCurrency(orderResult.order.total)
                                    : "Pending"}
                                </p>
                              </div>
                            </div>

                            {orderResult.payment?.charge?.accountNumber ? (
                              <section className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                                <div className="flex items-start gap-2">
                                  <Building2 className="mt-0.5 shrink-0 text-emerald-700" size={17} />
                                  <div>
                                    <p className="text-xs font-black text-black">
                                      Bank transfer details
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium leading-4 text-black/55">
                                      {orderResult.payment.charge.displayText ||
                                        "Make a bank transfer to the account below."}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-3 grid gap-2">
                                  <PaymentField
                                    label="Bank"
                                    value={orderResult.payment.charge.bankName}
                                  />
                                  <PaymentField
                                    label="Account name"
                                    value={orderResult.payment.charge.accountName}
                                  />
                                  <div className="rounded-lg bg-white p-3">
                                    <p className="text-[9px] font-black uppercase text-black/42">
                                      Account number
                                    </p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <p className="text-sm font-black text-black">
                                        {orderResult.payment.charge.accountNumber}
                                      </p>
                                      <button
                                        className="flex h-8 items-center gap-1 rounded-lg border border-black/10 px-2 text-[10px] font-black text-black/60"
                                        type="button"
                                        onClick={() =>
                                          void copyPaymentValue(
                                            `${wishlist.id}-account`,
                                            orderResult.payment?.charge?.accountNumber ?? "",
                                          )
                                        }
                                      >
                                        <Copy size={12} />
                                        {copiedValues[`${wishlist.id}-account`] ? "Copied" : "Copy"}
                                      </button>
                                    </div>
                                  </div>
                                  <div className="rounded-lg bg-white p-3">
                                    <p className="text-[9px] font-black uppercase text-black/42">
                                      Amount
                                    </p>
                                    <div className="mt-1 flex items-center justify-between gap-2">
                                      <p className="text-sm font-black text-black">
                                        {orderResult.order.total !== undefined
                                          ? formatCurrency(orderResult.order.total)
                                          : orderResult.payment.charge.amount !== undefined
                                            ? formatCurrency(orderResult.payment.charge.amount / 100)
                                            : "Not provided"}
                                      </p>
                                      {orderResult.order.total !== undefined ||
                                      orderResult.payment.charge.amount !== undefined ? (
                                        <button
                                          className="flex h-8 items-center gap-1 rounded-lg border border-black/10 px-2 text-[10px] font-black text-black/60"
                                          type="button"
                                          onClick={() =>
                                            void copyPaymentValue(
                                              `${wishlist.id}-amount`,
                                              String(
                                                orderResult.order.total ??
                                                  (orderResult.payment?.charge?.amount ?? 0) / 100,
                                              ),
                                            )
                                          }
                                        >
                                          <Copy size={12} />
                                          {copiedValues[`${wishlist.id}-amount`] ? "Copied" : "Copy"}
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                </div>

                                {orderResult.payment.charge.accountExpiresAt ? (
                                  <p className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-amber-800">
                                    <Clock3 size={13} />
                                    Account expires{" "}
                                    {formatDateTime(orderResult.payment.charge.accountExpiresAt)}
                                  </p>
                                ) : null}

                                {paymentVerification ? (
                                  <div
                                    className={`mt-3 rounded-lg border p-3 ${
                                      paymentVerification.payment.status === "successful"
                                        ? "border-emerald-200 bg-white"
                                        : "border-amber-200 bg-amber-50"
                                    }`}
                                  >
                                    <p className="text-xs font-black text-black">
                                      {paymentVerification.payment.status === "successful"
                                        ? "Payment confirmed"
                                        : "Payment is still pending"}
                                    </p>
                                    <p className="mt-1 text-[10px] font-medium leading-4 text-black/55">
                                      {paymentVerification.message}
                                    </p>
                                    {paymentVerification.payment.paidAt ? (
                                      <p className="mt-2 text-[10px] font-bold text-emerald-700">
                                        Paid {formatDateTime(paymentVerification.payment.paidAt)}
                                      </p>
                                    ) : null}
                                  </div>
                                ) : null}

                                {paymentVerificationError ? (
                                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] font-bold text-red-700">
                                    {paymentVerificationError}
                                  </p>
                                ) : null}

                                <button
                                  className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-xs font-black text-white disabled:opacity-50"
                                  disabled={
                                    busyAction === `verify-${wishlist.id}` ||
                                    paymentVerification?.payment.status === "successful"
                                  }
                                  type="button"
                                  onClick={() => void verifyWishlistPayment(wishlist.id)}
                                >
                                  {busyAction === `verify-${wishlist.id}` ? (
                                    <LoaderCircle className="animate-spin" size={15} />
                                  ) : (
                                    <CheckCircle2 size={15} />
                                  )}
                                  {busyAction === `verify-${wishlist.id}`
                                    ? "Confirming payment..."
                                    : paymentVerification?.payment.status === "successful"
                                      ? "Payment Confirmed"
                                      : paymentVerification
                                        ? "Check Payment Again"
                                        : "Confirm Payment"}
                                </button>
                              </section>
                            ) : orderResult.payment ? (
                              <section
                                className={`mt-3 rounded-xl border p-3 ${
                                  orderResult.payment.status === "failed"
                                    ? "border-red-200 bg-red-50"
                                    : "border-amber-200 bg-amber-50"
                                }`}
                              >
                                <p className="text-xs font-black capitalize text-black">
                                  Payment {orderResult.payment.status}
                                </p>
                                <p className="mt-1 text-[10px] font-medium leading-4 text-black/55">
                                  {orderResult.payment.message ||
                                    "Payment details are not available yet."}
                                </p>
                                {orderResult.payment.retryAfterSeconds !== undefined ? (
                                  <p className="mt-2 text-[10px] font-bold text-black/50">
                                    Retry may be available after{" "}
                                    {orderResult.payment.retryAfterSeconds} seconds.
                                  </p>
                                ) : null}
                              </section>
                            ) : null}
                          </section>
                        ) : null}

                        <button
                          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-xs font-black text-white disabled:opacity-50"
                          disabled={
                            !quote.canProceed ||
                            busyAction === `order-${wishlist.id}` ||
                            !quote.quoteItems.length
                          }
                          type="button"
                          onClick={() => void orderWishlistQuote(wishlist.id)}
                        >
                          {busyAction === `order-${wishlist.id}` ? (
                            <LoaderCircle className="animate-spin" size={15} />
                          ) : (
                            <Send size={15} />
                          )}
                          {busyAction === `order-${wishlist.id}` ? "Submitting order..." : "Order quoted items"}
                        </button>
                      </section>
                    ) : null}

                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#fff0f0] text-xs font-black text-[#f10606]"
                        href="/dashboard/price-alerts"
                      >
                        <Bell size={15} />
                        Set alert
                      </Link>
                      <button
                        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-[#f10606] text-xs font-black text-white disabled:opacity-60"
                        disabled={busyAction === `quote-${wishlist.id}` || !wishlist.items.length}
                        type="button"
                        onClick={() => void quoteWishlist(wishlist.id)}
                      >
                        {busyAction === `quote-${wishlist.id}` ? (
                          <LoaderCircle className="animate-spin" size={15} />
                        ) : (
                          <ShoppingCart size={15} />
                        )}
                        {busyAction === `quote-${wishlist.id}` ? "Quoting..." : "Get quote"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-5 text-center">
          <Heart className="mx-auto text-[#f10606]" size={24} />
          <p className="mt-3 text-sm font-black text-black">No wishlists yet</p>
          <p className="mt-1 text-xs font-medium text-black/48">
            Create a wishlist to save products you want to order later.
          </p>
        </section>
      )}

      <Link
        className="flex items-center justify-between rounded-2xl border border-dashed border-black/15 bg-white p-4 text-xs font-black text-black/60"
        href="/dashboard/market-prices"
      >
        Browse products to save
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}

function PaymentField({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="rounded-lg bg-white p-3">
      <p className="text-[9px] font-black uppercase text-black/42">{label}</p>
      <p className="mt-1 text-xs font-black text-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

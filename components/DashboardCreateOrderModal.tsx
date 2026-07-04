"use client";

import Script from "next/script";
import { useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MapPin,
  Plus,
  Send,
  ShoppingCart,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authClient";
import { getApiErrorMessage } from "@/lib/apiError";
import { useAuthSession } from "@/lib/useAuthSession";
import {
  API_BASE_URL,
  CREATE_ORDER_URL,
  ORDERS_QUOTE_URL,
  VERIFY_PAYMENT_URL,
} from "@/Serverurls";

type QuoteItemStatus = "matched" | "needs_confirmation" | "unsupported_unit" | "invalid_quantity" | string;

type QuoteChoice = {
  buyPriceId: string;
  productOfferingId?: string;
  label: string;
  unit: string;
  unitPrice: number;
};

type QuoteResponseItem = {
  original: string;
  status: QuoteItemStatus;
  interpretation: {
    product?: string;
    quantity?: number;
    unit?: string;
    amount?: number;
  };
  availableUnits: string[];
  choices: QuoteChoice[];
  productId?: string;
  buyPriceId?: string;
  unitPrice?: number;
  totalPrice?: number;
  message: string;
};

type QuoteLineItem =
  | { buyPriceId: string; quantity: number }
  | { productId: string; amount: number };

type OrderQuote = {
  message: string;
  canProceed: boolean;
  items: QuoteResponseItem[];
  quoteItems: QuoteLineItem[];
  summary: {
    received: number;
    matched: number;
    requiresAttention: number;
  };
};

function isMatchedStatus(status: QuoteItemStatus) {
  return status === "matched" || status.startsWith("matched_");
}

type UnknownRecord = Record<string, unknown>;

type AlternateDeliveryAddress = {
  label: string;
  recipientName: string;
  phoneNumber: string;
  formattedAddress: string;
  addressLine1: string;
  addressLine2: string;
  streetNumber: string;
  route: string;
  neighborhood: string;
  sublocality: string;
  locality: string;
  localGovernmentArea: string;
  administrativeArea: string;
  state: string;
  country: string;
  countryCode: string;
  postalCode: string;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
  googleAddressData: {
    source: "google-places";
    placeId: string;
  };
};

type CreatedOrder = {
  id: string;
  status: string;
  paymentStatus: string;
  subtotal?: number;
  discountAmount?: number;
  serviceFee?: number;
  deliveryFee?: number;
  total?: number;
  deliveryRecipientName?: string;
  deliveryPhoneNumber?: string;
  deliveryAddress?: string;
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
    id?: string;
    orderId?: string;
    amount?: number;
    currency?: string;
    provider?: string;
    providerReference: string;
    status: string;
    paidAt?: string;
  };
};

const quoteEndpoint = `${API_BASE_URL}${ORDERS_QUOTE_URL}`;
const resolveQuoteItemEndpoint = `${quoteEndpoint}/resolve-item`;
const createOrderEndpoint = `${API_BASE_URL}${CREATE_ORDER_URL}`;
const verifyPaymentEndpoint = `${API_BASE_URL}${VERIFY_PAYMENT_URL}`;
const exampleOrder = "1/2 basket garri, 2 derica rice";
const SERVICE_FEE_RATE = 0.04;
const MINIMUM_SERVICE_FEE = 1500;
const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function parseQuoteItem(value: unknown): QuoteResponseItem | null {
  if (!isRecord(value) || typeof value.original !== "string" || typeof value.status !== "string") {
    return null;
  }

  const interpretation = isRecord(value.interpretation) ? value.interpretation : {};
  const quantity = Number(interpretation.quantity);
  const amount = Number(interpretation.amount ?? value.amount);
  const unitPrice = Number(value.unitPrice);
  const totalPrice = Number(value.totalPrice);

  const choices = Array.isArray(value.choices)
    ? value.choices.flatMap((choice): QuoteChoice[] => {
        if (!isRecord(choice) || typeof choice.buyPriceId !== "string") {
          return [];
        }

        const choiceUnitPrice = Number(choice.unitPrice);

        return [{
          buyPriceId: choice.buyPriceId,
          productOfferingId:
            typeof choice.productOfferingId === "string" ? choice.productOfferingId : undefined,
          label: readString(choice, ["label"]) || readString(choice, ["unit"]) || "Option",
          unit: readString(choice, ["unit"]),
          unitPrice: Number.isFinite(choiceUnitPrice) ? choiceUnitPrice : 0,
        }];
      })
    : [];

  return {
    original: value.original,
    status: value.status,
    interpretation: {
      product: readString(interpretation, ["product"]) || undefined,
      quantity: Number.isFinite(quantity) ? quantity : undefined,
      unit: readString(interpretation, ["unit"]) || undefined,
      amount: Number.isFinite(amount) ? amount : undefined,
    },
    availableUnits: Array.isArray(value.availableUnits)
      ? value.availableUnits.filter((unit): unit is string => typeof unit === "string")
      : [],
    choices,
    productId: typeof value.productId === "string" ? value.productId : undefined,
    buyPriceId: typeof value.buyPriceId === "string" ? value.buyPriceId : undefined,
    unitPrice: Number.isFinite(unitPrice) ? unitPrice : undefined,
    totalPrice: Number.isFinite(totalPrice) ? totalPrice : undefined,
    message: typeof value.message === "string" ? value.message : "",
  };
}

function parseQuoteResponse(value: unknown): OrderQuote | null {
  if (!isRecord(value) || !Array.isArray(value.items) || !Array.isArray(value.quoteItems)) {
    return null;
  }

  const items = value.items.flatMap((item): QuoteResponseItem[] => {
    const parsed = parseQuoteItem(item);
    return parsed ? [parsed] : [];
  });

  const quoteItems = value.quoteItems.flatMap((item): OrderQuote["quoteItems"] => {
    if (!isRecord(item)) {
      return [];
    }

    if (typeof item.buyPriceId === "string") {
      const quantity = Number(item.quantity);
      return Number.isFinite(quantity) ? [{ buyPriceId: item.buyPriceId, quantity }] : [];
    }

    if (typeof item.productId === "string") {
      const amount = Number(item.amount);
      return Number.isFinite(amount) ? [{ productId: item.productId, amount }] : [];
    }

    return [];
  });
  const summary = isRecord(value.summary) ? value.summary : {};

  return {
    message: typeof value.message === "string" ? value.message : "",
    canProceed: value.canProceed === true,
    items,
    quoteItems,
    summary: {
      received: Number(summary.received) || items.length,
      matched: Number(summary.matched) || items.filter((item) => isMatchedStatus(item.status)).length,
      requiresAttention:
        Number(summary.requiresAttention) ||
        items.filter((item) => !isMatchedStatus(item.status)).length,
    },
  };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeNigerianPhoneNumber(value: string) {
  let digits = value.replace(/\D/g, "");

  if (digits.startsWith("234")) {
    digits = digits.slice(3);
  }

  digits = digits.replace(/^0+/, "").slice(0, 10);
  return `+234${digits}`;
}

function readNumber(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = Number(record[key]);

    if (Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function parseCreateOrderResponse(value: unknown): CreateOrderResult | null {
  if (!isRecord(value) || !isRecord(value.order)) {
    return null;
  }

  const orderValue = value.order;
  const orderId = readString(orderValue, ["id"]);

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
    message: readString(value, ["message"]) || "Order created successfully.",
    order: {
      id: orderId,
      status: readString(orderValue, ["status"]) || "pending",
      paymentStatus:
        readString(orderValue, ["paymentStatus"]) || "pending",
      subtotal: readNumber(orderValue, ["subtotal"]),
      discountAmount: readNumber(orderValue, ["discountAmount"]),
      serviceFee: readNumber(orderValue, ["serviceFee"]),
      deliveryFee: readNumber(orderValue, ["deliveryFee"]),
      total: readNumber(orderValue, ["total"]),
      deliveryRecipientName:
        readString(orderValue, ["deliveryRecipientName"]) || undefined,
      deliveryPhoneNumber:
        readString(orderValue, ["deliveryPhoneNumber"]) || undefined,
      deliveryAddress:
        readString(orderValue, ["deliveryAddress"]) || undefined,
    },
    payment: paymentValue
      ? {
          reference: readString(paymentValue, ["reference"]),
          status: readString(paymentValue, ["status"]) || "pending",
          paymentAction:
            readString(paymentValue, ["paymentAction"]) || undefined,
          retryAfterSeconds: readNumber(paymentValue, ["retryAfterSeconds"]),
          message: readString(paymentValue, ["message"]) || undefined,
          charge: chargeData
            ? {
                status: readString(chargeData, ["status"]) || undefined,
                reference:
                  readString(chargeData, ["reference"]) || undefined,
                amount: readNumber(chargeData, ["amount"]),
                currency:
                  readString(chargeData, ["currency"]) || undefined,
                displayText:
                  readString(chargeData, ["display_text", "displayText"]) ||
                  undefined,
                accountName:
                  readString(chargeData, ["account_name", "accountName"]) ||
                  undefined,
                accountNumber:
                  readString(chargeData, ["account_number", "accountNumber"]) ||
                  undefined,
                bankName:
                  (bankValue ? readString(bankValue, ["name"]) : "") ||
                  undefined,
                accountExpiresAt:
                  readString(chargeData, [
                    "account_expires_at",
                    "accountExpiresAt",
                  ]) || undefined,
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
  const providerReference = readString(payment, ["providerReference"]);
  const status = readString(payment, ["status"]);

  if (!providerReference || !status) {
    return null;
  }

  return {
    message:
      readString(value, ["message"]) ||
      "Payment verification record found.",
    payment: {
      id: readString(payment, ["id"]) || undefined,
      orderId: readString(payment, ["orderId"]) || undefined,
      amount: readNumber(payment, ["amount"]),
      currency: readString(payment, ["currency"]) || undefined,
      provider: readString(payment, ["provider"]) || undefined,
      providerReference,
      status,
      paidAt: readString(payment, ["paidAt"]) || undefined,
    },
  };
}

function formatDateTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-NG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);
}

function getGoogleAddressPart(
  components: GoogleAddressComponent[],
  type: string,
  shortName = false,
) {
  const component = components.find((item) => item.types.includes(type));
  return component ? (shortName ? component.shortText : component.longText) : "";
}

export function DashboardCreateOrderModal({
  onOrderCreated,
  triggerVariant = "default",
}: {
  onOrderCreated?: () => void | Promise<void>;
  triggerVariant?: "default" | "mobile-hero" | "mobile-primary";
}) {
  const authSession = useAuthSession();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"write" | "review" | "result">("write");
  const [orderText, setOrderText] = useState(exampleOrder);
  const [couponCode, setCouponCode] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [isQuoting, setIsQuoting] = useState(false);
  const [removedItemIndexes, setRemovedItemIndexes] = useState<Set<number>>(new Set());
  const [resolvingIndex, setResolvingIndex] = useState<number | null>(null);
  const [resolveErrors, setResolveErrors] = useState<Record<number, string>>({});
  const [googlePlacesLibrary, setGooglePlacesLibrary] =
    useState<GooglePlacesLibrary | null>(null);
  const [googlePlacesStatus, setGooglePlacesStatus] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [addressSearchValue, setAddressSearchValue] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<
    GooglePlacePrediction[]
  >([]);
  const [alternateDeliveryAddress, setAlternateDeliveryAddress] =
    useState<AlternateDeliveryAddress | null>(null);
  const [addressSearchError, setAddressSearchError] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [submitOrderError, setSubmitOrderError] = useState("");
  const [createOrderResult, setCreateOrderResult] =
    useState<CreateOrderResult | null>(null);
  const [copiedAccountNumber, setCopiedAccountNumber] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [paymentVerification, setPaymentVerification] =
    useState<PaymentVerification | null>(null);
  const [paymentVerificationError, setPaymentVerificationError] = useState("");
  const googleSessionTokenRef = useRef<GoogleAutocompleteSessionToken | null>(
    null,
  );
  const googleRequestIdRef = useRef(0);

  function isItemResolved(item: QuoteResponseItem) {
    return isMatchedStatus(item.status);
  }

  function buildOriginalWithUnit(item: QuoteResponseItem, unit: string) {
    const quantity = item.interpretation.quantity;
    const product = item.interpretation.product;

    if (quantity !== undefined && product) {
      return `${quantity} ${unit} ${product}`;
    }

    if (item.interpretation.unit) {
      return item.original.replace(item.interpretation.unit, unit);
    }

    return `${item.original} (${unit})`;
  }

  async function resolveItem(
    index: number,
    payload: { buyPriceId?: string; quantity?: number; original: string },
  ) {
    if (!quote) return;

    setResolvingIndex(index);
    setResolveErrors((current) => ({ ...current, [index]: "" }));

    try {
      const response = await authenticatedFetch(resolveQuoteItemEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(response, `Unable to resolve this item (${response.status}).`),
        );
      }

      const resolved = parseQuoteItem((await response.json()) as unknown);

      if (!resolved) {
        throw new Error("The resolved item response was not in the expected format.");
      }

      setQuote((current) => {
        if (!current) return current;

        const nextItems = current.items.map((existing, itemIndex) =>
          itemIndex === index ? resolved : existing,
        );
        const nextQuoteItems = resolved.buyPriceId
          ? [
              ...current.quoteItems.filter(
                (quoteItem) => !("buyPriceId" in quoteItem && quoteItem.buyPriceId === resolved.buyPriceId),
              ),
              { buyPriceId: resolved.buyPriceId, quantity: resolved.interpretation.quantity ?? payload.quantity ?? 1 },
            ]
          : current.quoteItems;

        return { ...current, items: nextItems, quoteItems: nextQuoteItems };
      });
    } catch (error) {
      setResolveErrors((current) => ({
        ...current,
        [index]: error instanceof Error ? error.message : "Unable to resolve this item.",
      }));
    } finally {
      setResolvingIndex(null);
    }
  }

  const activeItems = useMemo(
    () =>
      (quote?.items ?? [])
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => !removedItemIndexes.has(index)),
    [quote, removedItemIndexes],
  );

  const effectiveCanProceed = useMemo(
    () => activeItems.length > 0 && activeItems.every(({ item }) => isItemResolved(item)),
    [activeItems],
  );

  const effectiveQuoteItems = useMemo(() => {
    if (!quote) return [];

    const removedBuyPriceIds = new Set(
      quote.items.flatMap((item, index) =>
        removedItemIndexes.has(index) && item.buyPriceId ? [item.buyPriceId] : [],
      ),
    );
    const removedProductIds = new Set(
      quote.items.flatMap((item, index) =>
        removedItemIndexes.has(index) && item.productId ? [item.productId] : [],
      ),
    );

    return quote.quoteItems.filter((quoteItem) =>
      "buyPriceId" in quoteItem
        ? !removedBuyPriceIds.has(quoteItem.buyPriceId)
        : !removedProductIds.has(quoteItem.productId),
    );
  }, [quote, removedItemIndexes]);

  const subtotal = useMemo(
    () => activeItems.reduce((sum, { item }) => sum + (item.totalPrice ?? 0), 0),
    [activeItems],
  );
  const serviceFee =
    subtotal > 0 ? Math.max(MINIMUM_SERVICE_FEE, subtotal * SERVICE_FEE_RATE) : 0;
  const estimatedTotal = subtotal + serviceFee;
  const isMobilePresentation = triggerVariant !== "default";

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
    setStep("write");
    setQuote(null);
    setQuoteError("");
    setOrderNote("");
    setRemovedItemIndexes(new Set());
    setResolvingIndex(null);
    setResolveErrors({});
    setAddressSearchValue("");
    setAddressSuggestions([]);
    setAlternateDeliveryAddress(null);
    setAddressSearchError("");
    setSubmitOrderError("");
    setCreateOrderResult(null);
    setCopiedAccountNumber(false);
    setCopiedAmount(false);
    setPaymentVerification(null);
    setPaymentVerificationError("");
  }

  async function initializeGooglePlaces() {
    if (!window.google?.maps) {
      setGooglePlacesStatus("error");
      return;
    }

    try {
      const placesLibrary = await window.google.maps.importLibrary("places");
      setGooglePlacesLibrary(placesLibrary);
      googleSessionTokenRef.current =
        new placesLibrary.AutocompleteSessionToken();
      setGooglePlacesStatus("ready");
    } catch {
      setGooglePlacesStatus("error");
      setAddressSearchError("Google address search could not be loaded.");
    }
  }

  async function handleAddressSearch(value: string) {
    setAddressSearchValue(value);
    setAlternateDeliveryAddress(null);
    setAddressSearchError("");
    const requestId = ++googleRequestIdRef.current;

    if (!value.trim()) {
      setAddressSuggestions([]);
      return;
    }

    if (!googlePlacesLibrary || value.trim().length < 3) {
      setAddressSuggestions([]);
      return;
    }

    if (!googleSessionTokenRef.current) {
      googleSessionTokenRef.current =
        new googlePlacesLibrary.AutocompleteSessionToken();
    }

    try {
      const { suggestions } =
        await googlePlacesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: value.trim(),
          includedRegionCodes: ["ng"],
          language: "en",
          region: "ng",
          sessionToken: googleSessionTokenRef.current,
        });

      if (requestId === googleRequestIdRef.current) {
        setAddressSuggestions(
          suggestions.flatMap((suggestion) =>
            suggestion.placePrediction ? [suggestion.placePrediction] : [],
          ),
        );
      }
    } catch {
      if (requestId === googleRequestIdRef.current) {
        setAddressSuggestions([]);
        setAddressSearchError("Google could not search for that address.");
      }
    }
  }

  async function selectAlternateAddress(prediction: GooglePlacePrediction) {
    setAddressSearchError("");

    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ["addressComponents", "formattedAddress", "id", "location"],
      });

      const components = place.addressComponents ?? [];
      const streetNumber = getGoogleAddressPart(components, "street_number");
      const route = getGoogleAddressPart(components, "route");
      const administrativeArea = getGoogleAddressPart(
        components,
        "administrative_area_level_1",
      );
      const googlePlaceId = place.id ?? "";
      const latitude = place.location?.lat();
      const longitude = place.location?.lng();
      const formattedAddress =
        place.formattedAddress ?? prediction.text.toString();

      if (
        !googlePlaceId ||
        latitude === undefined ||
        longitude === undefined ||
        !formattedAddress
      ) {
        throw new Error("The selected address is missing required Google details.");
      }

      setAlternateDeliveryAddress({
        label: "Order delivery",
        recipientName: authSession?.user.fullName ?? "",
        phoneNumber: normalizeNigerianPhoneNumber(
          authSession?.user.phoneNumber ?? "",
        ),
        formattedAddress,
        addressLine1: [streetNumber, route].filter(Boolean).join(" "),
        addressLine2: "",
        streetNumber,
        route,
        neighborhood: getGoogleAddressPart(components, "neighborhood"),
        sublocality:
          getGoogleAddressPart(components, "sublocality_level_1") ||
          getGoogleAddressPart(components, "sublocality"),
        locality:
          getGoogleAddressPart(components, "locality") ||
          getGoogleAddressPart(components, "postal_town"),
        localGovernmentArea: getGoogleAddressPart(
          components,
          "administrative_area_level_2",
        ),
        administrativeArea,
        state: administrativeArea,
        country: getGoogleAddressPart(components, "country"),
        countryCode: getGoogleAddressPart(components, "country", true),
        postalCode: getGoogleAddressPart(components, "postal_code"),
        googlePlaceId,
        latitude,
        longitude,
        googleAddressData: {
          source: "google-places",
          placeId: googlePlaceId,
        },
      });
      setAddressSearchValue(formattedAddress);
      setAddressSuggestions([]);
      googleSessionTokenRef.current = googlePlacesLibrary
        ? new googlePlacesLibrary.AutocompleteSessionToken()
        : null;
    } catch (error) {
      setAlternateDeliveryAddress(null);
      setAddressSearchError(
        error instanceof Error
          ? error.message
          : "Google could not load the selected address.",
      );
    }
  }

  async function requestQuote() {
    if (addressSearchValue.trim() && !alternateDeliveryAddress) {
      setQuoteError(
        "Select an address from the Google suggestions, or leave the field blank to use your default address.",
      );
      return;
    }

    setIsQuoting(true);
    setQuoteError("");

    try {
      const response = await authenticatedFetch(quoteEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderText: orderText.trim(),
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(alternateDeliveryAddress
            ? { deliveryAddress: alternateDeliveryAddress }
            : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Unable to quote this order (${response.status}).`,
          ),
        );
      }

      const nextQuote = parseQuoteResponse((await response.json()) as unknown);

      if (!nextQuote) {
        throw new Error("The quote response was not in the expected format.");
      }

      setQuote(nextQuote);
      setRemovedItemIndexes(new Set());
      setResolvingIndex(null);
      setResolveErrors({});
      setStep("review");
    } catch (error) {
      setQuoteError(error instanceof Error ? error.message : "Unable to quote this order.");
    } finally {
      setIsQuoting(false);
    }
  }

  async function submitOrder() {
    if (!quote || !effectiveCanProceed || !effectiveQuoteItems.length) {
      return;
    }

    if (
      alternateDeliveryAddress &&
      !/^\+234\d{10}$/.test(alternateDeliveryAddress.phoneNumber)
    ) {
      setSubmitOrderError(
        "Enter a valid Nigerian delivery phone number, for example 07060934005.",
      );
      return;
    }

    setIsSubmittingOrder(true);
    setSubmitOrderError("");

    try {
      const response = await authenticatedFetch(createOrderEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: effectiveQuoteItems,
          ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}),
          ...(alternateDeliveryAddress
            ? { deliveryAddress: alternateDeliveryAddress }
            : {}),
          ...(orderNote.trim() ? { note: orderNote.trim() } : {}),
        }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Unable to submit this order (${response.status}).`,
          ),
        );
      }

      const result = parseCreateOrderResponse(
        (await response.json()) as unknown,
      );

      if (!result) {
        throw new Error("The order response was not in the expected format.");
      }

      setCreateOrderResult(result);
      setStep("result");
      void onOrderCreated?.();
    } catch (error) {
      setSubmitOrderError(
        error instanceof Error ? error.message : "Unable to submit this order.",
      );
    } finally {
      setIsSubmittingOrder(false);
    }
  }

  async function copyAccountNumber(accountNumber: string) {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setCopiedAccountNumber(true);
    } catch {
      setCopiedAccountNumber(false);
    }
  }

  async function copyAmount(amount: number) {
    try {
      await navigator.clipboard.writeText(String(amount));
      setCopiedAmount(true);
    } catch {
      setCopiedAmount(false);
    }
  }

  async function verifyPayment() {
    if (!createOrderResult) {
      return;
    }

    const providerReference =
      createOrderResult.payment?.reference ||
      createOrderResult.payment?.charge?.reference ||
      `order_${createOrderResult.order.id}`;

    setIsVerifyingPayment(true);
    setPaymentVerificationError("");

    try {
      const response = await authenticatedFetch(verifyPaymentEndpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ providerReference }),
      });

      if (!response.ok) {
        throw new Error(
          await getApiErrorMessage(
            response,
            `Unable to verify this payment (${response.status}).`,
          ),
        );
      }

      const verification = parsePaymentVerification(
        (await response.json()) as unknown,
      );

      if (!verification) {
        throw new Error(
          "The payment verification response was not in the expected format.",
        );
      }

      setPaymentVerification(verification);
    } catch (error) {
      setPaymentVerificationError(
        error instanceof Error
          ? error.message
          : "Unable to verify this payment.",
      );
    } finally {
      setIsVerifyingPayment(false);
    }
  }

  return (
    <>
      {googleMapsApiKey ? (
        <Script
          id="google-maps-places"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places&v=weekly`}
          strategy="afterInteractive"
          onReady={() => void initializeGooglePlaces()}
          onError={() => {
            setGooglePlacesStatus("error");
            setAddressSearchError("Google address search could not be loaded.");
          }}
        />
      ) : null}

      <button
        className={
          triggerVariant === "mobile-hero"
            ? "flex h-10 w-max items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#f10606] shadow-[0_10px_24px_rgba(80,0,0,0.22)] transition active:scale-[0.98]"
            : triggerVariant === "mobile-primary"
              ? "flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_14px_28px_rgba(241,6,6,0.22)] active:scale-[0.99]"
            : "flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505]"
        }
        type="button"
        onClick={openModal}
      >
        <ShoppingCart size={17} />
        {triggerVariant === "mobile-hero" ? "Start Order" : "Create Order"}
      </button>

      {isOpen ? (
        <div
          className={`fixed inset-0 z-[80] flex justify-center overflow-y-auto bg-black/45 ${
            isMobilePresentation
              ? "items-stretch p-0 sm:items-center sm:px-4 sm:py-6"
              : "items-start px-4 py-6 sm:items-center"
          }`}
        >
          <section
            className={`flex w-full max-w-3xl flex-col overflow-hidden bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)] ${
              isMobilePresentation
                ? "min-h-dvh max-h-dvh rounded-none sm:min-h-0 sm:max-h-[92vh] sm:rounded-2xl"
                : "max-h-[92vh] rounded-2xl"
            }`}
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-black">Create Order</h2>
                  <span className="rounded-full bg-[#fff0f0] px-2 py-1 text-[10px] font-black text-[#f10606]">Smart List</span>
                </div>
                <p className="mt-1 text-sm font-medium text-black/58">Write your market list naturally. Ojaboy will structure and price it.</p>
              </div>
              <button className="flex h-10 w-10 items-center justify-center rounded-lg border border-black/10 text-black/60 transition hover:text-[#f10606]" type="button" aria-label="Close create order modal" onClick={closeModal}>
                <X size={19} />
              </button>
            </div>

            {step === "write" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mb-4 rounded-xl border border-[#ffd6d6] bg-[#fff7f7] p-4">
                  <div className="mb-2 flex items-center gap-2 text-sm font-black text-black">
                    <Sparkles size={17} className="text-[#f10606]" />
                    Example
                  </div>
                  <p className="text-sm font-medium leading-6 text-black/60">{exampleOrder}</p>
                </div>

                <label className="block">
                  <span className="text-xs font-black uppercase text-black/45">What should we buy?</span>
                  <textarea
                    className="mt-2 min-h-40 w-full resize-none rounded-xl border border-black/10 bg-white p-4 text-sm font-bold leading-7 text-black outline-none shadow-sm placeholder:text-black/35 focus:border-[#f10606]"
                    value={orderText}
                    onChange={(event) => setOrderText(event.target.value)}
                    placeholder={exampleOrder}
                  />
                </label>

                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase text-black/45">Coupon code (optional)</span>
                  <input
                    className="mt-2 h-11 w-full rounded-lg border border-black/10 px-4 text-sm font-bold uppercase text-black outline-none focus:border-[#f10606]"
                    value={couponCode}
                    onChange={(event) => setCouponCode(event.target.value)}
                    placeholder="WELCOME10"
                  />
                </label>

                <div className="relative mt-4">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-black/45">
                      Deliver to another address (optional)
                    </span>
                    <div className="relative mt-2">
                      <MapPin className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={17} />
                      <input
                        className="h-11 w-full rounded-lg border border-black/10 pl-11 pr-4 text-sm font-bold text-black outline-none focus:border-[#f10606] disabled:bg-black/[0.03]"
                        disabled={!googleMapsApiKey || googlePlacesStatus !== "ready"}
                        placeholder={
                          !googleMapsApiKey
                            ? "Google address search is not configured"
                            : googlePlacesStatus === "loading"
                              ? "Loading Google address search..."
                              : googlePlacesStatus === "error"
                                ? "Google address search is unavailable"
                                : "Leave blank to use your default address"
                        }
                        type="search"
                        value={addressSearchValue}
                        onChange={(event) =>
                          void handleAddressSearch(event.target.value)
                        }
                      />
                    </div>
                  </label>
                  <p className="mt-1 text-[11px] font-medium text-black/45">
                    Leave blank for your default address. For another address, select a Google suggestion.
                  </p>

                  {addressSuggestions.length ? (
                    <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-xl border border-black/10 bg-white p-1 shadow-xl">
                      {addressSuggestions.map((prediction, index) => (
                        <button
                          className="block w-full rounded-lg px-3 py-3 text-left text-sm font-bold text-black/75 transition hover:bg-[#fff0f0] hover:text-[#f10606]"
                          key={`${prediction.text.toString()}-${index}`}
                          type="button"
                          onClick={() => void selectAlternateAddress(prediction)}
                        >
                          {prediction.text.toString()}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {alternateDeliveryAddress ? (
                    <p className="mt-2 flex items-center gap-2 text-xs font-bold text-emerald-700">
                      <CheckCircle2 size={14} />
                      Alternate delivery address selected
                    </p>
                  ) : null}

                  {addressSearchError ? (
                    <p className="mt-2 text-xs font-bold text-red-700">
                      {addressSearchError}
                    </p>
                  ) : null}
                </div>

                {quoteError ? (
                  <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    {quoteError}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button className="h-11 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606]" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!orderText.trim() || isQuoting}
                    onClick={() => void requestQuote()}
                  >
                    {isQuoting ? <Loader2 className="animate-spin" size={17} /> : <Sparkles size={17} />}
                    {isQuoting ? "Making sense..." : "Make Sense of List"}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "review" && quote ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className={`mb-4 flex gap-3 rounded-xl border p-4 ${effectiveCanProceed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
                  {effectiveCanProceed ? (
                    <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={19} />
                  ) : (
                    <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19} />
                  )}
                  <div>
                    <p className="text-sm font-black text-black">
                      {activeItems.length === 0
                        ? "All items were removed. There is nothing left to submit."
                        : effectiveCanProceed
                          ? "All items are ready to order."
                          : quote.message}
                    </p>
                    <p className="mt-1 text-xs font-bold text-black/55">
                      {activeItems.filter(({ item }) => isItemResolved(item)).length} of {activeItems.length} items ready
                      {activeItems.some(({ item }) => !isItemResolved(item))
                        ? `, ${activeItems.filter(({ item }) => !isItemResolved(item)).length} require attention`
                        : ""}
                      {removedItemIndexes.size
                        ? ` — ${removedItemIndexes.size} removed`
                        : ""}
                    </p>
                  </div>
                </div>

                {alternateDeliveryAddress ? (
                  <div className="mb-4 flex gap-3 rounded-xl border border-black/10 bg-[#fafafa] p-4">
                    <MapPin className="mt-0.5 shrink-0 text-[#f10606]" size={18} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase text-black/42">
                        Delivery address
                      </p>
                      <p className="mt-1 text-sm font-bold leading-6 text-black/70">
                        {alternateDeliveryAddress.formattedAddress}
                      </p>
                      <label className="mt-4 block">
                        <span className="text-xs font-black uppercase text-black/42">
                          Delivery phone number
                        </span>
                        <input
                          autoComplete="tel"
                          className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-sm font-bold text-black outline-none focus:border-[#f10606]"
                          inputMode="tel"
                          placeholder="+2348012345678"
                          type="tel"
                          value={alternateDeliveryAddress.phoneNumber}
                          onChange={(event) => {
                            setSubmitOrderError("");
                            setAlternateDeliveryAddress((currentAddress) =>
                              currentAddress
                                ? {
                                    ...currentAddress,
                                    phoneNumber:
                                      normalizeNigerianPhoneNumber(
                                        event.target.value,
                                      ),
                                  }
                                : null,
                            );
                          }}
                        />
                        <span className="mt-1 block text-[11px] font-medium text-black/45">
                          Required for delivery updates and rider contact.
                        </span>
                      </label>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {activeItems.map(({ item, index }) => {
                    const isMatched = isMatchedStatus(item.status);
                    const resolved = isItemResolved(item);
                    const isResolving = resolvingIndex === index;
                    const resolveError = resolveErrors[index];
                    return (
                      <article className={`rounded-xl border p-4 ${resolved ? "border-emerald-200" : "border-red-200 bg-red-50/45"}`} key={`${item.original}-${index}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-black text-black">
                              {item.interpretation.product || item.original}
                            </p>
                            <p className="mt-1 text-xs font-medium text-black/45">From: {item.original}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase ${resolved ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                              {isMatched ? "matched" : item.status.replaceAll("_", " ")}
                            </span>
                            <button
                              aria-label={`Remove ${item.interpretation.product || item.original}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-black/40 transition hover:bg-red-50 hover:text-red-600"
                              type="button"
                              onClick={() =>
                                setRemovedItemIndexes((current) => new Set(current).add(index))
                              }
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                          <div>
                            <p className="text-[10px] font-black uppercase text-black/40">Quantity</p>
                            <p className="mt-1 font-black text-black">
                              {item.interpretation.quantity !== undefined
                                ? `${item.interpretation.quantity} ${item.interpretation.unit ?? ""}`
                                : item.interpretation.amount !== undefined
                                  ? `${formatCurrency(item.interpretation.amount)} worth`
                                  : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-black/40">Unit price</p>
                            <p className="mt-1 font-black text-black">
                              {item.unitPrice !== undefined ? formatCurrency(item.unitPrice) : "-"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-black/40">Total</p>
                            <p className="mt-1 font-black text-black">
                              {item.totalPrice !== undefined ? formatCurrency(item.totalPrice) : "-"}
                            </p>
                          </div>
                        </div>

                        <p className={`mt-3 text-sm font-medium leading-6 ${resolved ? "text-black/60" : "text-red-700"}`}>
                          {item.message}
                        </p>
                        {item.buyPriceId ? (
                          <p className="mt-2 break-all text-[10px] font-bold text-black/35">
                            Buy price: {item.buyPriceId}
                          </p>
                        ) : null}
                        {resolveError ? (
                          <p className="mt-2 text-xs font-bold text-red-700">{resolveError}</p>
                        ) : null}

                        {(item.status === "needs_confirmation" || item.status === "unsupported_unit") && item.choices.length ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] font-black uppercase text-black/40">Choose an option</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {item.choices.map((choice) => (
                                <button
                                  className="flex items-center justify-between gap-2 rounded-lg border border-black/10 bg-white p-3 text-left transition hover:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isResolving}
                                  key={choice.buyPriceId}
                                  type="button"
                                  onClick={() =>
                                    void resolveItem(index, {
                                      buyPriceId: choice.buyPriceId,
                                      quantity: item.interpretation.quantity ?? 1,
                                      original: item.original,
                                    })
                                  }
                                >
                                  <span>
                                    <p className="text-xs font-black text-black">{choice.label}</p>
                                    <p className="mt-1 text-xs font-bold text-black/55">{formatCurrency(choice.unitPrice)} / {choice.unit}</p>
                                  </span>
                                  {isResolving ? <Loader2 className="shrink-0 animate-spin" size={15} /> : null}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {item.status === "unsupported_unit" && !item.choices.length && item.availableUnits.length ? (
                          <div className="mt-3 space-y-2">
                            <p className="text-[10px] font-black uppercase text-black/40">Choose an available unit</p>
                            <div className="flex flex-wrap gap-2">
                              {item.availableUnits.map((unit) => (
                                <button
                                  className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-black text-black transition hover:border-[#f10606]/40 disabled:cursor-not-allowed disabled:opacity-60"
                                  disabled={isResolving}
                                  key={unit}
                                  type="button"
                                  onClick={() =>
                                    void resolveItem(index, {
                                      quantity: item.interpretation.quantity,
                                      original: buildOriginalWithUnit(item, unit),
                                    })
                                  }
                                >
                                  {unit}
                                  {isResolving ? <Loader2 className="animate-spin" size={13} /> : null}
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-[#fbfbfb] p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Ready items</p>
                    <p className="mt-1 text-lg font-black text-black">{effectiveQuoteItems.length}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Subtotal</p>
                    <p className="mt-1 text-lg font-black text-black">{formatCurrency(subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Service charge</p>
                    <p className="mt-1 text-lg font-black text-black">{formatCurrency(serviceFee)}</p>
                    <p className="mt-1 text-[10px] font-bold text-black/40">
                      4% of subtotal, minimum {formatCurrency(MINIMUM_SERVICE_FEE)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Estimated total</p>
                    <p className="mt-1 text-lg font-black text-[#f10606]">
                      {formatCurrency(estimatedTotal)}
                    </p>
                  </div>
                </div>

                <label className="mt-4 block">
                  <span className="text-xs font-black uppercase text-black/45">
                    Delivery note (optional)
                  </span>
                  <textarea
                    className="mt-2 min-h-24 w-full resize-none rounded-xl border border-black/10 p-4 text-sm font-bold leading-6 text-black outline-none focus:border-[#f10606]"
                    placeholder="Example: Please call before delivery."
                    value={orderNote}
                    onChange={(event) => setOrderNote(event.target.value)}
                  />
                </label>

                {submitOrderError ? (
                  <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold leading-6 text-red-700">
                    <AlertCircle className="mt-0.5 shrink-0" size={17} />
                    {submitOrderError}
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606] disabled:opacity-45"
                    type="button"
                    disabled={isSubmittingOrder}
                    onClick={() => setStep("write")}
                  >
                    <ArrowLeft size={17} />
                    Edit List
                  </button>
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] disabled:cursor-not-allowed disabled:opacity-45"
                    type="button"
                    disabled={!effectiveCanProceed || isSubmittingOrder}
                    onClick={() => void submitOrder()}
                  >
                    {isSubmittingOrder ? (
                      <Loader2 className="animate-spin" size={17} />
                    ) : (
                      <Send size={17} />
                    )}
                    {isSubmittingOrder ? "Submitting order..." : "Submit Order"}
                  </button>
                </div>
              </div>
            ) : null}

            {step === "result" && createOrderResult ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-8">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf8ef] text-[#078b39]">
                    <CheckCircle2 size={28} />
                  </div>
                  <h2 className="text-xl font-black text-black">
                    {createOrderResult.message}
                  </h2>
                  <p className="mt-2 text-sm font-bold text-black/50">
                    Order #{createOrderResult.order.id}
                  </p>
                </div>

                <div className="mt-6 grid gap-3 rounded-xl bg-[#fafafa] p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Status</p>
                    <p className="mt-1 font-black capitalize text-black">
                      {createOrderResult.order.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Subtotal</p>
                    <p className="mt-1 font-black text-black">
                      {createOrderResult.order.subtotal !== undefined
                        ? formatCurrency(createOrderResult.order.subtotal)
                        : "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Service fee</p>
                    <p className="mt-1 font-black text-black">
                      {createOrderResult.order.serviceFee !== undefined
                        ? formatCurrency(createOrderResult.order.serviceFee)
                        : "Pending"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Total</p>
                    <p className="mt-1 text-lg font-black text-[#f10606]">
                      {createOrderResult.order.total !== undefined
                        ? formatCurrency(createOrderResult.order.total)
                        : "Pending"}
                    </p>
                  </div>
                </div>

                {createOrderResult.payment?.charge?.accountNumber ? (
                  <section className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 shrink-0 text-emerald-700" size={21} />
                      <div>
                        <h3 className="text-base font-black text-black">Bank transfer details</h3>
                        <p className="mt-1 text-sm font-medium leading-6 text-black/60">
                          {createOrderResult.payment.charge.displayText ||
                            "Make a bank transfer to the account below."}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <PaymentField
                        label="Bank"
                        value={createOrderResult.payment.charge.bankName}
                      />
                      <PaymentField
                        label="Account name"
                        value={createOrderResult.payment.charge.accountName}
                      />
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-xs font-black uppercase text-black/42">
                          Account number
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-lg font-black text-black">
                            {createOrderResult.payment.charge.accountNumber ||
                              "Not provided"}
                          </p>
                          {createOrderResult.payment.charge.accountNumber ? (
                            <button
                              className="flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-black text-black/60"
                              type="button"
                              onClick={() =>
                                void copyAccountNumber(
                                  createOrderResult.payment?.charge
                                    ?.accountNumber ?? "",
                                )
                              }
                            >
                              <Copy size={14} />
                              {copiedAccountNumber ? "Copied" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-xl bg-white p-4">
                        <p className="text-xs font-black uppercase text-black/42">
                          Amount
                        </p>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <p className="text-lg font-black text-black">
                            {createOrderResult.order.total !== undefined
                              ? formatCurrency(createOrderResult.order.total)
                              : createOrderResult.payment.charge.amount !==
                                  undefined
                                ? formatCurrency(
                                    createOrderResult.payment.charge.amount /
                                      100,
                                  )
                                : "Not provided"}
                          </p>
                          {createOrderResult.order.total !== undefined ||
                          createOrderResult.payment.charge.amount !== undefined ? (
                            <button
                              className="flex h-9 items-center gap-2 rounded-lg border border-black/10 px-3 text-xs font-black text-black/60"
                              type="button"
                              onClick={() =>
                                void copyAmount(
                                  createOrderResult.order.total ??
                                    (createOrderResult.payment?.charge?.amount ??
                                      0) /
                                      100,
                                )
                              }
                            >
                              <Copy size={14} />
                              {copiedAmount ? "Copied" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {createOrderResult.payment.charge.accountExpiresAt ? (
                      <p className="mt-4 flex items-center gap-2 text-xs font-bold text-amber-800">
                        <Clock3 size={15} />
                        Account expires{" "}
                        {formatDateTime(
                          createOrderResult.payment.charge.accountExpiresAt,
                        )}
                      </p>
                    ) : null}

                    <div className="mt-5 rounded-xl border border-emerald-200 bg-white p-4">
                      <p className="text-sm font-black text-black">
                        Pay the exact amount into the account above.
                      </p>
                      <p className="mt-1 text-xs font-medium leading-5 text-black/55">
                        After completing the bank transfer, click the button below
                        to confirm whether Paystack has received your payment.
                      </p>

                      {paymentVerification ? (
                        <div
                          className={`mt-4 rounded-xl border p-4 ${
                            paymentVerification.payment.status === "successful"
                              ? "border-emerald-200 bg-emerald-50"
                              : "border-amber-200 bg-amber-50"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {paymentVerification.payment.status ===
                            "successful" ? (
                              <CheckCircle2
                                className="mt-0.5 shrink-0 text-emerald-700"
                                size={19}
                              />
                            ) : (
                              <Clock3
                                className="mt-0.5 shrink-0 text-amber-700"
                                size={19}
                              />
                            )}
                            <div>
                              <p className="text-sm font-black text-black">
                                {paymentVerification.payment.status ===
                                "successful"
                                  ? "Payment confirmed"
                                  : "Payment is still pending"}
                              </p>
                              <p className="mt-1 text-xs font-medium leading-5 text-black/60">
                                {paymentVerification.message}
                              </p>
                              {paymentVerification.payment.paidAt ? (
                                <p className="mt-2 text-xs font-bold text-emerald-700">
                                  Paid{" "}
                                  {formatDateTime(
                                    paymentVerification.payment.paidAt,
                                  )}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {paymentVerificationError ? (
                        <div className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                          <AlertCircle className="mt-0.5 shrink-0" size={16} />
                          {paymentVerificationError}
                        </div>
                      ) : null}

                      <button
                        className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50"
                        type="button"
                        disabled={
                          isVerifyingPayment ||
                          paymentVerification?.payment.status === "successful"
                        }
                        onClick={() => void verifyPayment()}
                      >
                        {isVerifyingPayment ? (
                          <Loader2 className="animate-spin" size={17} />
                        ) : paymentVerification?.payment.status ===
                          "successful" ? (
                          <CheckCircle2 size={17} />
                        ) : (
                          <CheckCircle2 size={17} />
                        )}
                        {isVerifyingPayment
                          ? "Confirming payment..."
                          : paymentVerification?.payment.status === "successful"
                            ? "Payment Confirmed"
                            : paymentVerification
                              ? "Check Payment Again"
                              : "Confirm Payment"}
                      </button>
                    </div>
                  </section>
                ) : createOrderResult.payment ? (
                  <section
                    className={`mt-5 rounded-xl border p-5 ${
                      createOrderResult.payment.status === "failed"
                        ? "border-red-200 bg-red-50"
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {createOrderResult.payment.status === "failed" ? (
                        <AlertCircle className="mt-0.5 shrink-0 text-red-700" size={20} />
                      ) : (
                        <Clock3 className="mt-0.5 shrink-0 text-amber-700" size={20} />
                      )}
                      <div>
                        <h3 className="text-sm font-black capitalize text-black">
                          Payment {createOrderResult.payment.status}
                        </h3>
                        <p className="mt-1 text-sm font-medium leading-6 text-black/65">
                          {createOrderResult.payment.message ||
                            "Payment details are not available yet."}
                        </p>
                        {createOrderResult.payment.retryAfterSeconds !== undefined ? (
                          <p className="mt-2 text-xs font-bold text-black/50">
                            Retry may be available after{" "}
                            {createOrderResult.payment.retryAfterSeconds} seconds.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606]"
                    type="button"
                    onClick={() => {
                      setQuote(null);
                      setCreateOrderResult(null);
                      setOrderNote("");
                      setPaymentVerification(null);
                      setPaymentVerificationError("");
                      setCopiedAmount(false);
                      setStep("write");
                    }}
                  >
                    <Plus size={17} />
                    Create Another
                  </button>
                  <button
                    className="h-11 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]"
                    type="button"
                    onClick={closeModal}
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
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
    <div className="rounded-xl bg-white p-4">
      <p className="text-xs font-black uppercase text-black/42">{label}</p>
      <p className="mt-2 text-sm font-black text-black">
        {value || "Not provided"}
      </p>
    </div>
  );
}

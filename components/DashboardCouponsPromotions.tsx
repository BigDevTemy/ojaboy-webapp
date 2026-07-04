"use client";

import {
  Eye,
  LoaderCircle,
  Megaphone,
  Plus,
  Power,
  RefreshCw,
  Search,
  Ticket,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE_URL, COUPONS_URL, PROMOTIONS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type DiscountType = "percentage" | "fixed";

type Coupon = {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount: number;
  minimumSubtotal: number;
  usageLimit: number;
  usageCount: number;
  perCustomerLimit: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  eligibleUserIds: string[];
  createdAt?: string;
  updatedAt?: string;
};

type Promotion = {
  id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maximumDiscount: number;
  minimumSubtotal: number;
  priority: number;
  stackWithCoupons: boolean;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt?: string;
  updatedAt?: string;
};

type CouponForm = {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maximumDiscount: string;
  minimumSubtotal: string;
  usageLimit: string;
  perCustomerLimit: string;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
  eligibleUserIds: string;
};

type PromotionForm = {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  maximumDiscount: string;
  minimumSubtotal: string;
  priority: string;
  stackWithCoupons: boolean;
  isActive: boolean;
  validFrom: string;
  validUntil: string;
};

const couponsEndpoint = `${API_BASE_URL}${COUPONS_URL}`;
const promotionsEndpoint = `${API_BASE_URL}${PROMOTIONS_URL}`;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const emptyCouponForm: CouponForm = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  maximumDiscount: "",
  minimumSubtotal: "",
  usageLimit: "100",
  perCustomerLimit: "1",
  isActive: true,
  validFrom: "",
  validUntil: "",
  eligibleUserIds: "",
};

function localDateTime(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function emptyPromotionForm(): PromotionForm {
  return {
    name: "",
    description: "",
    discountType: "percentage",
    discountValue: "",
    maximumDiscount: "",
    minimumSubtotal: "",
    priority: "1",
    stackWithCoupons: false,
    isActive: true,
    validFrom: localDateTime(),
    validUntil: localDateTime(7),
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

function unwrap(body: unknown, keys: string[]): unknown {
  if (!isRecord(body)) return body;
  for (const key of keys) {
    if (body[key] !== undefined) return unwrap(body[key], keys);
  }
  if (body.data !== undefined) return unwrap(body.data, keys);
  return body;
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function parseCoupon(value: unknown): Coupon | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const code = readText(value, ["code"]);
  const discountValue = readNumber(value, ["discountValue"]);
  if (!id || !code || discountValue === undefined) return null;
  return {
    id,
    code,
    description: readText(value, ["description"]) || undefined,
    discountType: readText(value, ["discountType"]) === "fixed" ? "fixed" : "percentage",
    discountValue,
    maximumDiscount: readNumber(value, ["maximumDiscount"]) ?? 0,
    minimumSubtotal: readNumber(value, ["minimumSubtotal"]) ?? 0,
    usageLimit: readNumber(value, ["usageLimit"]) ?? 0,
    usageCount: readNumber(value, ["usageCount"]) ?? 0,
    perCustomerLimit: readNumber(value, ["perCustomerLimit"]) ?? 1,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    validFrom: readText(value, ["validFrom"]) || undefined,
    validUntil: readText(value, ["validUntil"]) || undefined,
    eligibleUserIds: Array.isArray(value.eligibleUserIds)
      ? value.eligibleUserIds.filter((item): item is string => typeof item === "string")
      : [],
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parsePromotion(value: unknown): Promotion | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const name = readText(value, ["name"]);
  const discountValue = readNumber(value, ["discountValue"]);
  if (!id || !name || discountValue === undefined) return null;
  return {
    id,
    name,
    description: readText(value, ["description"]) || undefined,
    discountType: readText(value, ["discountType"]) === "fixed" ? "fixed" : "percentage",
    discountValue,
    maximumDiscount: readNumber(value, ["maximumDiscount"]) ?? 0,
    minimumSubtotal: readNumber(value, ["minimumSubtotal"]) ?? 0,
    priority: readNumber(value, ["priority"]) ?? 0,
    stackWithCoupons: typeof value.stackWithCoupons === "boolean" ? value.stackWithCoupons : false,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    validFrom: readText(value, ["validFrom"]) || undefined,
    validUntil: readText(value, ["validUntil"]) || undefined,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseList<T>(body: unknown, keys: string[], parser: (value: unknown) => T | null) {
  const value = unwrap(body, keys);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const parsed = parser(item);
    return parsed ? [parsed] : [];
  });
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

function formatValidity(validFrom?: string, validUntil?: string) {
  if (!validFrom && !validUntil) return "Always valid";
  return `${formatDate(validFrom)} - ${formatDate(validUntil)}`;
}

function formatDiscount(discountType: DiscountType, discountValue: number, maximumDiscount: number) {
  if (discountType === "percentage") {
    return maximumDiscount > 0
      ? `${discountValue}% off (up to ${formatMoney(maximumDiscount)})`
      : `${discountValue}% off`;
  }
  return `${formatMoney(discountValue)} off`;
}

function parseEligibleUserIds(raw: string) {
  const ids = raw
    .split(/[\n,]/)
    .map((id) => id.trim())
    .filter(Boolean);
  return Array.from(new Set(ids));
}

export function DashboardCouponsPromotions() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [activeTab, setActiveTab] = useState<"coupons" | "promotions">("coupons");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [search, setSearch] = useState("");
  const [couponForm, setCouponForm] = useState<CouponForm>(emptyCouponForm);
  const [promotionForm, setPromotionForm] = useState<PromotionForm>(emptyPromotionForm);
  const [formType, setFormType] = useState<"coupon" | "promotion" | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadAll = useCallback(async () => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    const results = await Promise.allSettled([
      authenticatedFetch(couponsEndpoint, { headers: { Accept: "application/json" } }),
      authenticatedFetch(promotionsEndpoint, { headers: { Accept: "application/json" } }),
    ]);
    try {
      if (results[0].status === "fulfilled") {
        const response = results[0].value;
        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(responseMessage(body, `Unable to load coupons (${response.status}).`));
        }
        setCoupons(parseList(body, ["coupons", "results"], parseCoupon));
      } else {
        throw results[0].reason;
      }

      if (results[1].status === "fulfilled") {
        const response = results[1].value;
        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(responseMessage(body, `Unable to load promotions (${response.status}).`));
        }
        setPromotions(parseList(body, ["promotions", "results"], parsePromotion));
      } else {
        throw results[1].reason;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load coupons and promotions.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadAll(), 0);
    return () => clearTimeout(timer);
  }, [loadAll]);

  const filteredCoupons = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return coupons;
    return coupons.filter((coupon) =>
      `${coupon.code} ${coupon.description ?? ""} ${coupon.isActive ? "active" : "inactive"}`
        .toLowerCase()
        .includes(query),
    );
  }, [coupons, search]);

  const filteredPromotions = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return promotions;
    return promotions.filter((promotion) =>
      `${promotion.name} ${promotion.description ?? ""} ${promotion.isActive ? "active" : "inactive"}`
        .toLowerCase()
        .includes(query),
    );
  }, [promotions, search]);

  function openCreateCoupon() {
    setCouponForm(emptyCouponForm);
    setFormType("coupon");
    setError("");
    setNotice("");
  }

  function openCreatePromotion() {
    setPromotionForm(emptyPromotionForm());
    setFormType("promotion");
    setError("");
    setNotice("");
  }

  async function submitCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const code = couponForm.code.trim().toUpperCase();
    const description = couponForm.description.trim();
    const discountValue = Number(couponForm.discountValue);
    const maximumDiscount = Number(couponForm.maximumDiscount);
    const minimumSubtotal = Number(couponForm.minimumSubtotal);
    const usageLimit = Number(couponForm.usageLimit);
    const perCustomerLimit = Number(couponForm.perCustomerLimit);

    if (!code || !description) {
      setError("Coupon code and description are required.");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setError("Enter a valid discount value.");
      return;
    }
    if (couponForm.discountType === "percentage" && discountValue > 100) {
      setError("Percentage discount value cannot exceed 100.");
      return;
    }
    if (!Number.isFinite(maximumDiscount) || maximumDiscount < 0) {
      setError("Enter a valid maximum discount.");
      return;
    }
    if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) {
      setError("Enter a valid minimum subtotal.");
      return;
    }
    if (!Number.isInteger(usageLimit) || usageLimit <= 0) {
      setError("Usage limit must be a positive whole number.");
      return;
    }
    if (!Number.isInteger(perCustomerLimit) || perCustomerLimit <= 0) {
      setError("Per-customer limit must be a positive whole number.");
      return;
    }
    if (
      couponForm.validFrom &&
      couponForm.validUntil &&
      new Date(couponForm.validUntil) <= new Date(couponForm.validFrom)
    ) {
      setError("Valid until must be later than valid from.");
      return;
    }
    const eligibleUserIds = parseEligibleUserIds(couponForm.eligibleUserIds);
    if (eligibleUserIds.length > 1000) {
      setError("Eligible users list cannot exceed 1000 entries.");
      return;
    }
    if (eligibleUserIds.some((id) => !uuidPattern.test(id))) {
      setError("Eligible users must be valid UUIDs, one per line or comma-separated.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(couponsEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          description,
          discountType: couponForm.discountType,
          discountValue,
          maximumDiscount,
          minimumSubtotal,
          usageLimit,
          perCustomerLimit,
          isActive: couponForm.isActive,
          ...(couponForm.validFrom ? { validFrom: new Date(couponForm.validFrom).toISOString() } : {}),
          ...(couponForm.validUntil ? { validUntil: new Date(couponForm.validUntil).toISOString() } : {}),
          ...(eligibleUserIds.length ? { eligibleUserIds } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to create coupon (${response.status}).`));
      }
      setFormType(null);
      setNotice("Coupon created successfully.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create coupon.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = promotionForm.name.trim();
    const description = promotionForm.description.trim();
    const discountValue = Number(promotionForm.discountValue);
    const maximumDiscount = Number(promotionForm.maximumDiscount);
    const minimumSubtotal = Number(promotionForm.minimumSubtotal);
    const priority = Number(promotionForm.priority);

    if (!name || !description) {
      setError("Promotion name and description are required.");
      return;
    }
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      setError("Enter a valid discount value.");
      return;
    }
    if (promotionForm.discountType === "percentage" && discountValue > 100) {
      setError("Percentage discount value cannot exceed 100.");
      return;
    }
    if (!Number.isFinite(maximumDiscount) || maximumDiscount < 0) {
      setError("Enter a valid maximum discount.");
      return;
    }
    if (!Number.isFinite(minimumSubtotal) || minimumSubtotal < 0) {
      setError("Enter a valid minimum subtotal.");
      return;
    }
    if (!Number.isInteger(priority) || priority < 0) {
      setError("Priority must be a whole number of 0 or more.");
      return;
    }
    if (!promotionForm.validFrom || !promotionForm.validUntil) {
      setError("Valid from and valid until are required for promotions.");
      return;
    }
    if (new Date(promotionForm.validUntil) <= new Date(promotionForm.validFrom)) {
      setError("Valid until must be later than valid from.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(promotionsEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          discountType: promotionForm.discountType,
          discountValue,
          maximumDiscount,
          minimumSubtotal,
          priority,
          stackWithCoupons: promotionForm.stackWithCoupons,
          isActive: promotionForm.isActive,
          validFrom: new Date(promotionForm.validFrom).toISOString(),
          validUntil: new Date(promotionForm.validUntil).toISOString(),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to create promotion (${response.status}).`));
      }
      setFormType(null);
      setNotice("Promotion created successfully.");
      await loadAll();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create promotion.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleCoupon(coupon: Coupon) {
    setBusyAction(`toggle-coupon-${coupon.id}`);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${couponsEndpoint}/${coupon.id}/toggle`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to update coupon status (${response.status}).`));
      }
      const updated = parseCoupon(unwrap(body, ["coupon"]));
      setCoupons((current) =>
        current.map((item) =>
          item.id === coupon.id ? (updated ?? { ...item, isActive: !item.isActive }) : item,
        ),
      );
      setNotice(`Coupon "${coupon.code}" ${coupon.isActive ? "deactivated" : "activated"}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update coupon status.");
    } finally {
      setBusyAction("");
    }
  }

  async function togglePromotion(promotion: Promotion) {
    setBusyAction(`toggle-promotion-${promotion.id}`);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${promotionsEndpoint}/${promotion.id}/toggle`, {
        method: "POST",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to update promotion status (${response.status}).`));
      }
      const updated = parsePromotion(unwrap(body, ["promotion"]));
      setPromotions((current) =>
        current.map((item) =>
          item.id === promotion.id ? (updated ?? { ...item, isActive: !item.isActive }) : item,
        ),
      );
      setNotice(`Promotion "${promotion.name}" ${promotion.isActive ? "deactivated" : "activated"}.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update promotion status.");
    } finally {
      setBusyAction("");
    }
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <Ticket className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Coupons & promotions are restricted</h1>
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
          <h1 className="text-3xl font-black text-black">Coupons & Promotions</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Coupons are redeemed with a code; promotions apply automatically at checkout.
          </p>
        </div>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white"
          type="button"
          onClick={activeTab === "coupons" ? openCreateCoupon : openCreatePromotion}
        >
          <Plus size={17} />
          Add {activeTab === "coupons" ? "coupon" : "promotion"}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Total coupons" value={coupons.length} />
        <Metric label="Active coupons" value={coupons.filter((coupon) => coupon.isActive).length} />
        <Metric label="Total promotions" value={promotions.length} />
        <Metric label="Active promotions" value={promotions.filter((promotion) => promotion.isActive).length} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="grid grid-cols-2 rounded-xl bg-[#fafafa] p-1 lg:w-80">
            {(["coupons", "promotions"] as const).map((tab) => (
              <button
                className={`h-10 rounded-lg text-xs font-black capitalize ${activeTab === tab ? "bg-white text-[#f10606] shadow-sm" : "text-black/45"}`}
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSearch("");
                }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input
              className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40"
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadAll()}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      {activeTab === "coupons" ? (
        <CouponsTable
          coupons={filteredCoupons}
          loading={isLoading}
          busyAction={busyAction}
          onView={setSelectedCoupon}
          onToggle={(coupon) => void toggleCoupon(coupon)}
        />
      ) : (
        <PromotionsTable
          promotions={filteredPromotions}
          loading={isLoading}
          busyAction={busyAction}
          onView={setSelectedPromotion}
          onToggle={(promotion) => void togglePromotion(promotion)}
        />
      )}

      {formType === "coupon" ? (
        <Modal title="Add coupon" onClose={() => !isSubmitting && setFormType(null)}>
          <form className="space-y-4" onSubmit={submitCoupon}>
            <Input label="Coupon code" value={couponForm.code} onChange={(value) => setCouponForm((current) => ({ ...current, code: value }))} placeholder="WELCOME10" />
            <label className="block">
              <span className="text-xs font-black text-black">Description *</span>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={couponForm.description} onChange={(event) => setCouponForm((current) => ({ ...current, description: event.target.value }))} placeholder="10% off for new customers" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-black">Discount type *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={couponForm.discountType} onChange={(event) => setCouponForm((current) => ({ ...current, discountType: event.target.value as DiscountType }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <Input label={couponForm.discountType === "percentage" ? "Discount (%)" : "Discount (NGN)"} value={couponForm.discountValue} onChange={(value) => setCouponForm((current) => ({ ...current, discountValue: value }))} type="number" placeholder={couponForm.discountType === "percentage" ? "10" : "1500"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Maximum discount (NGN)" value={couponForm.maximumDiscount} onChange={(value) => setCouponForm((current) => ({ ...current, maximumDiscount: value }))} type="number" placeholder="5000" />
              <Input label="Minimum subtotal (NGN)" value={couponForm.minimumSubtotal} onChange={(value) => setCouponForm((current) => ({ ...current, minimumSubtotal: value }))} type="number" placeholder="20000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Usage limit" value={couponForm.usageLimit} onChange={(value) => setCouponForm((current) => ({ ...current, usageLimit: value }))} type="number" placeholder="500" />
              <Input label="Per-customer limit" value={couponForm.perCustomerLimit} onChange={(value) => setCouponForm((current) => ({ ...current, perCustomerLimit: value }))} type="number" placeholder="1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-black">Valid from</span>
                <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={couponForm.validFrom} onChange={(event) => setCouponForm((current) => ({ ...current, validFrom: event.target.value }))} />
              </label>
              <label className="block">
                <span className="text-xs font-black text-black">Valid until</span>
                <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={couponForm.validUntil} onChange={(event) => setCouponForm((current) => ({ ...current, validUntil: event.target.value }))} />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-black text-black">Eligible users</span>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={couponForm.eligibleUserIds} onChange={(event) => setCouponForm((current) => ({ ...current, eligibleUserIds: event.target.value }))} placeholder="One user UUID per line, or leave empty for everyone" />
              <span className="mt-1 block text-[10px] font-bold text-black/40">Leave empty to make this coupon available to everyone. Max 1000 users.</span>
            </label>
            <StatusSelect value={couponForm.isActive} onChange={(value) => setCouponForm((current) => ({ ...current, isActive: value }))} />
            <SubmitButton busy={isSubmitting} label="Create coupon" />
          </form>
        </Modal>
      ) : null}

      {formType === "promotion" ? (
        <Modal title="Add promotion" onClose={() => !isSubmitting && setFormType(null)}>
          <form className="space-y-4" onSubmit={submitPromotion}>
            <Input label="Promotion name" value={promotionForm.name} onChange={(value) => setPromotionForm((current) => ({ ...current, name: value }))} placeholder="July Flash Sale" />
            <label className="block">
              <span className="text-xs font-black text-black">Description *</span>
              <textarea className="mt-2 min-h-20 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={promotionForm.description} onChange={(event) => setPromotionForm((current) => ({ ...current, description: event.target.value }))} placeholder="Storewide discount for the July promo" />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-black">Discount type *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={promotionForm.discountType} onChange={(event) => setPromotionForm((current) => ({ ...current, discountType: event.target.value as DiscountType }))}>
                  <option value="percentage">Percentage</option>
                  <option value="fixed">Fixed amount</option>
                </select>
              </label>
              <Input label={promotionForm.discountType === "percentage" ? "Discount (%)" : "Discount (NGN)"} value={promotionForm.discountValue} onChange={(value) => setPromotionForm((current) => ({ ...current, discountValue: value }))} type="number" placeholder={promotionForm.discountType === "percentage" ? "15" : "2000"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Maximum discount (NGN)" value={promotionForm.maximumDiscount} onChange={(value) => setPromotionForm((current) => ({ ...current, maximumDiscount: value }))} type="number" placeholder="2000" />
              <Input label="Minimum subtotal (NGN)" value={promotionForm.minimumSubtotal} onChange={(value) => setPromotionForm((current) => ({ ...current, minimumSubtotal: value }))} type="number" placeholder="15000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Priority" value={promotionForm.priority} onChange={(value) => setPromotionForm((current) => ({ ...current, priority: value }))} type="number" placeholder="1" hint="Higher priority wins when multiple promotions apply." />
              <label className="block">
                <span className="text-xs font-black text-black">Stack with coupons *</span>
                <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={promotionForm.stackWithCoupons ? "yes" : "no"} onChange={(event) => setPromotionForm((current) => ({ ...current, stackWithCoupons: event.target.value === "yes" }))}>
                  <option value="no">No</option>
                  <option value="yes">Yes</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-black text-black">Valid from *</span>
                <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={promotionForm.validFrom} onChange={(event) => setPromotionForm((current) => ({ ...current, validFrom: event.target.value }))} />
              </label>
              <label className="block">
                <span className="text-xs font-black text-black">Valid until *</span>
                <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" type="datetime-local" value={promotionForm.validUntil} onChange={(event) => setPromotionForm((current) => ({ ...current, validUntil: event.target.value }))} />
              </label>
            </div>
            <StatusSelect value={promotionForm.isActive} onChange={(value) => setPromotionForm((current) => ({ ...current, isActive: value }))} />
            <SubmitButton busy={isSubmitting} label="Create promotion" />
          </form>
        </Modal>
      ) : null}

      {selectedCoupon ? (
        <Modal title={selectedCoupon.code} onClose={() => setSelectedCoupon(null)}>
          <div className="space-y-3">
            <Detail label="Coupon ID" value={selectedCoupon.id} />
            <Detail label="Description" value={selectedCoupon.description || "No description provided."} />
            <Detail label="Discount" value={formatDiscount(selectedCoupon.discountType, selectedCoupon.discountValue, selectedCoupon.maximumDiscount)} />
            <Detail label="Minimum subtotal" value={formatMoney(selectedCoupon.minimumSubtotal)} />
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Usage" value={`${selectedCoupon.usageCount}/${selectedCoupon.usageLimit}`} />
              <Detail label="Per customer" value={String(selectedCoupon.perCustomerLimit)} />
            </div>
            <Detail label="Validity" value={formatValidity(selectedCoupon.validFrom, selectedCoupon.validUntil)} />
            <Detail label="Eligible users" value={selectedCoupon.eligibleUserIds.length ? `${selectedCoupon.eligibleUserIds.length} specific customer(s)` : "Everyone"} />
            <Detail label="Status" value={selectedCoupon.isActive ? "Active" : "Inactive"} />
          </div>
        </Modal>
      ) : null}

      {selectedPromotion ? (
        <Modal title={selectedPromotion.name} onClose={() => setSelectedPromotion(null)}>
          <div className="space-y-3">
            <Detail label="Promotion ID" value={selectedPromotion.id} />
            <Detail label="Description" value={selectedPromotion.description || "No description provided."} />
            <Detail label="Discount" value={formatDiscount(selectedPromotion.discountType, selectedPromotion.discountValue, selectedPromotion.maximumDiscount)} />
            <Detail label="Minimum subtotal" value={formatMoney(selectedPromotion.minimumSubtotal)} />
            <div className="grid grid-cols-2 gap-3">
              <Detail label="Priority" value={String(selectedPromotion.priority)} />
              <Detail label="Stacks with coupons" value={selectedPromotion.stackWithCoupons ? "Yes" : "No"} />
            </div>
            <Detail label="Validity" value={formatValidity(selectedPromotion.validFrom, selectedPromotion.validUntil)} />
            <Detail label="Status" value={selectedPromotion.isActive ? "Active" : "Inactive"} />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function CouponsTable({
  coupons,
  loading,
  busyAction,
  onView,
  onToggle,
}: {
  coupons: Coupon[];
  loading: boolean;
  busyAction: string;
  onView: (coupon: Coupon) => void;
  onToggle: (coupon: Coupon) => void;
}) {
  return (
    <TableShell columns="grid-cols-[0.9fr_1.1fr_0.9fr_1fr_0.55fr_0.55fr]" headers={["Code", "Discount", "Usage", "Validity", "Status", "Actions"]}>
      {loading ? (
        <LoadingRows />
      ) : coupons.length ? (
        coupons.map((coupon) => (
          <article className="grid grid-cols-[0.9fr_1.1fr_0.9fr_1fr_0.55fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={coupon.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-black">{coupon.code}</p>
              <p className="mt-1 truncate text-xs font-medium text-black/45">{coupon.description || "No description"}</p>
            </div>
            <p className="text-xs font-black text-black">{formatDiscount(coupon.discountType, coupon.discountValue, coupon.maximumDiscount)}</p>
            <p className="text-xs font-bold text-black/55">{coupon.usageCount}/{coupon.usageLimit} · {coupon.perCustomerLimit}/customer</p>
            <p className="text-xs font-bold text-black/45">{formatValidity(coupon.validFrom, coupon.validUntil)}</p>
            <StatusBadge active={coupon.isActive} />
            <div className="flex justify-end gap-2">
              <ActionButton label={`View ${coupon.code}`} onClick={() => onView(coupon)}><Eye size={15} /></ActionButton>
              <ActionButton label={`${coupon.isActive ? "Deactivate" : "Activate"} ${coupon.code}`} busy={busyAction === `toggle-coupon-${coupon.id}`} onClick={() => onToggle(coupon)}><Power size={15} /></ActionButton>
            </div>
          </article>
        ))
      ) : (
        <EmptyState label="No coupons found" />
      )}
    </TableShell>
  );
}

function PromotionsTable({
  promotions,
  loading,
  busyAction,
  onView,
  onToggle,
}: {
  promotions: Promotion[];
  loading: boolean;
  busyAction: string;
  onView: (promotion: Promotion) => void;
  onToggle: (promotion: Promotion) => void;
}) {
  return (
    <TableShell columns="grid-cols-[0.9fr_1.1fr_0.75fr_1fr_0.55fr_0.55fr]" headers={["Name", "Discount", "Priority", "Validity", "Status", "Actions"]}>
      {loading ? (
        <LoadingRows />
      ) : promotions.length ? (
        promotions.map((promotion) => (
          <article className="grid grid-cols-[0.9fr_1.1fr_0.75fr_1fr_0.55fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={promotion.id}>
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-black">{promotion.name}</p>
              <p className="mt-1 truncate text-xs font-medium text-black/45">{promotion.description || "No description"}</p>
            </div>
            <p className="text-xs font-black text-black">{formatDiscount(promotion.discountType, promotion.discountValue, promotion.maximumDiscount)}</p>
            <p className="text-xs font-bold text-black/55">{promotion.priority} · {promotion.stackWithCoupons ? "Stacks" : "Exclusive"}</p>
            <p className="text-xs font-bold text-black/45">{formatValidity(promotion.validFrom, promotion.validUntil)}</p>
            <StatusBadge active={promotion.isActive} />
            <div className="flex justify-end gap-2">
              <ActionButton label={`View ${promotion.name}`} onClick={() => onView(promotion)}><Eye size={15} /></ActionButton>
              <ActionButton label={`${promotion.isActive ? "Deactivate" : "Activate"} ${promotion.name}`} busy={busyAction === `toggle-promotion-${promotion.id}`} onClick={() => onToggle(promotion)}><Power size={15} /></ActionButton>
            </div>
          </article>
        ))
      ) : (
        <EmptyState label="No promotions found" />
      )}
    </TableShell>
  );
}

function TableShell({ headers, columns, children }: { headers: string[]; columns: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className={`grid ${columns} gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50`}>
        {headers.map((header, index) => (
          <span className={index === headers.length - 1 ? "text-right" : ""} key={header}>{header}</span>
        ))}
      </div>
      {children}
    </section>
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

function LoadingRows() {
  return <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>;
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="p-9 text-center">
      <Megaphone className="mx-auto text-[#f10606]" size={27} />
      <p className="mt-3 text-sm font-black text-black">{label}</p>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/50"}`}>{active ? "Active" : "Inactive"}</span>;
}

function Input({ label, value, onChange, placeholder, type = "text", hint }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-black">{label} *</span>
      <input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
      {hint ? <span className="mt-1 block text-[10px] font-bold text-black/40">{hint}</span> : null}
    </label>
  );
}

function StatusSelect({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="block">
      <span className="text-xs font-black text-black">Status *</span>
      <select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={value ? "active" : "inactive"} onChange={(event) => onChange(event.target.value === "active")}>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </label>
  );
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return (
    <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={busy} type="submit">
      {busy ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}
      {busy ? "Saving..." : label}
    </button>
  );
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>
      {busy ? <LoaderCircle className="animate-spin" size={15} /> : children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase text-[#f10606]">Marketing</p>
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

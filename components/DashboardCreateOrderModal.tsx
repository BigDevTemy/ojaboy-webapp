"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Send,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";

type ParsedOrderItem = {
  raw: string;
  product: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
  confidence: "High" | "Medium" | "Low";
};

const productCatalog = [
  {
    product: "Turkey",
    aliases: ["turkey"],
    defaultUnit: "kg",
    unitPrices: { kg: 6500 },
  },
  {
    product: "Rice",
    aliases: ["rice"],
    defaultUnit: "paint",
    unitPrices: { paint: 3200, kg: 1690, bag: 84500 },
  },
  {
    product: "Beans",
    aliases: ["beans", "bean"],
    defaultUnit: "derica",
    unitPrices: { derica: 3900, deca: 3900, paint: 7800 },
  },
  {
    product: "Tomatoes",
    aliases: ["tomatoes", "tomato"],
    defaultUnit: "basket",
    unitPrices: { basket: 18500 },
  },
  {
    product: "Pepper",
    aliases: ["pepper"],
    defaultUnit: "basket",
    unitPrices: { basket: 23000 },
  },
  {
    product: "Palm Oil",
    aliases: ["palm oil", "palmoil", "oil"],
    defaultUnit: "litre",
    unitPrices: { litre: 2500, l: 2500, "25l": 42000 },
  },
] as const;

const unitAliases: Record<string, string> = {
  kg: "kg",
  kilo: "kg",
  kilos: "kg",
  kilogram: "kg",
  kilograms: "kg",
  paint: "paint",
  paints: "paint",
  derica: "derica",
  dericas: "derica",
  deca: "derica",
  decas: "derica",
  bag: "bag",
  bags: "bag",
  basket: "basket",
  baskets: "basket",
  litre: "litre",
  liter: "litre",
  litres: "litre",
  liters: "litre",
  l: "l",
  "25l": "25l",
};

function formatCurrency(value: number) {
  return `N${Math.round(value).toLocaleString("en-NG")}`;
}

function parseQuantity(value: string | undefined) {
  if (!value) {
    return 1;
  }

  if (value.includes("/")) {
    const [numerator, denominator] = value.split("/").map(Number);
    return denominator ? numerator / denominator : 1;
  }

  return Number(value) || 1;
}

function findCatalogEntry(text: string) {
  const normalized = text.toLowerCase();

  return productCatalog.find((entry) => entry.aliases.some((alias) => normalized.includes(alias)));
}

function findUnit(text: string, fallback: string) {
  const normalized = text.toLowerCase();
  const match = normalized.match(/\b(25l|kg|kilo|kilos|kilogram|kilograms|paint|paints|derica|dericas|deca|decas|bag|bags|basket|baskets|litre|liter|litres|liters|l)\b/);

  return match ? unitAliases[match[1]] : fallback;
}

function parseOrderText(text: string): ParsedOrderItem[] {
  return text
    .split(/,|\n|;/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((raw) => {
      const normalizedRaw = raw.toLowerCase().replace(/(\d)([a-z])/g, "$1 $2");
      const quantityMatch = normalizedRaw.match(/^(\d+(?:\.\d+)?|\d+\/\d+)/);
      const quantity = parseQuantity(quantityMatch?.[1]);
      const catalogEntry = findCatalogEntry(normalizedRaw);

      if (!catalogEntry) {
        return {
          raw,
          product: raw,
          quantity,
          unit: "item",
          unitPrice: 0,
          total: 0,
          confidence: "Low",
        };
      }

      const unit = findUnit(normalizedRaw, catalogEntry.defaultUnit);
      const unitPrice = catalogEntry.unitPrices[unit as keyof typeof catalogEntry.unitPrices] ?? catalogEntry.unitPrices[catalogEntry.defaultUnit as keyof typeof catalogEntry.unitPrices] ?? 0;

      return {
        raw,
        product: catalogEntry.product,
        quantity,
        unit,
        unitPrice,
        total: quantity * unitPrice,
        confidence: unitPrice > 0 ? "High" : "Medium",
      };
    });
}

const exampleOrder = "2kg Turkey, 1paint rice, 3 deca beans, 1/4 tomatoes basket";

export function DashboardCreateOrderModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"write" | "review" | "sent">("write");
  const [orderText, setOrderText] = useState(exampleOrder);
  const parsedItems = useMemo(() => parseOrderText(orderText), [orderText]);
  const subtotal = parsedItems.reduce((sum, item) => sum + item.total, 0);
  const serviceFee = subtotal > 0 ? Math.max(1500, subtotal * 0.04) : 0;
  const estimatedTotal = subtotal + serviceFee;

  function closeModal() {
    setIsOpen(false);
    setStep("write");
  }

  return (
    <>
      <button
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] transition hover:bg-[#d80505]"
        type="button"
        onClick={() => setIsOpen(true)}
      >
        <ShoppingCart size={17} />
        Create Order
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-6 sm:items-center">
          <section className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_30px_90px_rgba(0,0,0,0.24)]">
            <div className="shrink-0 flex items-start justify-between gap-4 border-b border-black/10 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-black">Create Order</h2>
                  <span className="rounded-full bg-[#fff0f0] px-2 py-1 text-[10px] font-black text-[#f10606]">Smart List</span>
                </div>
                <p className="mt-1 text-sm font-medium text-black/58">Write your market list naturally. Ojaboy will structure and estimate it.</p>
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
                    className="mt-2 min-h-48 w-full resize-none rounded-xl border border-black/10 bg-white p-4 text-sm font-bold leading-7 text-black outline-none shadow-sm placeholder:text-black/35"
                    value={orderText}
                    onChange={(event) => setOrderText(event.target.value)}
                    placeholder="Example: 2kg Turkey, 1paint rice, 3 deca beans, 1/4 tomatoes basket"
                  />
                </label>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button className="h-11 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606]" type="button" onClick={closeModal}>
                    Cancel
                  </button>
                  <button
                    className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)] disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={!orderText.trim()}
                    onClick={() => setStep("review")}
                  >
                    <Sparkles size={17} />
                    Make Sense of List
                  </button>
                </div>
              </div>
            ) : null}

            {step === "review" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-black text-black">
                  <Loader2 size={17} className="text-[#f10606]" />
                  Parsed order preview
                </div>

                <div className="overflow-hidden rounded-xl border border-black/10">
                  <div className="grid min-w-[680px] grid-cols-[1fr_0.55fr_0.65fr_0.75fr_0.75fr_0.65fr] gap-3 bg-[#fff5f5] px-4 py-3 text-xs font-black uppercase text-black/50">
                    <span>Item</span>
                    <span>Qty</span>
                    <span>Unit</span>
                    <span>Unit Price</span>
                    <span>Total</span>
                    <span>Confidence</span>
                  </div>
                  <div className="overflow-x-auto">
                    {parsedItems.map((item) => (
                      <div className="grid min-w-[680px] grid-cols-[1fr_0.55fr_0.65fr_0.75fr_0.75fr_0.65fr] items-center gap-3 border-t border-black/10 px-4 py-3 text-sm" key={item.raw}>
                        <div>
                          <p className="font-black text-black">{item.product}</p>
                          <p className="mt-1 text-xs font-medium text-black/45">From: {item.raw}</p>
                        </div>
                        <p className="font-black text-black">{item.quantity}</p>
                        <p className="font-bold capitalize text-black/62">{item.unit}</p>
                        <p className="font-black text-black">{item.unitPrice ? formatCurrency(item.unitPrice) : "Needs price"}</p>
                        <p className="font-black text-black">{item.total ? formatCurrency(item.total) : "-"}</p>
                        <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${item.confidence === "High" ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                          {item.confidence}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 rounded-xl bg-[#fbfbfb] p-4 sm:grid-cols-3">
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Subtotal</p>
                    <p className="mt-1 text-lg font-black text-black">{formatCurrency(subtotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Service Estimate</p>
                    <p className="mt-1 text-lg font-black text-black">{formatCurrency(serviceFee)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-black/42">Estimated Total</p>
                    <p className="mt-1 text-lg font-black text-[#f10606]">{formatCurrency(estimatedTotal)}</p>
                  </div>
                </div>

                {parsedItems.some((item) => item.confidence !== "High") ? (
                  <div className="mt-4 flex gap-2 rounded-xl border border-[#ffd6d6] bg-[#fff7f7] p-3 text-sm font-medium leading-6 text-black/62">
                    <AlertCircle className="mt-0.5 shrink-0 text-[#f10606]" size={17} />
                    Some items need market confirmation. You can still send the order, and the buyer will confirm exact pricing before purchase.
                  </div>
                ) : null}

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606]" type="button" onClick={() => setStep("write")}>
                    <ArrowLeft size={17} />
                    Edit List
                  </button>
                  <button className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button" onClick={() => setStep("sent")}>
                    <Send size={17} />
                    Send Order Request
                  </button>
                </div>
              </div>
            ) : null}

            {step === "sent" ? (
              <div className="min-h-0 flex-1 overflow-y-auto p-8 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eaf8ef] text-[#078b39]">
                  <CheckCircle2 size={28} />
                </div>
                <h2 className="text-xl font-black text-black">Order request sent</h2>
                <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/58">
                  We translated your list into an estimated order. A buyer will confirm exact market prices before purchase.
                </p>
                <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                  <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-5 text-sm font-black text-black/70 transition hover:text-[#f10606]" type="button" onClick={() => setStep("write")}>
                    <Plus size={17} />
                    Create Another
                  </button>
                  <button className="h-11 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button" onClick={closeModal}>
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

"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, LoaderCircle, MapPin, Search, Save } from "lucide-react";
import { API_BASE_URL, MARKET_PRICES_URL, MARKETS_URL, PRODUCT_OFFERINGS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { getApiErrorMessage } from "@/lib/apiError";

type Market = { id: string; name: string; address?: string };
type Offering = { id: string; productId: string; name: string; detail: string; unit: string; quantity: number };
type ExistingPrice = { id: string; offeringId?: string; productId: string; unit: string; quantity: number; amount: number };

const marketsEndpoint = `${API_BASE_URL}${MARKETS_URL}`;
const offeringsEndpoint = `${API_BASE_URL}${PRODUCT_OFFERINGS_URL}`;
const pricesEndpoint = `${API_BASE_URL}${MARKET_PRICES_URL}`;

function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function text(record: Record<string, unknown> | null, keys: string[]) { if (!record) return ""; for (const key of keys) { const value = record[key]; if ((typeof value === "string" || typeof value === "number") && String(value).trim()) return String(value).trim(); } return ""; }
function number(record: Record<string, unknown> | null, keys: string[]) { if (!record) return undefined; for (const key of keys) { const value = Number(record[key]); if (Number.isFinite(value)) return value; } return undefined; }
function list(body: unknown, keys: string[]) { let value: unknown = body; for (let depth = 0; depth < 3 && isRecord(value); depth += 1) { const record = value; const next = keys.map((key) => record[key]).find((item) => Array.isArray(item) || isRecord(item)); if (next === undefined) break; value = next; } return Array.isArray(value) ? value : [value]; }
function localToday() { const date = new Date(); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 10); }
function normalized(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function parseMarkets(body: unknown): Market[] {
  return list(body, ["data", "markets", "results", "items"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const id = text(value, ["id"]); const name = text(value, ["marketname", "name"]);
    return id && name ? [{ id, name, address: text(value, ["marketaddress", "address"]) || undefined }] : [];
  });
}

function parseOfferings(body: unknown): Offering[] {
  return list(body, ["data", "productOfferings", "offerings", "results", "items"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const product = isRecord(value.product) ? value.product : null;
    const variant = isRecord(value.variant) ? value.variant : null;
    const brand = isRecord(value.brand) ? value.brand : null;
    const packageValue = isRecord(value.package) ? value.package : isRecord(value.productPackage) ? value.productPackage : null;
    const id = text(value, ["id"]); const productId = text(value, ["productId"]) || text(product, ["id"]);
    if (!id || !productId) return [];
    const unit = text(packageValue, ["name"]) || text(value, ["unit", "baseUnit"]) || text(packageValue, ["baseUnit", "unit"]) || "unit";
    const quantity = number(value, ["quantity"]) ?? number(packageValue, ["quantity"]) ?? 1;
    const detail = [text(variant, ["name"]), text(brand, ["name"]), text(packageValue, ["name"])].filter(Boolean).join(" · ");
    return [{ id, productId, name: text(product, ["name", "title"]) || text(value, ["productName", "name"]) || "Product", detail, unit, quantity }];
  });
}

function parsePrices(body: unknown): ExistingPrice[] {
  return list(body, ["data", "marketPrices", "prices", "results", "items"]).flatMap((value) => {
    if (!isRecord(value)) return [];
    const product = isRecord(value.product) ? value.product : null; const offering = isRecord(value.productOffering) ? value.productOffering : null;
    const id = text(value, ["id"]); const productId = text(value, ["productId"]) || text(product, ["id"]); const amount = number(value, ["amount", "price"]);
    return id && productId && amount !== undefined ? [{ id, productId, offeringId: text(value, ["productOfferingId"]) || text(offering, ["id"]) || undefined, unit: text(value, ["unit"]) || "unit", quantity: number(value, ["quantity"]) ?? 1, amount }] : [];
  });
}

function offeringKey(offering: Pick<Offering, "id" | "productId" | "unit" | "quantity">) { return `${offering.productId}|${offering.unit.toLowerCase()}|${offering.quantity}`; }

export function MarketAgentMarketPrices() {
  const [markets, setMarkets] = useState<Market[]>([]); const [offerings, setOfferings] = useState<Offering[]>([]);
  const [marketId, setMarketId] = useState(""); const [date, setDate] = useState(localToday); const [search, setSearch] = useState("");
  const [values, setValues] = useState<Record<string, string>>({}); const [existing, setExisting] = useState<Record<string, ExistingPrice>>({});
  const [isLoading, setIsLoading] = useState(true); const [isPricesLoading, setIsPricesLoading] = useState(false); const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(""); const [notice, setNotice] = useState("");

  const loadOptions = useCallback(async () => {
    setIsLoading(true); setError("");
    try {
      const [marketResponse, offeringResponse] = await Promise.all([authenticatedFetch(marketsEndpoint), authenticatedFetch(`${offeringsEndpoint}?page=1&limit=200`)]);
      if (!marketResponse.ok) throw new Error(await getApiErrorMessage(marketResponse, "Unable to load markets."));
      if (!offeringResponse.ok) throw new Error(await getApiErrorMessage(offeringResponse, "Unable to load offerings."));
      const [marketBody, offeringBody] = await Promise.all([marketResponse.json(), offeringResponse.json()]);
      const parsedMarkets = parseMarkets(marketBody); setMarkets(parsedMarkets); setOfferings(parseOfferings(offeringBody));
      setMarketId((current) => current || parsedMarkets.find((market) => normalized(market.name).includes("ileepo"))?.id || parsedMarkets[0]?.id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to prepare market prices."); }
    finally { setIsLoading(false); }
  }, []);

  const loadPrices = useCallback(async (selectedMarket: string, selectedDate: string) => {
    if (!selectedMarket || !selectedDate) return;
    setIsPricesLoading(true); setError(""); setNotice("");
    try {
      const query = new URLSearchParams({ marketId: selectedMarket, from: selectedDate, to: selectedDate, limit: "200" });
      const response = await authenticatedFetch(`${pricesEndpoint}?${query.toString()}`);
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Unable to load prices for this date."));
      const prices = parsePrices(await response.json()); const nextExisting: Record<string, ExistingPrice> = {}; const nextValues: Record<string, string> = {};
      prices.forEach((price) => { const key = price.offeringId || `${price.productId}|${price.unit.toLowerCase()}|${price.quantity}`; nextExisting[key] = price; nextValues[key] = String(price.amount); });
      setExisting(nextExisting); setValues(nextValues);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load prices for this date."); }
    finally { setIsPricesLoading(false); }
  }, []);

  useEffect(() => { const id = window.setTimeout(() => void loadOptions(), 0); return () => window.clearTimeout(id); }, [loadOptions]);
  useEffect(() => { const id = window.setTimeout(() => void loadPrices(marketId, date), 250); return () => window.clearTimeout(id); }, [date, loadPrices, marketId]);

  const filtered = useMemo(() => { const query = search.trim().toLowerCase(); return query ? offerings.filter((item) => `${item.name} ${item.detail} ${item.unit}`.toLowerCase().includes(query)) : offerings; }, [offerings, search]);
  const enteredCount = Object.values(values).filter((value) => Number(value) > 0).length;

  async function savePrices(event: FormEvent) {
    event.preventDefault(); const entered = offerings.filter((offering) => Number(values[offering.id] ?? values[offeringKey(offering)]) > 0);
    if (!marketId || !date || !entered.length) { setError("Choose a market and enter at least one valid price."); return; }
    setIsSaving(true); setError(""); setNotice("");
    try {
      for (const offering of entered) {
        const key = offering.id; const fallbackKey = offeringKey(offering); const current = existing[key] ?? existing[fallbackKey];
        const payload = { productId: offering.productId, productOfferingId: offering.id, marketId, amount: Number(values[key] ?? values[fallbackKey]), currency: "NGN", unit: offering.unit, quantity: offering.quantity, qualityGrade: "standard", source: "market_agent", observedAt: new Date(`${date}T12:00:00`).toISOString() };
        const response = await authenticatedFetch(current ? `${pricesEndpoint}/${current.id}` : pricesEndpoint, { method: current ? "PATCH" : "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(payload) });
        if (!response.ok) throw new Error(await getApiErrorMessage(response, `Unable to save ${offering.name}.`));
      }
      setNotice(`${entered.length} ${entered.length === 1 ? "price" : "prices"} saved successfully.`); await loadPrices(marketId, date);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to save market prices."); }
    finally { setIsSaving(false); }
  }

  const selectedMarket = markets.find((market) => market.id === marketId);
  return <form className="mx-auto max-w-4xl space-y-5" onSubmit={savePrices}>
    <header><h1 className="text-3xl font-black text-black">Update Market Prices</h1><p className="mt-2 text-sm font-medium text-black/55">Choose a market and date, then enter today&apos;s prices.</p></header>
    <section className="grid gap-4 rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:grid-cols-2">
      <label className="text-xs font-black text-black/60"><span className="flex items-center gap-2"><MapPin size={16} className="text-[#f10606]" />Market</span><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]" value={marketId} onChange={(event) => setMarketId(event.target.value)}>{markets.map((market) => <option key={market.id} value={market.id}>{market.name}</option>)}</select>{selectedMarket?.address ? <span className="mt-2 block text-[10px] font-medium text-black/40">{selectedMarket.address}</span> : null}</label>
      <label className="text-xs font-black text-black/60"><span className="flex items-center gap-2"><CalendarDays size={16} className="text-[#f10606]" />Price date</span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]" type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
    </section>
    {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}{notice ? <p className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700" role="status"><CheckCircle2 size={17} />{notice}</p> : null}
    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm"><div className="border-b border-black/10 bg-[#fff5f5] p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" size={17} /><input className="h-11 w-full rounded-xl border border-black/10 bg-white pl-10 pr-4 text-sm outline-none focus:border-[#f10606]" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a product..." /></div></div>
      {isLoading || isPricesLoading ? <div className="flex justify-center py-16"><LoaderCircle className="animate-spin text-[#f10606]" size={28} /></div> : filtered.length ? <div className="divide-y divide-black/10">{filtered.map((offering) => { const fallbackKey = offeringKey(offering); const value = values[offering.id] ?? values[fallbackKey] ?? ""; return <label className="grid gap-3 p-4 sm:grid-cols-[1fr_210px] sm:items-center" key={offering.id}><span className="min-w-0"><span className="block text-sm font-black text-black">{offering.name}</span><span className="mt-1 block text-xs font-medium text-black/45">{offering.detail || "Standard offering"} · {offering.quantity} {offering.unit}</span></span><span className="relative block"><span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-black/40">₦</span><input aria-label={`${offering.name} price`} className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] pl-9 pr-4 text-lg font-black outline-none focus:border-[#f10606] focus:bg-white" inputMode="decimal" min="0" step="0.01" type="number" value={value} onChange={(event) => setValues((current) => ({ ...current, [offering.id]: event.target.value }))} placeholder="0" /></span></label>; })}</div> : <p className="py-16 text-center text-sm font-bold text-black/45">No offerings found.</p>}
    </section>
    <div className="sticky bottom-4 z-10"><button className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#f10606] text-base font-black text-white shadow-[0_18px_35px_rgba(241,6,6,0.28)] disabled:opacity-50" disabled={isSaving || isLoading || !enteredCount} type="submit">{isSaving ? <LoaderCircle className="animate-spin" size={20} /> : <Save size={20} />}Save {enteredCount || "entered"} {enteredCount === 1 ? "price" : "prices"}</button></div>
  </form>;
}

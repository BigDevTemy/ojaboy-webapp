"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Package,
  RefreshCw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { authenticatedFetch } from "@/lib/authClient";
import { API_BASE_URL, DAILY_MARKET_TRENDS } from "@/Serverurls";

type MarketAnalysisItem = {
  id: string;
  productName: string;
  variantName?: string;
  brandName?: string;
  packageName?: string;
  currentPrice: number;
  previousPrice?: number;
  changePercentage: number;
  trend: string;
  currency: string;
  observationCount: number;
  lastPriceAt?: string;
};

type MarketAnalysis = {
  analysisDate?: string;
  completedAt?: string;
  items: MarketAnalysisItem[];
};

const marketAnalysisEndpoint = `${API_BASE_URL}${DAILY_MARKET_TRENDS}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return (typeof value === "string" || typeof value === "number") && String(value).trim()
    ? String(value).trim()
    : "";
}

function readNumber(record: Record<string, unknown>, key: string) {
  const value = Number(record[key]);
  return Number.isFinite(value) ? value : undefined;
}

function parseMarketAnalysis(body: unknown): MarketAnalysis {
  if (!isRecord(body) || !isRecord(body.snapshot)) {
    return { items: [] };
  }

  const snapshot = body.snapshot;
  const values = Array.isArray(snapshot.items) ? snapshot.items : [];
  const items = values.flatMap((value): MarketAnalysisItem[] => {
    if (!isRecord(value)) {
      return [];
    }

    const id = readText(value, "id");
    const productName = readText(value, "productName");
    const currentPrice = readNumber(value, "currentPrice");

    if (!id || !productName || currentPrice === undefined) {
      return [];
    }

    return [{
      id,
      productName,
      variantName: readText(value, "variantName") || undefined,
      brandName: readText(value, "brandName") || undefined,
      packageName: readText(value, "packageName") || undefined,
      currentPrice,
      previousPrice: readNumber(value, "previousPrice"),
      changePercentage: readNumber(value, "changePercentage") ?? 0,
      trend: readText(value, "trend").toLowerCase(),
      currency: readText(value, "currency") || "NGN",
      observationCount: readNumber(value, "observationCount") ?? 0,
      lastPriceAt: readText(value, "lastPriceAt") || undefined,
    }];
  });

  return {
    analysisDate: readText(snapshot, "analysisDate") || undefined,
    completedAt: readText(snapshot, "completedAt") || undefined,
    items,
  };
}

function formatMoney(value: number, currency: string) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string, includeTime = false) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";

  return new Intl.DateTimeFormat("en-NG", includeTime
    ? { dateStyle: "medium", timeStyle: "short" }
    : { dateStyle: "long" }).format(date);
}

async function fetchMarketAnalysis() {
  const response = await authenticatedFetch(marketAnalysisEndpoint, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Unable to load market analysis (${response.status}).`);
  }

  return parseMarketAnalysis((await response.json()) as unknown);
}

export function CustomerMobileMarketWatch() {
  const [analysis, setAnalysis] = useState<MarketAnalysis>({ items: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalysis = useCallback(async () => {
    try {
      setAnalysis(await fetchMarketAnalysis());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load market analysis.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    void fetchMarketAnalysis()
      .then((result) => {
        if (!isCancelled) setAnalysis(result);
      })
      .catch((loadError: unknown) => {
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load market analysis.");
        }
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  function retryAnalysis() {
    setIsLoading(true);
    setError("");
    void loadAnalysis();
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 animate-pulse rounded-2xl bg-black/[0.05]" />
        {[0, 1, 2].map((item) => (
          <div className="h-48 animate-pulse rounded-2xl bg-black/[0.05]" key={item} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center">
        <p className="text-sm font-black text-red-700">Market analysis could not be loaded</p>
        <p className="mt-2 text-xs font-medium text-red-700/75">{error}</p>
        <button className="mx-auto mt-4 flex h-10 items-center gap-2 rounded-xl bg-red-700 px-4 text-xs font-black text-white" type="button" onClick={retryAnalysis}>
          <RefreshCw size={14} /> Try again
        </button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[#f10606] p-5 text-white shadow-[0_16px_35px_rgba(241,6,6,0.2)]">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/70">Latest snapshot</p>
        <h2 className="mt-2 text-xl font-black">Daily market analysis</h2>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-bold text-white/85">
          <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {formatDate(analysis.analysisDate)}</span>
          {analysis.completedAt ? <span className="flex items-center gap-1.5"><Clock3 size={14} /> Updated {formatDate(analysis.completedAt, true)}</span> : null}
        </div>
      </section>

      {analysis.items.length ? (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {analysis.items.map((item) => {
            const isUp = item.trend === "up";
            const isDown = item.trend === "down";
            const trendTone = isUp ? "text-[#f10606]" : isDown ? "text-emerald-700" : "text-black/50";

            return (
              <article className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-[0_10px_25px_rgba(0,0,0,0.04)]" key={item.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-black text-black">{item.productName}</h3>
                    <p className="mt-1 text-[10px] font-bold leading-4 text-black/45">{[item.variantName, item.brandName].filter(Boolean).join(" · ") || "Standard offering"}</p>
                  </div>
                  {item.packageName ? <span className="shrink-0 rounded-lg bg-black/[0.04] px-2 py-1 text-[9px] font-black text-black/55">{item.packageName}</span> : null}
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-black/[0.03] p-3">
                    <p className="text-[9px] font-black uppercase text-black/40">Current price</p>
                    <p className="mt-1 text-base font-black text-black">{formatMoney(item.currentPrice, item.currency)}</p>
                  </div>
                  <div className="rounded-xl bg-black/[0.03] p-3">
                    <p className="text-[9px] font-black uppercase text-black/40">Previous price</p>
                    <p className="mt-1 text-base font-black text-black">{item.previousPrice === undefined ? "N/A" : formatMoney(item.previousPrice, item.currency)}</p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-3 border-t border-black/[0.06] pt-3">
                  <span className={`flex items-center gap-1 text-xs font-black ${trendTone}`}>
                    {isUp ? <TrendingUp size={15} /> : isDown ? <TrendingDown size={15} /> : null}
                    {Math.abs(item.changePercentage).toFixed(2)}% {isUp ? "increase" : isDown ? "decrease" : "change"}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-black/40"><Package size={13} /> {item.observationCount} observation{item.observationCount === 1 ? "" : "s"}</span>
                </div>
                {item.lastPriceAt ? <p className="mt-3 text-[9px] font-bold text-black/35">Last price recorded {formatDate(item.lastPriceAt, true)}</p> : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-black/15 bg-white p-8 text-center">
          <TrendingUp className="mx-auto text-[#f10606]" size={26} />
          <p className="mt-3 text-sm font-black text-black">No market analysis available</p>
          <p className="mt-1 text-xs font-medium text-black/45">The latest snapshot does not contain any items yet.</p>
        </section>
      )}
    </div>
  );
}

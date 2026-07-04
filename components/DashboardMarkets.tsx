"use client";

import {
  Eye,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { API_BASE_URL, MARKETS_URL } from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";

type Market = {
  id: string;
  name: string;
  address?: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

type MarketForm = {
  name: string;
  address: string;
  status: string;
};

const marketsEndpoint = `${API_BASE_URL}${MARKETS_URL}`;
const emptyForm: MarketForm = { name: "", address: "", status: "active" };

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

function unwrap(body: unknown): unknown {
  if (!isRecord(body)) return body;
  const value = body.market ?? body.markets ?? body.results ?? body.data;
  return value === undefined ? body : unwrap(value);
}

function parseMarket(value: unknown): Market | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const name = readText(value, ["marketname", "marketName", "name"]);
  if (!id || !name) return null;
  return {
    id,
    name,
    address: readText(value, ["marketaddress", "marketAddress", "address"]) || undefined,
    status: readText(value, ["status"]) || "active",
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseMarkets(body: unknown) {
  const value = unwrap(body);
  const list = Array.isArray(value) ? value : [value];
  return list.flatMap((item) => {
    const market = parseMarket(item);
    return market ? [market] : [];
  });
}

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function DashboardMarkets() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<MarketForm>(emptyForm);
  const [editingId, setEditingId] = useState("");
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadMarkets = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await authenticatedFetch(marketsEndpoint, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load markets (${response.status}).`));
      }
      setMarkets(parseMarkets(body));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load markets.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadMarkets(), 0);
    return () => clearTimeout(timer);
  }, [loadMarkets]);

  const filteredMarkets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return markets;
    return markets.filter((market) =>
      `${market.name} ${market.address ?? ""}`.toLowerCase().includes(query),
    );
  }, [markets, search]);

  function openCreate() {
    setEditingId("");
    setForm(emptyForm);
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  function openEdit(market: Market) {
    setEditingId(market.id);
    setForm({ name: market.name, address: market.address ?? "", status: market.status });
    setError("");
    setNotice("");
    setIsFormOpen(true);
  }

  async function submitMarket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const address = form.address.trim();
    if (!name || !address) {
      setError("Market name and address are required.");
      return;
    }
    if (
      markets.some(
        (market) =>
          market.id !== editingId && market.name.trim().toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("A market with this name already exists.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(
        editingId ? `${marketsEndpoint}/${editingId}` : marketsEndpoint,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            marketname: name,
            marketaddress: address,
            status: form.status,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(
          responseMessage(
            body,
            `Unable to ${editingId ? "update" : "create"} market (${response.status}).`,
          ),
        );
      }
      setIsFormOpen(false);
      setNotice(`Market ${editingId ? "updated" : "created"} successfully.`);
      await loadMarkets();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save market.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadMarketDetails(id: string) {
    setBusyAction(`view-${id}`);
    setError("");
    try {
      const response = await authenticatedFetch(`${marketsEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load market (${response.status}).`));
      }
      const value = unwrap(body);
      const market = parseMarket(Array.isArray(value) ? value[0] : value);
      if (!market) throw new Error("The market response was not in the expected format.");
      setSelectedMarket(market);
      setMarkets((current) => current.map((item) => (item.id === market.id ? market : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load market.");
    } finally {
      setBusyAction("");
    }
  }

  async function deleteMarket(market: Market) {
    if (!window.confirm(`Delete "${market.name}"? This cannot be undone.`)) return;
    setBusyAction(`delete-${market.id}`);
    setError("");
    setNotice("");
    try {
      const response = await authenticatedFetch(`${marketsEndpoint}/${market.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to delete market (${response.status}).`));
      }
      setMarkets((current) => current.filter((item) => item.id !== market.id));
      setNotice("Market deleted.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete market.");
    } finally {
      setBusyAction("");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-black">Markets</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Create and manage markets used for catalogue price observations.
          </p>
        </div>
        <button className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white" type="button" onClick={openCreate}>
          <Plus size={17} />
          Add market
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric label="Total markets" value={markets.length} />
        <Metric label="Matching search" value={filteredMarkets.length} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
            <input className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40" placeholder="Search market or address..." value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
          <button className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65" type="button" onClick={() => void loadMarkets()}>
            <RefreshCw className={isLoading ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="grid grid-cols-[1fr_1.35fr_0.55fr_0.65fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
          <span>Market</span><span>Address</span><span>Status</span><span>Updated</span><span className="text-right">Actions</span>
        </div>
        {isLoading ? (
          <div className="space-y-3 p-5">{[0, 1, 2, 3].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>
        ) : filteredMarkets.length ? (
          filteredMarkets.map((market) => (
            <article className="grid grid-cols-[1fr_1.35fr_0.55fr_0.65fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={market.id}>
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]"><Store size={18} /></span>
                <div className="min-w-0"><p className="truncate text-sm font-black text-black">{market.name}</p><p className="mt-1 truncate text-[10px] font-bold text-black/40">{market.id}</p></div>
              </div>
              <p className="flex min-w-0 items-center gap-1 truncate text-xs font-medium text-black/58"><MapPin className="shrink-0" size={13} />{market.address || "No address"}</p>
              <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${market.status.toLowerCase() === "active" ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/50"}`}>
                {market.status.charAt(0).toUpperCase() + market.status.slice(1)}
              </span>
              <p className="text-xs font-bold text-black/45">{formatDate(market.updatedAt || market.createdAt)}</p>
              <div className="flex justify-end gap-2">
                <ActionButton label={`View ${market.name}`} busy={busyAction === `view-${market.id}`} onClick={() => void loadMarketDetails(market.id)}><Eye size={15} /></ActionButton>
                <ActionButton label={`Edit ${market.name}`} onClick={() => openEdit(market)}><Pencil size={15} /></ActionButton>
                <ActionButton label={`Delete ${market.name}`} busy={busyAction === `delete-${market.id}`} onClick={() => void deleteMarket(market)}><Trash2 size={15} /></ActionButton>
              </div>
            </article>
          ))
        ) : (
          <div className="p-9 text-center"><Store className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black text-black">No markets found</p></div>
        )}
      </section>

      {isFormOpen ? (
        <Modal title={editingId ? "Edit market" : "Add market"} onClose={() => !isSubmitting && setIsFormOpen(false)}>
          <form className="space-y-4" onSubmit={submitMarket}>
            <label className="block"><span className="text-xs font-black text-black">Market name *</span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Mile 12 Market" /></label>
            <label className="block"><span className="text-xs font-black text-black">Market address *</span><textarea className="mt-2 min-h-28 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="Kosofe, Lagos" /></label>
            <label className="block"><span className="text-xs font-black text-black">Status *</span><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={isSubmitting} type="submit">{isSubmitting ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{isSubmitting ? "Saving..." : editingId ? "Update market" : "Create market"}</button>
          </form>
        </Modal>
      ) : null}

      {selectedMarket ? (
        <Modal title={selectedMarket.name} onClose={() => setSelectedMarket(null)}>
          <div className="space-y-3">
            <Detail label="Market ID" value={selectedMarket.id} />
            <Detail label="Address" value={selectedMarket.address || "No address provided."} />
            <Detail label="Status" value={selectedMarket.status.charAt(0).toUpperCase() + selectedMarket.status.slice(1)} />
            <div className="grid grid-cols-2 gap-3"><Detail label="Created" value={formatDate(selectedMarket.createdAt)} /><Detail label="Updated" value={formatDate(selectedMarket.updatedAt)} /></div>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]"><p className="text-xs font-black uppercase text-black/45">{label}</p><p className="mt-2 text-2xl font-black text-black">{value}</p></section>;
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : children}</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section aria-modal="true" className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog">
        <header className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-[#f10606]">Market management</p><h2 className="mt-1 text-lg font-black text-black">{title}</h2></div><button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={onClose}><X size={18} /></button></header>
        {children}
      </section>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#fafafa] p-4"><p className="text-[10px] font-black uppercase text-black/40">{label}</p><p className="mt-1 break-words text-sm font-bold text-black/70">{value}</p></div>;
}

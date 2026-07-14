"use client";

import {
  CalendarOff,
  Eye,
  LoaderCircle,
  MapPinned,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  API_BASE_URL,
  DELIVERY_AREAS_URL,
  DELIVERY_BLACKOUTS_URL,
  DELIVERY_ZONES_URL,
} from "@/Serverurls";
import { authenticatedFetch } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

type DeliveryZone = {
  id: string;
  name: string;
  description?: string;
  deliveryCost: number;
  isActive: boolean;
  cutoffTime?: string;
  sameDayAllowed: boolean;
  nextAvailableOffsetDays: number;
  createdAt?: string;
  updatedAt?: string;
};

type DeliveryArea = {
  id: string;
  deliveryZoneId: string;
  deliveryZoneName?: string;
  name: string;
  aliases: string[];
  locality: string;
  state: string;
  country: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

type ZoneForm = {
  name: string;
  description: string;
  deliveryCost: string;
  isActive: boolean;
  cutoffTime: string;
  sameDayAllowed: boolean;
  nextAvailableOffsetDays: string;
};

type AreaForm = {
  deliveryZoneId: string;
  name: string;
  aliases: string;
  locality: string;
  state: string;
  country: string;
  isActive: boolean;
};

type DeliveryBlackout = {
  id: string;
  date: string;
  deliveryZoneId?: string;
  deliveryZoneName?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BlackoutForm = {
  date: string;
  deliveryZoneId: string;
  startTime: string;
  endTime: string;
  reason: string;
};

const zonesEndpoint = `${API_BASE_URL}${DELIVERY_ZONES_URL}`;
const areasEndpoint = `${API_BASE_URL}${DELIVERY_AREAS_URL}`;
const blackoutsEndpoint = `${API_BASE_URL}${DELIVERY_BLACKOUTS_URL}`;
const emptyZoneForm: ZoneForm = {
  name: "",
  description: "",
  deliveryCost: "",
  isActive: true,
  cutoffTime: "",
  sameDayAllowed: true,
  nextAvailableOffsetDays: "1",
};
const emptyAreaForm: AreaForm = {
  deliveryZoneId: "",
  name: "",
  aliases: "",
  locality: "",
  state: "",
  country: "Nigeria",
  isActive: true,
};
const emptyBlackoutForm: BlackoutForm = {
  date: "",
  deliveryZoneId: "",
  startTime: "",
  endTime: "",
  reason: "",
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function parseZone(value: unknown): DeliveryZone | null {
  if (!isRecord(value)) return null;
  const id = readText(value, ["id"]);
  const name = readText(value, ["name"]);
  const deliveryCost = readNumber(value, ["deliveryCost", "cost"]);
  if (!id || !name || deliveryCost === undefined) return null;
  return {
    id,
    name,
    description: readText(value, ["description"]) || undefined,
    deliveryCost,
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    cutoffTime: readText(value, ["cutoffTime"]) || undefined,
    sameDayAllowed: typeof value.sameDayAllowed === "boolean" ? value.sameDayAllowed : true,
    nextAvailableOffsetDays: readNumber(value, ["nextAvailableOffsetDays"]) ?? 1,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseArea(value: unknown): DeliveryArea | null {
  if (!isRecord(value)) return null;
  const zone = isRecord(value.deliveryZone)
    ? value.deliveryZone
    : isRecord(value.zone)
      ? value.zone
      : null;
  const id = readText(value, ["id"]);
  const name = readText(value, ["name"]);
  const deliveryZoneId =
    readText(value, ["deliveryZoneId", "zoneId"]) || (zone ? readText(zone, ["id"]) : "");
  if (!id || !name || !deliveryZoneId) return null;
  return {
    id,
    deliveryZoneId,
    deliveryZoneName:
      (zone ? readText(zone, ["name"]) : "") ||
      readText(value, ["deliveryZoneName", "zoneName"]) ||
      undefined,
    name,
    aliases: Array.isArray(value.aliases)
      ? value.aliases.filter((item): item is string => typeof item === "string")
      : [],
    locality: readText(value, ["locality"]),
    state: readText(value, ["state"]),
    country: readText(value, ["country"]) || "Nigeria",
    isActive: typeof value.isActive === "boolean" ? value.isActive : true,
    createdAt: readText(value, ["createdAt"]) || undefined,
    updatedAt: readText(value, ["updatedAt"]) || undefined,
  };
}

function parseBlackout(value: unknown): DeliveryBlackout | null {
  if (!isRecord(value)) return null;
  const zone = isRecord(value.deliveryZone)
    ? value.deliveryZone
    : isRecord(value.zone)
      ? value.zone
      : null;
  const id = readText(value, ["id"]);
  const date = readText(value, ["date"]);
  if (!id || !date) return null;
  const deliveryZoneId =
    readText(value, ["deliveryZoneId", "zoneId"]) || (zone ? readText(zone, ["id"]) : "");
  return {
    id,
    date,
    deliveryZoneId: deliveryZoneId || undefined,
    deliveryZoneName:
      (zone ? readText(zone, ["name"]) : "") ||
      readText(value, ["deliveryZoneName", "zoneName"]) ||
      undefined,
    startTime: readText(value, ["startTime"]) || undefined,
    endTime: readText(value, ["endTime"]) || undefined,
    reason: readText(value, ["reason"]) || undefined,
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

function responseMessage(body: unknown, fallback: string) {
  if (!isRecord(body)) return fallback;
  const message = body.message;
  if (Array.isArray(message)) {
    return message.filter((item): item is string => typeof item === "string").join(" ");
  }
  return typeof message === "string" && message.trim() ? message : fallback;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-NG", { dateStyle: "medium" }).format(date);
}

export function DashboardDeliveryCoverage() {
  const session = useAuthSession();
  const isCustomer = session?.user.role?.trim().toLowerCase() === "user";
  const [activeTab, setActiveTab] = useState<"zones" | "areas" | "blackouts">("zones");
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [areas, setAreas] = useState<DeliveryArea[]>([]);
  const [blackouts, setBlackouts] = useState<DeliveryBlackout[]>([]);
  const [search, setSearch] = useState("");
  const [blackoutZoneFilter, setBlackoutZoneFilter] = useState("");
  const [blackoutFrom, setBlackoutFrom] = useState(() => toDateInputValue(new Date()));
  const [blackoutTo, setBlackoutTo] = useState(() =>
    toDateInputValue(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)),
  );
  const [zoneForm, setZoneForm] = useState<ZoneForm>(emptyZoneForm);
  const [areaForm, setAreaForm] = useState<AreaForm>(emptyAreaForm);
  const [blackoutForm, setBlackoutForm] = useState<BlackoutForm>(emptyBlackoutForm);
  const [editingId, setEditingId] = useState("");
  const [formType, setFormType] = useState<"zone" | "area" | "blackout" | null>(null);
  const [selectedZone, setSelectedZone] = useState<DeliveryZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlackoutsLoading, setIsBlackoutsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadCoverage = useCallback(async () => {
    if (isCustomer) return;
    setIsLoading(true);
    setError("");
    const results = await Promise.allSettled([
      authenticatedFetch(zonesEndpoint, { headers: { Accept: "application/json" } }),
      authenticatedFetch(areasEndpoint, { headers: { Accept: "application/json" } }),
    ]);
    try {
      if (results[0].status === "fulfilled") {
        const response = results[0].value;
        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(responseMessage(body, `Unable to load delivery zones (${response.status}).`));
        }
        setZones(parseList(body, ["deliveryZones", "zones", "results"], parseZone));
      } else {
        throw results[0].reason;
      }

      if (results[1].status === "fulfilled") {
        const response = results[1].value;
        const body = (await response.json().catch(() => null)) as unknown;
        if (!response.ok) {
          throw new Error(responseMessage(body, `Unable to load delivery areas (${response.status}).`));
        }
        setAreas(parseList(body, ["deliveryAreas", "areas", "results"], parseArea));
      } else {
        throw results[1].reason;
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load delivery coverage.");
    } finally {
      setIsLoading(false);
    }
  }, [isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadCoverage(), 0);
    return () => clearTimeout(timer);
  }, [loadCoverage]);

  const loadBlackouts = useCallback(async () => {
    if (isCustomer) return;
    setIsBlackoutsLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (blackoutZoneFilter) params.set("deliveryZoneId", blackoutZoneFilter);
      if (blackoutFrom) params.set("from", blackoutFrom);
      if (blackoutTo) params.set("to", blackoutTo);
      const url = params.toString() ? `${blackoutsEndpoint}?${params}` : blackoutsEndpoint;
      const response = await authenticatedFetch(url, { headers: { Accept: "application/json" } });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load delivery blackouts (${response.status}).`));
      }
      setBlackouts(parseList(body, ["deliveryBlackouts", "blackouts", "results"], parseBlackout));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load delivery blackouts.");
    } finally {
      setIsBlackoutsLoading(false);
    }
  }, [blackoutFrom, blackoutTo, blackoutZoneFilter, isCustomer]);

  useEffect(() => {
    const timer = setTimeout(() => void loadBlackouts(), 0);
    return () => clearTimeout(timer);
  }, [loadBlackouts]);

  const filteredZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return zones;
    return zones.filter((zone) =>
      `${zone.name} ${zone.description ?? ""} ${zone.isActive ? "active" : "inactive"}`
        .toLowerCase()
        .includes(query),
    );
  }, [search, zones]);

  const filteredAreas = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return areas;
    return areas.filter((area) =>
      [
        area.name,
        area.aliases.join(" "),
        area.locality,
        area.state,
        area.country,
        area.deliveryZoneName,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [areas, search]);

  function openCreateZone() {
    setEditingId("");
    setZoneForm(emptyZoneForm);
    setFormType("zone");
    setError("");
    setNotice("");
  }

  function openEditZone(zone: DeliveryZone) {
    setEditingId(zone.id);
    setZoneForm({
      name: zone.name,
      description: zone.description ?? "",
      deliveryCost: String(zone.deliveryCost),
      isActive: zone.isActive,
      cutoffTime: zone.cutoffTime ?? "",
      sameDayAllowed: zone.sameDayAllowed,
      nextAvailableOffsetDays: String(zone.nextAvailableOffsetDays),
    });
    setFormType("zone");
    setError("");
    setNotice("");
  }

  function openCreateArea() {
    setEditingId("");
    setAreaForm({ ...emptyAreaForm, deliveryZoneId: zones.find((zone) => zone.isActive)?.id ?? "" });
    setFormType("area");
    setError("");
    setNotice("");
  }

  function openEditArea(area: DeliveryArea) {
    setEditingId(area.id);
    setAreaForm({
      deliveryZoneId: area.deliveryZoneId,
      name: area.name,
      aliases: area.aliases.join(", "),
      locality: area.locality,
      state: area.state,
      country: area.country,
      isActive: area.isActive,
    });
    setFormType("area");
    setError("");
    setNotice("");
  }

  function openCreateBlackout() {
    setEditingId("");
    setBlackoutForm(emptyBlackoutForm);
    setFormType("blackout");
    setError("");
    setNotice("");
  }

  async function submitZone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cutoffTime = zoneForm.cutoffTime.trim();
    const cutoffValid = !cutoffTime || /^([01]\d|2[0-3]):[0-5]\d$/.test(cutoffTime);
    const offsetDaysRaw = zoneForm.nextAvailableOffsetDays.trim();
    const offsetDays = offsetDaysRaw === "" ? 1 : Number(offsetDaysRaw);
    if (
      !zoneForm.name.trim() ||
      zoneForm.deliveryCost.trim() === "" ||
      Number(zoneForm.deliveryCost) <= 0 ||
      !cutoffValid ||
      !Number.isInteger(offsetDays) ||
      offsetDays < 1
    ) {
      setError(
        "Zone name, a delivery cost greater than 0, a valid cutoff time (HH:mm), and a next-available offset of at least 1 day are required.",
      );
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await authenticatedFetch(
        editingId ? `${zonesEndpoint}/${editingId}` : zonesEndpoint,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            name: zoneForm.name.trim(),
            ...(zoneForm.description.trim() ? { description: zoneForm.description.trim() } : {}),
            deliveryCost: Number(zoneForm.deliveryCost),
            isActive: zoneForm.isActive,
            cutoffTime: cutoffTime || null,
            sameDayAllowed: zoneForm.sameDayAllowed,
            nextAvailableOffsetDays: offsetDays,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to save delivery zone (${response.status}).`));
      }
      setFormType(null);
      setNotice(`Delivery zone ${editingId ? "updated" : "created"} successfully.`);
      await loadCoverage();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save delivery zone.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !areaForm.deliveryZoneId ||
      !areaForm.name.trim() ||
      !areaForm.locality.trim() ||
      !areaForm.state.trim() ||
      !areaForm.country.trim()
    ) {
      setError("Zone, area name, locality, state, and country are required.");
      return;
    }
    const aliases = areaForm.aliases
      .split(",")
      .map((alias) => alias.trim())
      .filter(Boolean);
    setIsSubmitting(true);
    setError("");
    try {
      const response = await authenticatedFetch(
        editingId ? `${areasEndpoint}/${editingId}` : areasEndpoint,
        {
          method: editingId ? "PATCH" : "POST",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          body: JSON.stringify({
            deliveryZoneId: areaForm.deliveryZoneId,
            name: areaForm.name.trim(),
            aliases,
            locality: areaForm.locality.trim(),
            state: areaForm.state.trim(),
            country: areaForm.country.trim(),
            isActive: areaForm.isActive,
          }),
        },
      );
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to save delivery area (${response.status}).`));
      }
      setFormType(null);
      setNotice(`Delivery area ${editingId ? "updated" : "created"} successfully.`);
      await loadCoverage();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save delivery area.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitBlackout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    const startTime = blackoutForm.startTime.trim();
    const endTime = blackoutForm.endTime.trim();
    const startValid = !startTime || timePattern.test(startTime);
    const endValid = !endTime || timePattern.test(endTime);
    if (!blackoutForm.date.trim() || !startValid || !endValid) {
      setError("A blackout date is required, and start/end times must be valid HH:mm values.");
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const response = await authenticatedFetch(blackoutsEndpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
          date: blackoutForm.date.trim(),
          ...(blackoutForm.deliveryZoneId ? { deliveryZoneId: blackoutForm.deliveryZoneId } : {}),
          ...(startTime ? { startTime } : {}),
          ...(endTime ? { endTime } : {}),
          ...(blackoutForm.reason.trim() ? { reason: blackoutForm.reason.trim().slice(0, 255) } : {}),
        }),
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to create delivery blackout (${response.status}).`));
      }
      setFormType(null);
      setNotice("Delivery blackout created.");
      await loadBlackouts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to create delivery blackout.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadZoneDetails(id: string) {
    setBusyAction(`view-zone-${id}`);
    setError("");
    try {
      const response = await authenticatedFetch(`${zonesEndpoint}/${id}`, {
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to load delivery zone (${response.status}).`));
      }
      const value = unwrap(body, ["deliveryZone", "zone"]);
      const zone = parseZone(Array.isArray(value) ? value[0] : value);
      if (!zone) throw new Error("The delivery zone response was not in the expected format.");
      setSelectedZone(zone);
      setZones((current) => current.map((item) => (item.id === zone.id ? zone : item)));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load delivery zone.");
    } finally {
      setBusyAction("");
    }
  }

  async function removeItem(type: "zone" | "area" | "blackout", id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusyAction(`delete-${type}-${id}`);
    setError("");
    const endpoint = type === "zone" ? zonesEndpoint : type === "area" ? areasEndpoint : blackoutsEndpoint;
    try {
      const response = await authenticatedFetch(`${endpoint}/${id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      const body = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) {
        throw new Error(responseMessage(body, `Unable to delete delivery ${type} (${response.status}).`));
      }
      if (type === "zone") setZones((current) => current.filter((item) => item.id !== id));
      else if (type === "area") setAreas((current) => current.filter((item) => item.id !== id));
      else setBlackouts((current) => current.filter((item) => item.id !== id));
      setNotice(`Delivery ${type} deleted.`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : `Unable to delete delivery ${type}.`);
    } finally {
      setBusyAction("");
    }
  }

  if (isCustomer) {
    return (
      <section className="mx-auto max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center">
        <MapPinned className="mx-auto text-[#f10606]" size={28} />
        <h1 className="mt-3 text-lg font-black text-black">Delivery coverage is restricted</h1>
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
          <h1 className="text-3xl font-black text-black">Delivery Coverage</h1>
          <p className="mt-2 text-sm font-medium text-black/58">
            Zones set delivery prices; areas define the locations covered by each zone.
          </p>
        </div>
        <button
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#f10606] px-5 text-sm font-black text-white"
          type="button"
          onClick={
            activeTab === "zones" ? openCreateZone : activeTab === "areas" ? openCreateArea : openCreateBlackout
          }
        >
          <Plus size={17} />
          Add {activeTab === "zones" ? "zone" : activeTab === "areas" ? "area" : "blackout"}
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Metric label="Delivery zones" value={zones.length} />
        <Metric label="Delivery areas" value={areas.length} />
        <Metric label="Active areas" value={areas.filter((area) => area.isActive).length} />
        <Metric label="Upcoming blackouts" value={blackouts.length} />
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="grid grid-cols-3 rounded-xl bg-[#fafafa] p-1 lg:w-[26rem]">
            {(["zones", "areas", "blackouts"] as const).map((tab) => (
              <button
                className={`h-10 rounded-lg text-xs font-black ${activeTab === tab ? "bg-white text-[#f10606] shadow-sm" : "text-black/45"}`}
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setSearch("");
                }}
              >
                Delivery {tab}
              </button>
            ))}
          </div>
          {activeTab === "blackouts" ? (
            <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
              <select
                className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                value={blackoutZoneFilter}
                onChange={(event) => setBlackoutZoneFilter(event.target.value)}
              >
                <option value="">All zones</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
              <input
                className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                type="date"
                value={blackoutFrom}
                onChange={(event) => setBlackoutFrom(event.target.value)}
              />
              <input
                className="h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                type="date"
                value={blackoutTo}
                onChange={(event) => setBlackoutTo(event.target.value)}
              />
            </div>
          ) : (
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-black/35" size={18} />
              <input className="h-12 w-full rounded-xl border border-black/10 pl-11 pr-4 text-sm outline-none focus:border-[#f10606]/40" placeholder={`Search delivery ${activeTab}...`} value={search} onChange={(event) => setSearch(event.target.value)} />
            </div>
          )}
          <button
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 px-4 text-sm font-black text-black/65"
            type="button"
            onClick={() => void (activeTab === "blackouts" ? loadBlackouts() : loadCoverage())}
          >
            <RefreshCw className={(activeTab === "blackouts" ? isBlackoutsLoading : isLoading) ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-red-50 px-4 py-3 text-xs font-bold text-red-700">{error}</p> : null}
      {notice ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700">{notice}</p> : null}

      {activeTab === "zones" ? (
        <ZonesTable
          zones={filteredZones}
          loading={isLoading}
          busyAction={busyAction}
          onView={loadZoneDetails}
          onEdit={openEditZone}
          onDelete={(zone) => void removeItem("zone", zone.id, zone.name)}
        />
      ) : activeTab === "areas" ? (
        <AreasTable
          areas={filteredAreas}
          zones={zones}
          loading={isLoading}
          busyAction={busyAction}
          onEdit={openEditArea}
          onDelete={(area) => void removeItem("area", area.id, area.name)}
        />
      ) : (
        <BlackoutsTable
          blackouts={blackouts}
          zones={zones}
          loading={isBlackoutsLoading}
          busyAction={busyAction}
          onDelete={(blackout) =>
            void removeItem(
              "blackout",
              blackout.id,
              `${formatDate(blackout.date)} – ${blackout.deliveryZoneName || "all zones"}`,
            )
          }
        />
      )}

      {formType === "zone" ? (
        <Modal title={editingId ? "Edit delivery zone" : "Add delivery zone"} onClose={() => !isSubmitting && setFormType(null)}>
          <form className="space-y-4" onSubmit={submitZone}>
            <Input label="Zone name" value={zoneForm.name} onChange={(value) => setZoneForm((current) => ({ ...current, name: value }))} placeholder="Lagos Mainland" />
            <label className="block"><span className="text-xs font-black text-black">Description</span><textarea className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45" value={zoneForm.description} onChange={(event) => setZoneForm((current) => ({ ...current, description: event.target.value }))} /></label>
            <Input label="Delivery cost (NGN)" value={zoneForm.deliveryCost} onChange={(value) => setZoneForm((current) => ({ ...current, deliveryCost: value }))} type="number" placeholder="3500" />
            <Input label="Cutoff time" value={zoneForm.cutoffTime} onChange={(value) => setZoneForm((current) => ({ ...current, cutoffTime: value }))} type="time" required={false} hint="Orders placed before this time qualify for same-day delivery. Leave blank for no cutoff." />
            <BooleanSelect label="Same-day allowed" value={zoneForm.sameDayAllowed} onChange={(value) => setZoneForm((current) => ({ ...current, sameDayAllowed: value }))} trueLabel="Allowed" falseLabel="Not allowed" />
            <Input label="Next available offset (days)" value={zoneForm.nextAvailableOffsetDays} onChange={(value) => setZoneForm((current) => ({ ...current, nextAvailableOffsetDays: value }))} type="number" required={false} hint="Days to push the delivery date forward once the cutoff has passed or same-day is disallowed." />
            <BooleanSelect label="Status" value={zoneForm.isActive} onChange={(value) => setZoneForm((current) => ({ ...current, isActive: value }))} />
            <SubmitButton busy={isSubmitting} label={editingId ? "Update zone" : "Create zone"} />
          </form>
        </Modal>
      ) : null}

      {formType === "area" ? (
        <Modal title={editingId ? "Edit delivery area" : "Add delivery area"} onClose={() => !isSubmitting && setFormType(null)}>
          <form className="space-y-4" onSubmit={submitArea}>
            <label className="block"><span className="text-xs font-black text-black">Delivery zone *</span><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" value={areaForm.deliveryZoneId} onChange={(event) => setAreaForm((current) => ({ ...current, deliveryZoneId: event.target.value }))}><option value="">Select zone</option>{zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} · {formatMoney(zone.deliveryCost)}{zone.isActive ? "" : " · Inactive"}</option>)}</select></label>
            <Input label="Area name" value={areaForm.name} onChange={(value) => setAreaForm((current) => ({ ...current, name: value }))} placeholder="Yaba" />
            <Input label="Aliases" value={areaForm.aliases} onChange={(value) => setAreaForm((current) => ({ ...current, aliases: value }))} placeholder="Sabo, Yaba Mainland" hint="Separate multiple aliases with commas." />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Locality" value={areaForm.locality} onChange={(value) => setAreaForm((current) => ({ ...current, locality: value }))} placeholder="Yaba" />
              <Input label="State" value={areaForm.state} onChange={(value) => setAreaForm((current) => ({ ...current, state: value }))} placeholder="Lagos" />
            </div>
            <Input label="Country" value={areaForm.country} onChange={(value) => setAreaForm((current) => ({ ...current, country: value }))} placeholder="Nigeria" />
            <BooleanSelect label="Status" value={areaForm.isActive} onChange={(value) => setAreaForm((current) => ({ ...current, isActive: value }))} />
            <SubmitButton busy={isSubmitting} label={editingId ? "Update area" : "Create area"} />
          </form>
        </Modal>
      ) : null}

      {formType === "blackout" ? (
        <Modal title="Add delivery blackout" onClose={() => !isSubmitting && setFormType(null)}>
          <form className="space-y-4" onSubmit={submitBlackout}>
            <Input label="Date" value={blackoutForm.date} onChange={(value) => setBlackoutForm((current) => ({ ...current, date: value }))} type="date" />
            <label className="block">
              <span className="text-xs font-black text-black">Zone</span>
              <select
                className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45"
                value={blackoutForm.deliveryZoneId}
                onChange={(event) => setBlackoutForm((current) => ({ ...current, deliveryZoneId: event.target.value }))}
              >
                <option value="">All zones (blocks every zone this date)</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start time" value={blackoutForm.startTime} onChange={(value) => setBlackoutForm((current) => ({ ...current, startTime: value }))} type="time" required={false} />
              <Input label="End time" value={blackoutForm.endTime} onChange={(value) => setBlackoutForm((current) => ({ ...current, endTime: value }))} type="time" required={false} />
            </div>
            <p className="rounded-xl bg-[#fff5f5] px-4 py-3 text-[10px] font-bold text-black/50">
              Start/end time are for reference only — any blackout on a date currently blocks the whole day for scheduling, since there is no hourly delivery-slot concept yet.
            </p>
            <label className="block">
              <span className="text-xs font-black text-black">Reason</span>
              <textarea
                className="mt-2 min-h-24 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 py-3 text-sm outline-none focus:border-[#f10606]/45"
                maxLength={255}
                value={blackoutForm.reason}
                onChange={(event) => setBlackoutForm((current) => ({ ...current, reason: event.target.value }))}
                placeholder="Public holiday, warehouse stocktake, etc."
              />
            </label>
            <SubmitButton busy={isSubmitting} label="Create blackout" />
          </form>
        </Modal>
      ) : null}

      {selectedZone ? (
        <Modal title={selectedZone.name} onClose={() => setSelectedZone(null)}>
          <div className="space-y-3">
            <Detail label="Zone ID" value={selectedZone.id} />
            <Detail label="Delivery cost" value={formatMoney(selectedZone.deliveryCost)} />
            <Detail label="Status" value={selectedZone.isActive ? "Active" : "Inactive"} />
            <Detail label="Cutoff time" value={selectedZone.cutoffTime || "No cutoff"} />
            <Detail label="Same-day allowed" value={selectedZone.sameDayAllowed ? "Yes" : "No"} />
            <Detail label="Next available offset" value={`${selectedZone.nextAvailableOffsetDays} day${selectedZone.nextAvailableOffsetDays === 1 ? "" : "s"}`} />
            <Detail label="Description" value={selectedZone.description || "No description provided."} />
            <Detail label="Covered areas" value={areas.filter((area) => area.deliveryZoneId === selectedZone.id).map((area) => area.name).join(", ") || "No areas assigned."} />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}

function ZonesTable({ zones, loading, busyAction, onView, onEdit, onDelete }: { zones: DeliveryZone[]; loading: boolean; busyAction: string; onView: (id: string) => Promise<void>; onEdit: (zone: DeliveryZone) => void; onDelete: (zone: DeliveryZone) => void }) {
  return (
    <TableShell columns="grid-cols-[1.2fr_0.8fr_0.55fr_0.7fr_0.55fr]" headers={["Zone", "Delivery cost", "Status", "Updated", "Actions"]}>
      {loading ? <LoadingRows /> : zones.length ? zones.map((zone) => (
        <article className="grid grid-cols-[1.2fr_0.8fr_0.55fr_0.7fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={zone.id}>
          <div className="min-w-0"><p className="truncate text-sm font-black text-black">{zone.name}</p><p className="mt-1 truncate text-xs font-medium text-black/45">{zone.description || zone.id}</p></div>
          <p className="text-sm font-black text-black">{formatMoney(zone.deliveryCost)}</p>
          <StatusBadge active={zone.isActive} />
          <p className="text-xs font-bold text-black/45">{formatDate(zone.updatedAt || zone.createdAt)}</p>
          <div className="flex justify-end gap-2"><ActionButton label={`View ${zone.name}`} busy={busyAction === `view-zone-${zone.id}`} onClick={() => void onView(zone.id)}><Eye size={15} /></ActionButton><ActionButton label={`Edit ${zone.name}`} onClick={() => onEdit(zone)}><Pencil size={15} /></ActionButton><ActionButton label={`Delete ${zone.name}`} busy={busyAction === `delete-zone-${zone.id}`} onClick={() => onDelete(zone)}><Trash2 size={15} /></ActionButton></div>
        </article>
      )) : <EmptyState label="No delivery zones found" />}
    </TableShell>
  );
}

function AreasTable({ areas, zones, loading, busyAction, onEdit, onDelete }: { areas: DeliveryArea[]; zones: DeliveryZone[]; loading: boolean; busyAction: string; onEdit: (area: DeliveryArea) => void; onDelete: (area: DeliveryArea) => void }) {
  return (
    <TableShell columns="grid-cols-[1.1fr_1fr_1.1fr_0.55fr_0.45fr]" headers={["Area", "Delivery zone", "Location", "Status", "Actions"]}>
      {loading ? <LoadingRows /> : areas.length ? areas.map((area) => {
        const zone = zones.find((item) => item.id === area.deliveryZoneId);
        return (
          <article className="grid grid-cols-[1.1fr_1fr_1.1fr_0.55fr_0.45fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={area.id}>
            <div className="min-w-0"><p className="truncate text-sm font-black text-black">{area.name}</p><p className="mt-1 truncate text-xs font-medium text-black/45">{area.aliases.length ? area.aliases.join(", ") : "No aliases"}</p></div>
            <div><p className="text-xs font-black text-black/70">{area.deliveryZoneName || zone?.name || area.deliveryZoneId}</p><p className="mt-1 text-[10px] font-bold text-[#f10606]">{zone ? formatMoney(zone.deliveryCost) : "Cost unavailable"}</p></div>
            <p className="text-xs font-bold text-black/55">{[area.locality, area.state, area.country].filter(Boolean).join(", ")}</p>
            <StatusBadge active={area.isActive} />
            <div className="flex justify-end gap-2"><ActionButton label={`Edit ${area.name}`} onClick={() => onEdit(area)}><Pencil size={15} /></ActionButton><ActionButton label={`Delete ${area.name}`} busy={busyAction === `delete-area-${area.id}`} onClick={() => onDelete(area)}><Trash2 size={15} /></ActionButton></div>
          </article>
        );
      }) : <EmptyState label="No delivery areas found" />}
    </TableShell>
  );
}

function BlackoutsTable({
  blackouts,
  zones,
  loading,
  busyAction,
  onDelete,
}: {
  blackouts: DeliveryBlackout[];
  zones: DeliveryZone[];
  loading: boolean;
  busyAction: string;
  onDelete: (blackout: DeliveryBlackout) => void;
}) {
  return (
    <TableShell columns="grid-cols-[0.8fr_1fr_0.9fr_1.3fr_0.45fr]" headers={["Date", "Zone", "Window", "Reason", "Actions"]}>
      {loading ? <LoadingRows /> : blackouts.length ? blackouts.map((blackout) => {
        const zone = blackout.deliveryZoneId ? zones.find((item) => item.id === blackout.deliveryZoneId) : null;
        return (
          <article className="grid grid-cols-[0.8fr_1fr_0.9fr_1.3fr_0.45fr] items-center gap-4 border-t border-black/10 px-5 py-4" key={blackout.id}>
            <p className="text-sm font-black text-black">{formatDate(blackout.date)}</p>
            <p className="text-xs font-black text-black/70">{blackout.deliveryZoneId ? blackout.deliveryZoneName || zone?.name || blackout.deliveryZoneId : "All zones"}</p>
            <p className="text-xs font-bold text-black/55">{blackout.startTime || blackout.endTime ? `${blackout.startTime ?? "--"} – ${blackout.endTime ?? "--"}` : "Full day"}</p>
            <p className="truncate text-xs font-medium text-black/50">{blackout.reason || "No reason provided"}</p>
            <div className="flex justify-end gap-2"><ActionButton label={`Delete blackout on ${blackout.date}`} busy={busyAction === `delete-blackout-${blackout.id}`} onClick={() => onDelete(blackout)}><Trash2 size={15} /></ActionButton></div>
          </article>
        );
      }) : <EmptyState icon={CalendarOff} label="No delivery blackouts found" />}
    </TableShell>
  );
}

function TableShell({ headers, columns, children }: { headers: string[]; columns: string; children: React.ReactNode }) {
  return <section className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_14px_35px_rgba(0,0,0,0.04)]"><div className={`grid ${columns} gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50`}>{headers.map((header, index) => <span className={index === headers.length - 1 ? "text-right" : ""} key={header}>{header}</span>)}</div>{children}</section>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]"><p className="text-xs font-black uppercase text-black/45">{label}</p><p className="mt-2 text-2xl font-black text-black">{value}</p></section>;
}

function LoadingRows() {
  return <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div className="h-14 animate-pulse rounded-lg bg-black/[0.04]" key={item} />)}</div>;
}

function EmptyState({ label, icon: Icon = MapPinned }: { label: string; icon?: typeof MapPinned }) {
  return <div className="p-9 text-center"><Icon className="mx-auto text-[#f10606]" size={27} /><p className="mt-3 text-sm font-black text-black">{label}</p></div>;
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${active ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.05] text-black/50"}`}>{active ? "Active" : "Inactive"}</span>;
}

function Input({ label, value, onChange, placeholder, type = "text", hint, required = true }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; hint?: string; required?: boolean }) {
  return <label className="block"><span className="text-xs font-black text-black">{label}{required ? " *" : ""}</span><input className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm outline-none focus:border-[#f10606]/45" min={type === "number" ? "0" : undefined} step={type === "number" ? "any" : undefined} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />{hint ? <span className="mt-1 block text-[10px] font-bold text-black/40">{hint}</span> : null}</label>;
}

function BooleanSelect({ label, value, onChange, trueLabel = "Active", falseLabel = "Inactive" }: { label: string; value: boolean; onChange: (value: boolean) => void; trueLabel?: string; falseLabel?: string }) {
  return <label className="block"><span className="text-xs font-black text-black">{label} *</span><select className="mt-2 h-12 w-full rounded-xl border border-black/10 bg-[#fafafa] px-4 text-sm font-bold outline-none focus:border-[#f10606]/45" value={value ? "true" : "false"} onChange={(event) => onChange(event.target.value === "true")}><option value="true">{trueLabel}</option><option value="false">{falseLabel}</option></select></label>;
}

function SubmitButton({ busy, label }: { busy: boolean; label: string }) {
  return <button className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f10606] text-sm font-black text-white disabled:opacity-60" disabled={busy} type="submit">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <Plus size={17} />}{busy ? "Saving..." : label}</button>;
}

function ActionButton({ label, busy, onClick, children }: { label: string; busy?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button aria-label={label} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 hover:text-[#f10606] disabled:opacity-50" disabled={busy} type="button" onClick={onClick}>{busy ? <LoaderCircle className="animate-spin" size={15} /> : children}</button>;
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/45 backdrop-blur-sm sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section aria-modal="true" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl" role="dialog"><header className="mb-5 flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-[#f10606]">Logistics</p><h2 className="mt-1 text-lg font-black text-black">{title}</h2></div><button aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/[0.04] text-black/55" type="button" onClick={onClose}><X size={18} /></button></header>{children}</section></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl bg-[#fafafa] p-4"><p className="text-[10px] font-black uppercase text-black/40">{label}</p><p className="mt-1 break-words text-sm font-bold text-black/70">{value}</p></div>;
}

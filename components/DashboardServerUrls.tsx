import {
  Activity,
  CalendarDays,
  CheckCircle2,
  Copy,
  Database,
  Edit3,
  Globe2,
  KeyRound,
  Link2,
  LockKeyhole,
  Plus,
  Server,
  Trash2,
} from "lucide-react";

const baseUrls = [
  {
    name: "Production API",
    url: "https://api.ojaboy.com/v1",
    environment: "Production",
    status: "Healthy",
    lastChecked: "2 mins ago",
  },
  {
    name: "Staging API",
    url: "https://staging-api.ojaboy.com/v1",
    environment: "Staging",
    status: "Healthy",
    lastChecked: "14 mins ago",
  },
  {
    name: "Local API",
    url: "http://localhost:5000/api",
    environment: "Development",
    status: "Offline",
    lastChecked: "1 hour ago",
  },
];

const endpoints = [
  { name: "Auth Signup", method: "POST", path: "/auth/signup", base: "Production API", auth: "Public", status: "Active" },
  { name: "Auth Login", method: "POST", path: "/auth/login", base: "Production API", auth: "Public", status: "Active" },
  { name: "Market Prices", method: "GET", path: "/market-prices", base: "Production API", auth: "Bearer", status: "Active" },
  { name: "Create Order", method: "POST", path: "/orders", base: "Production API", auth: "Bearer", status: "Active" },
  { name: "AI Order Parser", method: "POST", path: "/ai/parse-order", base: "Staging API", auth: "Bearer", status: "Testing" },
  { name: "Notifications", method: "GET", path: "/notifications", base: "Production API", auth: "Bearer", status: "Active" },
];

const configStats = [
  { label: "Base URLs", value: "3", icon: Globe2 },
  { label: "Endpoints", value: "18", icon: Link2 },
  { label: "Secure Routes", value: "14", icon: LockKeyhole },
  { label: "Healthy APIs", value: "2/3", icon: Activity },
];

function methodClass(method: string) {
  if (method === "GET") return "bg-[#eaf8ef] text-[#078b39]";
  if (method === "POST") return "bg-[#fff0f0] text-[#f10606]";
  return "bg-[#fbfbfb] text-black/60";
}

export function DashboardServerUrls() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Server URLs</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Manage API base URLs, endpoint paths, auth rules, and environment mappings.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {configStats.map((stat) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={stat.label}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase text-black/48">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-black">{stat.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                <stat.icon size={22} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">Base URLs</h2>
            <p className="mt-1 text-sm font-medium text-black/55">Define environment roots used by endpoint requests.</p>
          </div>
          <button className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <Plus size={17} />
            Add Base URL
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {baseUrls.map((item) => {
            const isHealthy = item.status === "Healthy";

            return (
              <article className="rounded-xl border border-black/10 p-4" key={item.name}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                    <Server size={22} />
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black ${isHealthy ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="text-base font-black text-black">{item.name}</h3>
                <p className="mt-2 break-all rounded-lg bg-[#fbfbfb] p-3 text-xs font-bold leading-5 text-black/62">{item.url}</p>
                <div className="mt-4 flex items-center justify-between text-xs font-bold text-black/45">
                  <span>{item.environment}</span>
                  <span>{item.lastChecked}</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button className="flex h-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Copy ${item.name}`}>
                    <Copy size={15} />
                  </button>
                  <button className="flex h-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Edit ${item.name}`}>
                    <Edit3 size={15} />
                  </button>
                  <button className="flex h-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Delete ${item.name}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">Endpoint Registry</h2>
            <p className="mt-1 text-sm font-medium text-black/55">Map route paths to base URLs, methods, and auth requirements.</p>
          </div>
          <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-black/10 px-5 text-sm font-black text-black/72 transition hover:text-[#f10606]" type="button">
            <Database size={17} />
            Import Schema
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="grid min-w-[920px] grid-cols-[1fr_0.55fr_1.15fr_0.9fr_0.65fr_0.65fr_0.55fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
            <span>Name</span>
            <span>Method</span>
            <span>Path</span>
            <span>Base</span>
            <span>Auth</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="overflow-x-auto">
            {endpoints.map((endpoint) => (
              <div className="grid min-w-[920px] grid-cols-[1fr_0.55fr_1.15fr_0.9fr_0.65fr_0.65fr_0.55fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm" key={`${endpoint.method}-${endpoint.path}`}>
                <p className="font-black text-black">{endpoint.name}</p>
                <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${methodClass(endpoint.method)}`}>{endpoint.method}</span>
                <code className="break-all rounded-lg bg-[#fbfbfb] px-3 py-2 text-xs font-bold text-black/62">{endpoint.path}</code>
                <p className="font-bold text-black/64">{endpoint.base}</p>
                <p className="flex items-center gap-1 font-bold text-black/64">
                  <KeyRound size={14} />
                  {endpoint.auth}
                </p>
                <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${endpoint.status === "Active" ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                  {endpoint.status}
                </span>
                <div className="flex justify-end gap-2">
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Copy ${endpoint.name}`}>
                    <Copy size={15} />
                  </button>
                  <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Edit ${endpoint.name}`}>
                    <Edit3 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[#ffd6d6] bg-[#fff7f7] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#f10606]">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <h2 className="text-base font-black text-black">Suggested Environment Variables</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">
              Keep production secrets outside the client bundle. Store base URLs in server-side env vars, then expose only public-safe values when needed.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

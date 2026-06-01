import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Download,
  FileText,
  LineChart,
  PieChart,
  TrendingUp,
} from "lucide-react";

const insights = [
  {
    title: "Weekly Price Movement",
    description: "Pepper recorded the strongest increase while tomatoes showed the biggest drop.",
    metric: "+15%",
    tone: "up",
    icon: LineChart,
  },
  {
    title: "Best Savings Window",
    description: "Rice and palm oil remain strongest buy candidates before weekend demand rises.",
    metric: "N4,500",
    tone: "down",
    icon: TrendingUp,
  },
  {
    title: "Market Concentration",
    description: "Mile 12 leads best-price coverage for grains and core staples this week.",
    metric: "42%",
    tone: "neutral",
    icon: PieChart,
  },
];

const reports = [
  { name: "Lagos Staples Report", type: "Weekly", date: "May 24, 2025", status: "Ready" },
  { name: "Pepper Volatility Brief", type: "Daily", date: "May 24, 2025", status: "Ready" },
  { name: "Market Basket Savings", type: "Monthly", date: "May 20, 2025", status: "Ready" },
  { name: "Supply Risk Watch", type: "Weekly", date: "May 18, 2025", status: "Draft" },
];

const metrics = [
  { label: "Generated Reports", value: "18" },
  { label: "Tracked Products", value: "42" },
  { label: "Market Signals", value: "126" },
];

export function DashboardReportsInsights() {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Reports & Insights</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Review market signals, price movement reports, and buying recommendations.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.map((metric) => (
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={metric.label}>
            <p className="text-xs font-black uppercase text-black/48">{metric.label}</p>
            <p className="mt-2 text-2xl font-black text-black">{metric.value}</p>
          </section>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {insights.map((insight) => {
          const isUp = insight.tone === "up";
          const isDown = insight.tone === "down";

          return (
            <article className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]" key={insight.title}>
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                  <insight.icon size={22} />
                </div>
                <span className={`flex items-center gap-1 text-sm font-black ${isUp ? "text-[#f10606]" : isDown ? "text-[#0ba64b]" : "text-black"}`}>
                  {insight.metric}
                  {isUp ? <ArrowUpRight size={16} /> : isDown ? <ArrowDownRight size={16} /> : null}
                </span>
              </div>
              <h2 className="text-base font-black text-black">{insight.title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-black/58">{insight.description}</p>
            </article>
          );
        })}
      </div>

      <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black text-black">Report Library</h2>
            <p className="mt-1 text-sm font-medium text-black/55">Download or review generated market intelligence.</p>
          </div>
          <button className="flex h-11 items-center justify-center gap-2 rounded-lg bg-[#f10606] px-5 text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.2)]" type="button">
            <BarChart3 size={17} />
            New Report
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-black/10">
          <div className="grid min-w-[760px] grid-cols-[1.4fr_0.65fr_0.8fr_0.55fr_0.4fr] gap-4 bg-[#fff5f5] px-5 py-4 text-xs font-black uppercase text-black/50">
            <span>Report</span>
            <span>Type</span>
            <span>Date</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          <div className="overflow-x-auto">
            {reports.map((report) => (
              <div className="grid min-w-[760px] grid-cols-[1.4fr_0.65fr_0.8fr_0.55fr_0.4fr] items-center gap-4 border-t border-black/10 px-5 py-4 text-sm" key={report.name}>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#fff0f0] text-[#f10606]">
                    <FileText size={18} />
                  </div>
                  <p className="font-black text-black">{report.name}</p>
                </div>
                <p className="font-bold text-black/64">{report.type}</p>
                <p className="font-bold text-black/64">{report.date}</p>
                <span className={`w-max rounded-full px-3 py-1 text-[10px] font-black ${report.status === "Ready" ? "bg-[#eaf8ef] text-[#078b39]" : "bg-[#fff0f0] text-[#f10606]"}`}>
                  {report.status}
                </span>
                <button className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/62 transition hover:text-[#f10606]" type="button" aria-label={`Download ${report.name}`}>
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

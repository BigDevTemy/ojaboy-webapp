"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type TrendRange = "7 Days" | "30 Days" | "3 Months";

const rangeOptions: Array<{ label: TrendRange; days: number; minWidth: number }> = [
  { label: "7 Days", days: 7, minWidth: 620 },
  { label: "30 Days", days: 30, minWidth: 1360 },
  { label: "3 Months", days: 90, minWidth: 2400 },
];

const lines = [
  { key: "rice", name: "Rice", color: "#f10606" },
  { key: "tomatoes", name: "Tomatoes", color: "#0ba64b" },
  { key: "pepper", name: "Pepper", color: "#ff8a00" },
  { key: "beans", name: "Beans", color: "#7b3fc8" },
  { key: "palmOil", name: "Palm Oil", color: "#1f6ff2" },
] as const;

function buildTrendData(days: number) {
  const today = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));

    return {
      date: formatter.format(date),
      rice: Math.round(81 + Math.sin(index / 5) * 3 + (index % 9 === 0 ? 2 : 0)),
      tomatoes: Math.round(58 + Math.sin(index / 4) * 7 - (index % 13 === 0 ? 5 : 0)),
      pepper: Math.round(31 + Math.sin(index / 3) * 6 + (index % 10 === 0 ? 3 : 0)),
      beans: Math.round(18 + Math.sin(index / 6) * 2),
      palmOil: Math.round(15 + Math.sin(index / 7) * 1.5),
    };
  });
}

export function DashboardPriceTrendsPanel() {
  const [activeRange, setActiveRange] = useState<TrendRange>("7 Days");
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRange = rangeOptions.find((range) => range.label === activeRange) ?? rangeOptions[0];
  const trendData = useMemo(() => buildTrendData(selectedRange.days), [selectedRange.days]);

  useEffect(() => {
    const scrollArea = scrollRef.current;

    if (!scrollArea) {
      return;
    }

    scrollArea.scrollTo({ left: scrollArea.scrollWidth, behavior: "smooth" });
  }, [activeRange]);

  return (
    <section className="rounded-xl border border-black/10 bg-white p-4 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h2 className="text-sm font-black text-black">Price Trends</h2>
        <div className="flex rounded-full bg-white text-xs font-bold text-black/58">
          {rangeOptions.map((range) => {
            const isActive = range.label === activeRange;

            return (
              <button
                className={`h-8 rounded-full px-4 transition ${
                  isActive
                    ? "bg-white text-[#f10606] shadow-[0_8px_20px_rgba(241,6,6,0.18)]"
                    : "hover:text-[#f10606]"
                }`}
                key={range.label}
                onClick={() => setActiveRange(range.label)}
                type="button"
              >
                {range.label}
              </button>
            );
          })}
        </div>
      </div>

      <div ref={scrollRef} className="dashboard-chart-scroll overflow-x-auto overflow-y-hidden pb-3">
        <div className="h-[150px]" style={{ minWidth: selectedRange.minWidth }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 6, right: 18, bottom: 0, left: -22 }}>
              <CartesianGrid stroke="#00000014" vertical={false} />
              <XAxis
                dataKey="date"
                axisLine={false}
                interval={activeRange === "7 Days" ? 0 : activeRange === "30 Days" ? 2 : 8}
                tickLine={false}
                tick={{ fill: "rgba(0,0,0,0.56)", fontSize: 10, fontWeight: 700 }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "rgba(0,0,0,0.56)", fontSize: 10, fontWeight: 700 }}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(value) => (value === 0 ? "0" : `${value}K`)}
              />
              <Tooltip
                cursor={{ stroke: "rgba(241,6,6,0.18)", strokeWidth: 1 }}
                contentStyle={{
                  border: "1px solid rgba(0,0,0,0.1)",
                  borderRadius: 8,
                  boxShadow: "0 12px 24px rgba(0,0,0,0.08)",
                  fontSize: 11,
                  fontWeight: 700,
                }}
                formatter={(value, name) => [`N${value}K`, String(name)]}
              />
              {lines.map((line) => (
                <Line
                  activeDot={{ r: 4 }}
                  dataKey={line.key}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  key={line.key}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2.4}
                  type="monotone"
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2">
        {lines.map((item) => (
          <div className="flex items-center gap-2 text-xs font-bold text-black/72" key={item.key}>
            <span className="h-1.5 w-5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.name}
          </div>
        ))}
      </div>
    </section>
  );
}

"use client";

import { DashboardMarketPrices } from "@/components/DashboardMarketPrices";
import { MarketAgentMarketPrices } from "@/components/MarketAgentMarketPrices";
import { useAuthSession } from "@/lib/useAuthSession";

export function DashboardMarketPricesByRole() {
  const role = (useAuthSession()?.user.role || "").replace(/[\s_-]/g, "").toLowerCase();
  return role === "marketagent" ? <MarketAgentMarketPrices /> : <DashboardMarketPrices />;
}

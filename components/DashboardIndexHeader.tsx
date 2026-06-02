"use client";

import { CalendarDays } from "lucide-react";
import { DashboardCreateOrderModal } from "@/components/DashboardCreateOrderModal";
import { useAuthSession } from "@/lib/useAuthSession";

function getFirstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function DashboardIndexHeader() {
  const session = useAuthSession();
  const firstName = session?.user.fullName ? getFirstName(session.user.fullName) : "";

  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-black tracking-normal text-black">
          {firstName ? `Good morning, ${firstName}!` : "Good morning!"}
        </h1>
        <p className="mt-2 text-sm font-medium text-black/58">Here&apos;s what&apos;s happening in the market today.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          May 24, 2025
        </div>
        <DashboardCreateOrderModal />
      </div>
    </div>
  );
}

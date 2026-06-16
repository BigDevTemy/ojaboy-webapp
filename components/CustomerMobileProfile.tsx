"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  LogOut,
  Mail,
  MapPin,
  Settings,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { logout } from "@/lib/authClient";
import { useAuthSession } from "@/lib/useAuthSession";

export function CustomerMobileProfile() {
  const router = useRouter();
  const user = useAuthSession()?.user;
  const displayName = user?.fullName || "Ojaboy customer";
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <div className="space-y-5 pb-4">
      <section className="rounded-[1.4rem] bg-[#f10606] p-5 text-white shadow-[0_18px_38px_rgba(241,6,6,0.2)]">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-lg font-black text-[#f10606]">
            {initial}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black">{displayName}</h2>
            <p className="mt-1 truncate text-xs font-medium text-white/75">
              {user?.email || "Customer account"}
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <ProfileRow
          href="/dashboard/settings"
          icon={Settings}
          label="Account settings"
        />
        <ProfileRow
          href="/dashboard/addresses"
          icon={MapPin}
          label="Delivery addresses"
        />
        <ProfileRow
          href="/dashboard/notifications"
          icon={Mail}
          label="Notifications"
        />
        <ProfileRow
          href="/dashboard/support"
          icon={ShieldCheck}
          label="Help and support"
        />
      </section>

      <button
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white text-sm font-black text-[#f10606]"
        type="button"
        onClick={() => void handleLogout()}
      >
        <LogOut size={17} />
        Log out
      </button>
    </div>
  );
}

function ProfileRow({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof UserRound;
  label: string;
}) {
  return (
    <Link
      className="flex h-14 items-center gap-3 border-b border-black/[0.07] px-4 text-sm font-black text-black last:border-b-0"
      href={href}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <ChevronRight className="text-black/30" size={17} />
    </Link>
  );
}

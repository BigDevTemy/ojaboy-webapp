"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  RefreshCw,
  Shield,
  UserRound,
} from "lucide-react";
import { DashboardAddresses } from "@/components/DashboardAddresses";
import { authenticatedFetch } from "@/lib/authClient";
import {
  saveAuthSession,
  type AuthUser,
} from "@/lib/authSession";
import { useAuthSession } from "@/lib/useAuthSession";
import { API_BASE_URL, PROFILE_URL } from "@/Serverurls";

const profileEndpoint = `${API_BASE_URL}${PROFILE_URL}`;

const notificationSettings = [
  { label: "Price drop alerts", enabled: true },
  { label: "Order status updates", enabled: true },
  { label: "Weekly market reports", enabled: false },
  { label: "AI basket suggestions", enabled: true },
];

const securityItems = [
  { label: "Two-factor authentication", value: "Enabled" },
  { label: "Password last changed", value: "12 days ago" },
  { label: "Trusted devices", value: "2 devices" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseProfile(value: unknown): Partial<AuthUser> | null {
  const body = isRecord(value) ? value : null;
  const profileValue = body?.user ?? body?.profile ?? body?.data ?? value;

  if (!isRecord(profileValue)) {
    return null;
  }

  return {
    id: typeof profileValue.id === "string" ? profileValue.id : undefined,
    email: typeof profileValue.email === "string" ? profileValue.email : undefined,
    fullName:
      typeof profileValue.fullName === "string"
        ? profileValue.fullName
        : typeof profileValue.name === "string"
          ? profileValue.name
          : undefined,
    phoneNumber:
      typeof profileValue.phoneNumber === "string"
        ? profileValue.phoneNumber
        : typeof profileValue.phone === "string"
          ? profileValue.phone
          : undefined,
    role: typeof profileValue.role === "string" ? profileValue.role : undefined,
    emailVerified:
      typeof profileValue.emailVerified === "boolean"
        ? profileValue.emailVerified
        : undefined,
    hasAddress:
      typeof profileValue.hasAddress === "boolean"
        ? profileValue.hasAddress
        : undefined,
    hasDefaultAddress:
      typeof profileValue.hasDefaultAddress === "boolean"
        ? profileValue.hasDefaultAddress
        : undefined,
  };
}

export function DashboardSettings() {
  const session = useAuthSession();
  const [profile, setProfile] = useState<Partial<AuthUser> | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const user = session
    ? { ...session.user, ...profile }
    : profile;
  const currentDate = new Intl.DateTimeFormat("en-NG", {
    dateStyle: "medium",
  }).format(new Date());

  async function loadProfile() {
    setIsProfileLoading(true);
    setProfileError("");

    try {
      const response = await authenticatedFetch(profileEndpoint, {
        method: "GET",
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Unable to load profile (${response.status}).`);
      }

      const responseProfile = parseProfile((await response.json()) as unknown);

      if (!responseProfile) {
        throw new Error("The profile response is invalid.");
      }

      setProfile(responseProfile);

      if (session) {
        saveAuthSession({
          ...session,
          user: {
            ...session.user,
            ...responseProfile,
          },
        });
      }
    } catch (requestError) {
      setProfileError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load profile.",
      );
    } finally {
      setIsProfileLoading(false);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    void authenticatedFetch(profileEndpoint, {
      method: "GET",
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Unable to load profile (${response.status}).`);
        }

        const responseProfile = parseProfile((await response.json()) as unknown);

        if (!responseProfile) {
          throw new Error("The profile response is invalid.");
        }

        if (!isCancelled) {
          setProfile(responseProfile);
        }
      })
      .catch((requestError: unknown) => {
        if (!isCancelled) {
          setProfileError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load profile.",
          );
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsProfileLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-normal text-black">Settings</h1>
          <p className="mt-2 text-sm font-medium text-black/58">Manage account preferences, notifications, security, and billing.</p>
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-black/62">
          <CalendarDays size={18} />
          {currentDate}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                <UserRound size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-black">Profile</h2>
                <p className="mt-1 text-sm font-medium text-black/55">
                  Your authenticated account details.
                </p>
              </div>
              <button
                aria-label="Refresh profile"
                className="ml-auto flex h-9 w-9 items-center justify-center rounded-lg border border-black/10 text-black/55 transition hover:text-[#f10606] disabled:opacity-50"
                disabled={isProfileLoading}
                type="button"
                onClick={() => void loadProfile()}
              >
                {isProfileLoading ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <RefreshCw size={16} />
                )}
              </button>
            </div>

            {profileError ? (
              <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">
                {profileError} Showing saved login data where available.
              </p>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Full Name</span>
                <input className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none" readOnly value={user?.fullName ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Email</span>
                <input className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none" readOnly value={user?.email ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Phone</span>
                <input className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none" placeholder="Not provided" readOnly value={user?.phoneNumber ?? ""} />
              </label>
              <label className="block">
                <span className="text-xs font-black uppercase text-black/45">Email Status</span>
                <input className="mt-2 h-11 w-full rounded-lg border border-black/10 bg-black/[0.02] px-4 text-sm font-bold text-black outline-none" readOnly value={user?.emailVerified ? "Verified" : "Not verified"} />
              </label>
            </div>
          </section>

          <DashboardAddresses embedded />

          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
                <Bell size={22} />
              </div>
              <div>
                <h2 className="text-lg font-black text-black">Notifications</h2>
                <p className="mt-1 text-sm font-medium text-black/55">Choose what Ojaboy should notify you about.</p>
              </div>
            </div>

            <div className="space-y-3">
              {notificationSettings.map((item) => (
                <div className="flex items-center justify-between gap-4 rounded-xl border border-black/10 p-4" key={item.label}>
                  <div>
                    <p className="text-sm font-black text-black">{item.label}</p>
                    <p className="mt-1 text-xs font-medium text-black/50">{item.enabled ? "Currently enabled" : "Currently disabled"}</p>
                  </div>
                  <button className={`flex h-7 w-12 items-center rounded-full p-1 transition ${item.enabled ? "justify-end bg-[#f10606]" : "justify-start bg-black/12"}`} type="button" aria-label={`Toggle ${item.label}`}>
                    <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-5">
          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
              <Shield size={22} />
            </div>
            <h2 className="text-base font-black text-black">Security</h2>
            <div className="mt-4 space-y-3">
              {securityItems.map((item) => (
                <div className="flex justify-between gap-3 rounded-lg bg-[#fbfbfb] p-3 text-sm" key={item.label}>
                  <span className="font-bold text-black/55">{item.label}</span>
                  <span className="text-right font-black text-black">{item.value}</span>
                </div>
              ))}
            </div>
            <button className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-black/10 text-sm font-black text-black/72 transition hover:text-[#f10606]" type="button">
              <LockKeyhole size={16} />
              Security Settings
            </button>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#fff0f0] text-[#f10606]">
              <CreditCard size={22} />
            </div>
            <h2 className="text-base font-black text-black">Billing</h2>
            <p className="mt-2 text-sm font-medium leading-6 text-black/58">Free Plan. Upgrade to unlock advanced predictions and reports.</p>
            <button className="mt-4 h-11 w-full rounded-lg bg-[#f10606] text-sm font-black text-white shadow-[0_12px_24px_rgba(241,6,6,0.18)]" type="button">
              Upgrade Plan
            </button>
          </section>

          <section className="rounded-xl border border-black/10 bg-white p-5 shadow-[0_14px_35px_rgba(0,0,0,0.04)]">
            <h2 className="text-base font-black text-black">Contact Preferences</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-[#fbfbfb] p-3 text-sm font-bold text-black/64">
                <Mail size={17} />
                Email first
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-[#fbfbfb] p-3 text-sm font-bold text-black/64">
                <MapPin size={17} />
                Lagos market region
              </div>
            </div>
          </section>
        </aside>
      </div>

    </div>
  );
}

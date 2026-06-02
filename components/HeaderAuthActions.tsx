"use client";

import Link from "next/link";
import { useAuthSession } from "@/lib/useAuthSession";

export function HeaderAuthActions() {
  const session = useAuthSession();

  if (session) {
    return (
      <Link
        className="rounded-lg bg-[#f10606] px-7 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(241,6,6,0.25)]"
        href="/dashboard"
      >
        Dashboard
      </Link>
    );
  }

  return (
    <>
      <Link className="rounded-lg border border-black/10 bg-white/80 px-7 py-3 text-sm font-bold text-black shadow-sm backdrop-blur" href="/login">
        Log in
      </Link>
      <Link className="rounded-lg bg-[#f10606] px-7 py-3 text-sm font-bold text-white shadow-[0_16px_35px_rgba(241,6,6,0.25)]" href="/signup">
        Sign Up
      </Link>
    </>
  );
}

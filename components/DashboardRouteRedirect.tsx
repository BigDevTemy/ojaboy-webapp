"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function DashboardRouteRedirect({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const router = useRouter();

  useEffect(() => {
    router.replace(href);
  }, [href, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fbfbfb] px-6 text-center text-black">
      <div>
        <p className="text-sm font-black text-black">Opening {label}...</p>
        <Link className="mt-4 inline-flex text-sm font-black text-[#f10606]" href={href}>
          Continue to {label}
        </Link>
      </div>
    </main>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthSession } from "@/lib/useAuthSession";

export function LoginSessionRedirect() {
  const router = useRouter();
  const session = useAuthSession();

  useEffect(() => {
    if (session) {
      router.replace("/dashboard");
    }
  }, [router, session]);

  return null;
}

"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  getAuthSessionSnapshot,
  parseAuthSession,
  subscribeToAuthSession,
} from "@/lib/authSession";

export function useAuthSession() {
  const authSessionValue = useSyncExternalStore(subscribeToAuthSession, getAuthSessionSnapshot, () => null);

  return useMemo(() => parseAuthSession(authSessionValue), [authSessionValue]);
}

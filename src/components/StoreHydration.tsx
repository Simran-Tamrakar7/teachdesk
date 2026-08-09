"use client";

import { useAppStore } from "@/lib/store";
import { useEffect } from "react";

/** Ensures persist finishes so login → dashboard isn't stuck on "Loading…" */
export function StoreHydration() {
  const setHydrated = useAppStore((s) => s.setHydrated);

  useEffect(() => {
    const finish = () => setHydrated();
    const unsub = useAppStore.persist.onFinishHydration(finish);
    if (useAppStore.persist.hasHydrated()) finish();
    // Fallback if persist callback never fires (SSR / empty storage edge cases)
    const t = window.setTimeout(finish, 50);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  return null;
}

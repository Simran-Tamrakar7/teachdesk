"use client";

import { useAppStore } from "@/lib/store";
import { maybeAutoBackup } from "@/lib/autobackup";
import { useEffect } from "react";

/** Ensures persist finishes so login → dashboard isn't stuck on "Loading…" */
export function StoreHydration() {
  const setHydrated = useAppStore((s) => s.setHydrated);
  const colorMode = useAppStore((s) => s.colorMode);
  const getBackupPayload = useAppStore((s) => s.getBackupPayload);
  const hydrated = useAppStore((s) => s.hydrated);

  useEffect(() => {
    const finish = () => setHydrated();
    const unsub = useAppStore.persist.onFinishHydration(finish);
    if (useAppStore.persist.hasHydrated()) finish();
    const t = window.setTimeout(finish, 50);
    return () => {
      unsub();
      window.clearTimeout(t);
    };
  }, [setHydrated]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", colorMode === "dark");
  }, [colorMode]);

  useEffect(() => {
    if (!hydrated) return;
    const run = () => {
      try {
        maybeAutoBackup(getBackupPayload());
      } catch {
        /* ignore quota */
      }
    };
    run();
    const id = window.setInterval(run, 6 * 60 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [hydrated, getBackupPayload]);

  return null;
}

"use client";

import { useEffect, useState } from "react";

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

/**
 * Registers the service worker and prompts when a new deploy is available.
 * Uses /sw.js?v=<buildId> so each Vercel deploy forces an SW update.
 */
export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Skip SW on localhost unless explicitly enabled — HMR + SW fight each other
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";
    if (isLocal && !window.localStorage.getItem("teachdesk-pwa-dev")) {
      return;
    }

    let registration: ServiceWorkerRegistration | null = null;
    let interval: ReturnType<typeof setInterval> | undefined;
    let refreshing = false;

    const check = () => {
      registration?.update().catch(() => undefined);
    };

    const onFocus = () => check();
    const onVisibility = () => {
      if (document.visibilityState === "visible") check();
    };
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register(`/sw.js?v=${BUILD_ID}`, {
        scope: "/",
        updateViaCache: "none",
      })
      .then((reg) => {
        registration = reg;
        if (reg.waiting) setWaiting(reg.waiting);

        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          if (!worker) return;
          worker.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) {
              setWaiting(worker);
            }
          });
        });

        check();
        interval = setInterval(check, 60_000);
        window.addEventListener("focus", onFocus);
        document.addEventListener("visibilitychange", onVisibility);
      })
      .catch(() => undefined);

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    return () => {
      if (interval) clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,24rem)] -translate-x-1/2 rounded-2xl border border-line bg-surface p-3 shadow-lg">
      <p className="text-sm text-ink">A new TeachDesk version is ready.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          className="btn btn-primary flex-1"
          onClick={() => {
            waiting.postMessage({ type: "SKIP_WAITING" });
            setWaiting(null);
          }}
        >
          Update now
        </button>
        <button type="button" className="btn btn-secondary" onClick={() => setWaiting(null)}>
          Later
        </button>
      </div>
    </div>
  );
}

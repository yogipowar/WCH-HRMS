"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type AppVersionInfo = {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  message?: string;
};

function readLocalVersionCode() {
  try {
    if (!window.WchHrmsApp?.isNativeApp?.()) return null;
    if (typeof window.WchHrmsApp.getVersionCode === "function") {
      return Number(window.WchHrmsApp.getVersionCode()) || 0;
    }
    // Older APK builds expose the bridge but not version — treat as outdated.
    return 0;
  } catch {
    return null;
  }
}

export function AppUpdatePrompt() {
  const [info, setInfo] = useState<AppVersionInfo | null>(null);
  const [localCode, setLocalCode] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const local = readLocalVersionCode();
      if (local === null) return;
      if (cancelled) return;
      setLocalCode(local);

      try {
        const res = await fetch(`/app-version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as AppVersionInfo;
        if (cancelled) return;
        if (!data?.versionCode || !data?.apkUrl) return;
        if (data.versionCode > local) {
          setInfo(data);
        }
      } catch {
        // ignore network errors
      }
    }

    // Bridge is injected after first paint in WebView.
    const timer = window.setTimeout(() => {
      void check();
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!info || localCode === null || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-lg">
        <p className="text-lg font-semibold text-foreground">Update available</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {info.message ||
            `Version ${info.versionName} is ready. Your app is on an older build.`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Current: {localCode || "older"} → New: {info.versionName} ({info.versionCode})
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            className="w-full sm:w-auto"
            disabled={busy}
            onClick={() => {
              setBusy(true);
              try {
                if (typeof window.WchHrmsApp?.openUpdate === "function") {
                  window.WchHrmsApp.openUpdate(info.apkUrl);
                } else {
                  window.location.href = info.apkUrl;
                }
              } finally {
                window.setTimeout(() => setBusy(false), 1500);
              }
            }}
          >
            {busy ? "Starting download…" : "Update app"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setDismissed(true)}
          >
            Later
          </Button>
        </div>
      </div>
    </div>
  );
}

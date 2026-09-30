"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand/logo";
import { useAuthStore } from "@/lib/stores/auth-store";

function readHashParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash);
}

function readQueryParams() {
  if (typeof window === "undefined") return new URLSearchParams();
  return new URLSearchParams(window.location.search);
}

function isNativeAndroidApp() {
  try {
    if (window.WchHrmsApp?.isNativeApp?.()) return true;
  } catch {
    // ignore
  }
  try {
    return sessionStorage.getItem("wch_native_app") === "1";
  } catch {
    return false;
  }
}

export function GoogleAuthCallbackPage() {
  const router = useRouter();
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [message, setMessage] = useState("Completing Google Sign-In…");
  const [openAppHref, setOpenAppHref] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function completeInWeb(idToken: string) {
      const remember = sessionStorage.getItem("wch_google_oauth_remember") !== "0";
      const result = await loginWithGoogle(idToken, remember);
      if (cancelled) return;

      if (!result.ok) {
        setMessage(result.error || "Google Sign-In failed.");
        window.setTimeout(() => router.replace("/login?native=1"), 2000);
        return;
      }

      window.history.replaceState(null, "", "/dashboard");
      router.replace("/dashboard");
    }

    async function handOffToApp(idToken: string) {
      setMessage("Returning to the HRMS app…");
      try {
        const res = await fetch("/api/auth/google-handoff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: idToken }),
        });
        const data = (await res.json().catch(() => ({}))) as { handoffId?: string; error?: string };
        if (!res.ok || !data.handoffId) {
          setMessage(data.error || "Could not return to the app. Tap below.");
          setOpenAppHref(`wchhrms://oauth?error=1`);
          return;
        }
        const deepLink = `wchhrms://oauth?handoff=${encodeURIComponent(data.handoffId)}`;
        setOpenAppHref(deepLink);
        window.location.href = deepLink;
      } catch {
        setMessage("Could not return to the app. Tap below to open WCH HRMS.");
      }
    }

    async function finish() {
      const hash = readHashParams();
      const query = readQueryParams();
      const handoffId = query.get("handoff") || "";
      const error = hash.get("error") || query.get("error");

      if (error) {
        setMessage("Google Sign-In was cancelled or failed.");
        window.setTimeout(() => router.replace("/login?native=1"), 1600);
        return;
      }

      if (handoffId) {
        try {
          const res = await fetch(`/api/auth/google-handoff?id=${encodeURIComponent(handoffId)}`);
          const data = (await res.json().catch(() => ({}))) as { credential?: string; error?: string };
          if (!res.ok || !data.credential) {
            setMessage(data.error || "Sign-In expired. Try again.");
            window.setTimeout(() => router.replace("/login?native=1"), 2000);
            return;
          }
          await completeInWeb(data.credential);
        } catch {
          setMessage("Could not finish Google Sign-In.");
          window.setTimeout(() => router.replace("/login?native=1"), 2000);
        }
        return;
      }

      const idToken = hash.get("id_token") || query.get("credential") || "";
      if (!idToken) {
        setMessage("Missing Google token. Returning to sign in…");
        window.setTimeout(() => router.replace("/login?native=1"), 1600);
        return;
      }

      // Custom Tab / external browser: return a short handoff into the APK (token is too long for deep links).
      if (!isNativeAndroidApp()) {
        await handOffToApp(idToken);
        return;
      }

      await completeInWeb(idToken);
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6">
      <BrandLogo priority className="h-10 w-auto max-w-[220px] object-contain" />
      <p className="text-center text-sm text-muted-foreground">{message}</p>
      {openAppHref ? (
        <a
          href={openAppHref}
          className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Open WCH HRMS app
        </a>
      ) : null}
    </div>
  );
}

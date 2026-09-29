"use client";

import { useEffect, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand/logo";
import { api } from "@/lib/api/client";

async function handOffToApp(credential: string) {
  const res = await fetch("/api/auth/google-handoff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ credential }),
  });
  const data = (await res.json().catch(() => ({}))) as { handoffId?: string; error?: string };
  if (!res.ok || !data.handoffId) {
    throw new Error(data.error || "Could not prepare app sign-in.");
  }
  const deepLink = `wchhrms://oauth?handoff=${encodeURIComponent(data.handoffId)}`;
  window.location.href = deepLink;
  return deepLink;
}

export function GoogleAppStartPage() {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [message, setMessage] = useState("Loading Google Sign-In…");
  const [openAppHref, setOpenAppHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function onCredential(credential: string) {
      setMessage("Returning to the HRMS app…");
      setError(null);
      try {
        const deepLink = await handOffToApp(credential);
        if (!cancelled) setOpenAppHref(deepLink);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not return to the app.");
          setMessage("Sign-In almost done");
        }
      }
    }

    void api
      .googleConfig()
      .then((config) => {
        if (cancelled) return;
        if (!config.enabled || !config.clientId) {
          setError("Google Sign-In is not configured.");
          setMessage("Unavailable");
          return;
        }

        const init = () => {
          if (!buttonRef.current || !window.google?.accounts?.id) return;
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: (response) => {
              void onCredential(response.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
            use_fedcm_for_prompt: false,
          });
          buttonRef.current.innerHTML = "";
          const width = Math.min(360, Math.floor(buttonRef.current.clientWidth || 320));
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: "signin_with",
            shape: "rectangular",
            width,
            logo_alignment: "left",
          });
          setMessage("Choose your Google account to continue in the app.");
        };

        const existing = document.querySelector<HTMLScriptElement>("script[data-google-gsi]");
        if (existing && window.google?.accounts?.id) {
          init();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        script.dataset.googleGsi = "true";
        script.onload = init;
        script.onerror = () => {
          if (!cancelled) {
            setError("Could not load Google Sign-In.");
            setMessage("Failed");
          }
        };
        document.head.appendChild(script);
      })
      .catch(() => {
        if (!cancelled) {
          setError("Could not load Google configuration.");
          setMessage("Failed");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-6">
      <BrandLogo priority className="h-10 w-auto max-w-[220px] object-contain" />
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">Sign in with Google</h1>
        <p className="text-sm text-muted-foreground">{message}</p>
        {error ? (
          <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
        {openAppHref ? (
          <a
            href={openAppHref}
            className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
          >
            Open WCH HRMS app
          </a>
        ) : null}
        <a href="/login?native=1" className="block text-xs text-muted-foreground underline-offset-2 hover:underline">
          Back to login
        </a>
      </div>
    </div>
  );
}

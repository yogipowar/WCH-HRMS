"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api/client";
import { Button } from "@/components/ui/button";

function markNativeApp() {
  try {
    sessionStorage.setItem("wch_native_app", "1");
  } catch {
    // ignore
  }
}

export function isNativeAndroidApp() {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("native") === "1") {
      markNativeApp();
      return true;
    }
  } catch {
    // ignore
  }
  try {
    if (window.WchHrmsApp?.isNativeApp?.()) {
      markNativeApp();
      return true;
    }
  } catch {
    // ignore
  }
  try {
    return sessionStorage.getItem("wch_native_app") === "1";
  } catch {
    return false;
  }
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.6 5.6 0 0 1-2.4 3.7v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.2-4 1.2-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.4A7.2 7.2 0 0 1 5 12c0-.8.1-1.6.4-2.4V6.5H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.5l4-3.1z" />
      <path fill="#EA4335" d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4A12 12 0 0 0 1.4 6.5l4 3.1C6.3 6.8 8.9 4.8 12 4.8z" />
    </svg>
  );
}

function startRedirectGoogleSignIn(clientId: string) {
  // APK must use the same GIS flow as the website (JavaScript origin).
  // Opening Google's /o/oauth2/v2/auth causes redirect_uri_mismatch unless that
  // URI is registered — GIS on /auth/google/app-start avoids that entirely.
  void clientId;
  markNativeApp();
  const startUrl = `${window.location.origin}/auth/google/app-start`;

  try {
    if (typeof window.WchHrmsApp?.startGoogleOAuth === "function") {
      window.WchHrmsApp.startGoogleOAuth(startUrl);
      return;
    }
  } catch {
    // fall through
  }
  window.location.assign(startUrl);
}

export function GoogleSignInButton({
  rememberMe,
  onSuccess,
  onError,
}: {
  rememberMe: boolean;
  onSuccess: (credential: string) => void | Promise<void>;
  onError: (message: string) => void;
}) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [ready, setReady] = useState(false);
  const [nativeApp, setNativeApp] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onError, onSuccess]);

  useEffect(() => {
    const detect = () => setNativeApp(isNativeAndroidApp());
    detect();
    const timer = window.setTimeout(detect, 300);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void api
      .googleConfig()
      .then((config) => {
        if (cancelled) return;
        if (!config.enabled || !config.clientId) {
          setEnabled(false);
          return;
        }
        setEnabled(true);
        setClientId(config.clientId);

        if (isNativeAndroidApp()) {
          setReady(true);
          return;
        }

        const existing = document.querySelector<HTMLScriptElement>("script[data-google-gsi]");
        const init = () => {
          if (!buttonRef.current || !window.google?.accounts?.id) return;
          window.google.accounts.id.initialize({
            client_id: config.clientId,
            callback: (response) => {
              void onSuccessRef.current(response.credential);
            },
            auto_select: false,
            cancel_on_tap_outside: true,
          });
          buttonRef.current.innerHTML = "";
          const available = Math.floor(buttonRef.current.clientWidth || 0);
          const width = Math.min(400, Math.max(240, available || 280));
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width,
            logo_alignment: "left",
          });
          setReady(true);
        };
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
        script.onerror = () => onErrorRef.current("Could not load Google Sign-In.");
        document.head.appendChild(script);
      })
      .catch(() => {
        if (!cancelled) setEnabled(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    sessionStorage.setItem("wch_google_oauth_remember", rememberMe ? "1" : "0");
  }, [enabled, rememberMe]);

  if (!enabled) return null;

  return (
    <div className="space-y-3">
      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {nativeApp ? (
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full"
          onClick={() => {
            if (!clientId) {
              onError("Google Sign-In is not configured.");
              return;
            }
            startRedirectGoogleSignIn(clientId);
          }}
        >
          <GoogleMark />
          Continue with Google
        </Button>
      ) : (
        <>
          <div ref={buttonRef} className="flex min-h-11 w-full max-w-full justify-center overflow-hidden [&_iframe]:max-w-full" />
          {!ready ? <p className="text-center text-xs text-muted-foreground">Loading Google…</p> : null}
        </>
      )}
    </div>
  );
}

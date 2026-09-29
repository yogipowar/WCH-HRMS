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
          const width = Math.min(360, Math.floor(buttonRef.current.clientWidth || 360));
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: "outline",
            size: "large",
            text: "signin_with",
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
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
        </div>
      </div>

      {nativeApp ? (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-md"
          onClick={() => {
            if (!clientId) {
              onError("Google Sign-In is not configured.");
              return;
            }
            startRedirectGoogleSignIn(clientId);
          }}
        >
          Sign in with Google
        </Button>
      ) : (
        <>
          <div ref={buttonRef} className="flex min-h-11 w-full justify-center" />
          {!ready ? <p className="text-center text-xs text-muted-foreground">Loading Google…</p> : null}
        </>
      )}
    </div>
  );
}

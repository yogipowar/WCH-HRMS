"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, UserRound } from "lucide-react";
import { GoogleSignInButton, isNativeAndroidApp } from "@/components/auth/google-sign-in-button";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginLineForDate, millisecondsUntilNextLocalMidnight } from "@/lib/auth/login-daily-lines";
import { AGENCY, APP_NAME, APP_SUBTITLE, COMPANY_NAME, COMPANY_TAGLINE, DEVELOPED_BY, DEVELOPED_BY_URL } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/auth-store";
import { loginFormSchema, type LoginFormValues } from "@/lib/validations/login";

export function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [appVersionLabel, setAppVersionLabel] = useState<string | null>(null);
  const [dailyLine, setDailyLine] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    window.localStorage.removeItem("wch_hrms_last_login");
  }, []);

  useEffect(() => {
    const readVersion = () => {
      try {
        if (typeof window.WchHrmsApp?.getVersionName === "function") {
          const name = window.WchHrmsApp.getVersionName() || "";
          const code =
            typeof window.WchHrmsApp.getVersionCode === "function"
              ? window.WchHrmsApp.getVersionCode()
              : "";
          setAppVersionLabel(code ? `App v${name} (${code})` : `App v${name}`);
          return;
        }
        if (isNativeAndroidApp()) {
          setAppVersionLabel("WCH HRMS App");
        }
      } catch {
        // ignore
      }
    };
    readVersion();
    const timer = window.setTimeout(readVersion, 400);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let midnightTimer = 0;
    const applyLine = () => setDailyLine(loginLineForDate(new Date()));
    const scheduleMidnight = () => {
      window.clearTimeout(midnightTimer);
      midnightTimer = window.setTimeout(() => {
        applyLine();
        scheduleMidnight();
      }, millisecondsUntilNextLocalMidnight(new Date()) + 1000);
    };
    applyLine();
    scheduleMidnight();
    const onVisible = () => {
      if (document.visibilityState === "visible") applyLine();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearTimeout(midnightTimer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    const result = await login(values.username, values.password, rememberMe);
    if (result !== true) {
      setFormError(result);
      return;
    }
    router.replace("/dashboard");
  }

  async function onGoogleCredential(credential: string) {
    setFormError(null);
    setGoogleBusy(true);
    const result = await loginWithGoogle(credential, rememberMe);
    setGoogleBusy(false);
    if (!result.ok) {
      setFormError(result.error || "Google Sign-In failed.");
      return;
    }
    router.replace("/dashboard");
  }

  const fieldClass =
    "h-11 border-0 bg-transparent px-1 text-foreground shadow-none placeholder:text-muted-foreground focus-visible:border-transparent focus-visible:ring-0";

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(28rem,0.9fr)]">
      <aside className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -top-24 -left-20 size-80 rounded-full bg-white/10" aria-hidden />
        <div className="pointer-events-none absolute right-[-4rem] bottom-8 size-72 rounded-full bg-white/10" aria-hidden />
        <div className="relative flex flex-1 flex-col p-10 xl:p-14">
          <div className="w-fit rounded-2xl bg-white px-4 py-3 shadow-sm">
            <BrandLogo priority className="h-12 w-auto max-w-[250px]" />
          </div>
          <div className="flex flex-1 flex-col justify-center">
            <div className="max-w-md">
              <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/75 uppercase">{APP_SUBTITLE}</p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight xl:text-5xl">{APP_NAME}</h1>
              <p className="mt-4 text-base leading-7 text-primary-foreground/85">
                {COMPANY_NAME}
                <span className="px-1.5">·</span>
                {COMPANY_TAGLINE}
              </p>
            </div>
          </div>
          <p className="text-sm text-primary-foreground/70">
            {AGENCY.city}
            <span className="px-1.5">·</span>
            {AGENCY.hours}
          </p>
        </div>
      </aside>

      <section className="flex min-h-dvh flex-col overflow-y-auto px-5 py-6 sm:px-8">
        <div className="lg:hidden">
          <BrandLogo priority className="h-10 w-auto max-w-[210px]" />
        </div>
        <div className="mx-auto flex w-full max-w-[28rem] flex-1 flex-col justify-center py-8">
          <div className="flex w-full min-w-0 flex-col rounded-2xl border border-border bg-card px-5 py-6 text-card-foreground shadow-sm sm:px-7 sm:py-8">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Sign in to your account</h2>
            {dailyLine ? (
              <p className="mt-2 text-sm leading-6 text-pretty text-muted-foreground">{dailyLine}</p>
            ) : null}

            <form className="mt-5 space-y-3" autoComplete="off" onSubmit={form.handleSubmit(onSubmit)}>
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </Label>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-1.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <UserRound className="size-4" />
                  </span>
                  <Input
                    id="username"
                    className={fieldClass}
                    placeholder="Username or work email"
                    {...form.register("username")}
                    autoComplete="off"
                  />
                </div>
                {form.formState.errors.username ? (
                  <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </Label>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-1.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <LockKeyhole className="size-4" />
                  </span>
                  <Input
                    id="password"
                    type="text"
                    className={showPassword ? fieldClass : `${fieldClass} [-webkit-text-security:disc]`}
                    placeholder="Enter your password"
                    {...form.register("password")}
                    autoComplete="off"
                  />
                  <button
                    type="button"
                    suppressHydrationWarning
                    className="mr-1 rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {form.formState.errors.password ? (
                  <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-0.5">
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox checked={rememberMe} onCheckedChange={(value) => setRememberMe(value === true)} />
                    Remember me
                  </label>
                  <span className="text-xs text-primary">Forgot password? Contact admin</span>
                </div>
              </div>

              {formError ? (
                <p className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {formError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full text-[15px] font-medium shadow-none"
                disabled={form.formState.isSubmitting || googleBusy}
              >
                Sign in
              </Button>
            </form>

            <div className="mt-4">
              <GoogleSignInButton
                rememberMe={rememberMe}
                onSuccess={onGoogleCredential}
                onError={(message) => setFormError(message)}
              />
            </div>
          </div>

        </div>

        <div className="mx-auto w-full max-w-[28rem] pb-2">
          {appVersionLabel ? (
            <p className="mb-2 text-[11px] text-muted-foreground">{appVersionLabel}</p>
          ) : null}
          <p className="text-xs leading-5 text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY_NAME}. For authorized personnel only.
            <span className="mt-1 block">
              Developed by{" "}
              <a href={DEVELOPED_BY_URL} target="_blank" rel="noreferrer" className="text-foreground hover:underline">
                {DEVELOPED_BY}
              </a>
            </span>
          </p>
        </div>
      </section>
    </div>
  );
}

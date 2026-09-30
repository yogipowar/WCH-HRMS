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
import { BASE_PATH, COMPANY_NAME, DEVELOPED_BY, DEVELOPED_BY_URL } from "@/lib/constants";
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
    const success = await login(values.username, values.password, rememberMe);
    if (!success) {
      setFormError("The username or password is incorrect.");
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
    <div className="relative h-dvh overflow-hidden bg-[#fef7f1] text-[#3d3566]">
      <div
        className="absolute inset-0 hidden bg-cover bg-center lg:block"
        style={{ backgroundImage: `url(${BASE_PATH}/login/welcome-scene.jpg)` }}
        aria-hidden
      />
      <div className="absolute top-5 right-5 z-20 sm:top-6 sm:right-8">
        <BrandLogo priority className="h-11 w-auto max-w-[220px] object-contain object-right" />
      </div>
      <section className="relative z-10 mx-auto flex h-dvh w-full max-w-[420px] flex-col overflow-y-auto px-5 pt-16 pb-5 sm:px-6 lg:mx-0 lg:ml-10 lg:pt-5 xl:ml-16">
        <div className="my-auto flex w-full flex-col gap-5">
        <div>
          <div className="flex w-full min-w-0 flex-col rounded-[28px] border border-border bg-card px-5 py-5 text-card-foreground shadow-none sm:px-6">
            <h2 className="text-center text-[1.65rem] font-semibold tracking-tight text-foreground">Log in to your account</h2>
            {dailyLine ? (
              <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">{dailyLine}</p>
            ) : null}

            <form className="mt-5 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
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
                    autoComplete="username"
                    className={fieldClass}
                    placeholder="Username or work email"
                    {...form.register("username")}
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
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className={fieldClass}
                    placeholder="Enter your password"
                    {...form.register("password")}
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
                Log in
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

        <div className="pt-1">
          {appVersionLabel ? (
            <p className="mb-2 text-[11px] text-[#8d86a3]">{appVersionLabel}</p>
          ) : null}
          <p className="text-xs leading-5 text-[#6d6784]">
            © {new Date().getFullYear()} {COMPANY_NAME}. For authorized personnel only.
            <span className="mt-1 block">
              Developed by{" "}
              <a href={DEVELOPED_BY_URL} target="_blank" rel="noreferrer" className="hover:text-[#3d3566]">
                {DEVELOPED_BY}
              </a>
            </span>
          </p>
        </div>
        </div>
      </section>
    </div>
  );
}

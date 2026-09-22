"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME, APP_SUBTITLE, COMPANY_NAME, COMPANY_TAGLINE } from "@/lib/constants";
import { useAuthStore } from "@/lib/stores/auth-store";
import { loginFormSchema, type LoginFormValues } from "@/lib/validations/login";

export function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: LoginFormValues) {
    setFormError(null);
    const success = login(values.username, values.password);
    if (!success) {
      setFormError("The username or password is incorrect.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="relative hidden overflow-hidden bg-[#0a3260] text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.22]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.16) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(125,211,252,0.22),transparent_36%),linear-gradient(180deg,rgba(10,50,96,0.2),rgba(6,28,54,0.55))]" />

        <div className="relative flex flex-1 flex-col justify-between px-12 py-11 xl:px-16">
          <div className="flex flex-col items-start gap-4">
            <div className="inline-flex rounded-lg bg-white px-4 py-3 shadow-sm">
              <BrandLogo priority className="h-10 w-auto max-w-[220px] object-contain object-left" />
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium tracking-wide text-sky-100 uppercase">
              <ShieldCheck className="size-3.5" />
              Internal employee portal
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-sky-200 uppercase">
              {COMPANY_NAME} · {COMPANY_TAGLINE}
            </p>
            <h1 className="mt-3 text-[2.35rem] leading-tight font-semibold tracking-tight">
              {APP_NAME}
            </h1>
            <p className="mt-3 text-base leading-7 text-slate-200">{APP_SUBTITLE}</p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-300">
              Sign in to record attendance, request leave, and access workforce records assigned to
              your role.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t border-white/12 pt-6">
              <div>
                <p className="text-lg font-semibold">9h</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-300">Active workday</p>
              </div>
              <div>
                <p className="text-lg font-semibold">2</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-300">Access roles</p>
              </div>
              <div>
                <p className="text-lg font-semibold">Secure</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-300">Authorized only</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} {COMPANY_NAME}. For authorized personnel only.
          </p>
        </div>
      </section>

      <section className="flex flex-col bg-[#f4f7fb]">
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-white px-5 py-4 lg:hidden">
          <BrandLogo priority className="h-9 w-auto max-w-[200px] object-contain object-left" />
          <span className="text-[11px] font-medium tracking-wide text-slate-500 uppercase">
            {APP_NAME}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-[0_16px_40px_rgba(15,23,42,0.06)] sm:p-8">
              <p className="hidden text-[11px] font-semibold tracking-[0.18em] text-[#0a3260] uppercase lg:block">
                {COMPANY_NAME}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 lg:mt-2">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your credentials to access the HRMS workspace.
              </p>

              <form className="mt-7 space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="username"
                      autoComplete="username"
                      className="h-11 rounded-md border-slate-200 bg-white pl-10"
                      placeholder="Username or work email"
                      {...form.register("username")}
                    />
                  </div>
                  {form.formState.errors.username ? (
                    <p className="text-xs text-destructive">{form.formState.errors.username.message}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="h-11 rounded-md border-slate-200 bg-white pr-11 pl-10"
                      placeholder="Password"
                      {...form.register("password")}
                    />
                    <button
                      type="button"
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {form.formState.errors.password ? (
                    <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <Checkbox
                      checked={rememberMe}
                      onCheckedChange={(value) => setRememberMe(value === true)}
                    />
                    Remember me
                  </label>
                  <span className="text-xs text-slate-400">Forgot password? Contact admin</span>
                </div>

                {formError ? (
                  <p className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    {formError}
                  </p>
                ) : null}

                <Button
                  type="submit"
                  className="h-11 w-full rounded-md bg-[#0a3260] text-white hover:bg-[#08284c]"
                  disabled={form.formState.isSubmitting}
                >
                  Sign in
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs leading-5 text-slate-500">
              Authorized personnel only. If you cannot sign in, contact administration.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

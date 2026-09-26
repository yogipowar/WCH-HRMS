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

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);
    const success = await login(values.username, values.password, rememberMe);
    if (!success) {
      setFormError("The username or password is incorrect.");
      return;
    }
    router.replace("/dashboard");
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="relative hidden overflow-hidden border-r bg-card lg:flex lg:flex-col">
        <div className="relative flex flex-1 flex-col justify-between px-12 py-11 xl:px-16">
          <div className="flex flex-col items-start gap-4">
            <BrandLogo priority className="h-10 w-auto max-w-[220px] object-contain object-left" />
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              <ShieldCheck className="size-3.5" />
              Internal employee portal
            </div>
          </div>

          <div className="max-w-md">
            <p className="text-[11px] font-semibold tracking-[0.22em] text-primary uppercase">
              {COMPANY_NAME} · {COMPANY_TAGLINE}
            </p>
            <h1 className="mt-3 text-[2.35rem] leading-tight font-semibold tracking-tight text-foreground">
              {APP_NAME}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted-foreground">{APP_SUBTITLE}</p>
            <p className="mt-5 max-w-sm text-sm leading-6 text-muted-foreground">
              Sign in to record attendance, request leave, and access workforce records assigned to
              your role.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-3 border-t pt-6">
              <div>
                <p className="text-lg font-semibold text-foreground">9h</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Active workday</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">2</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Access roles</p>
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">Secure</p>
                <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Authorized only</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {COMPANY_NAME}. For authorized personnel only.
          </p>
        </div>
      </section>

      <section className="flex flex-col bg-background">
        <div className="flex items-center justify-between border-b bg-card px-5 py-4 lg:hidden">
          <BrandLogo priority className="h-9 w-auto max-w-[200px] object-contain object-left" />
          <span className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {APP_NAME}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
          <div className="w-full max-w-[420px]">
            <div className="rounded-xl border bg-card p-7 sm:p-8">
              <p className="hidden text-[11px] font-semibold tracking-[0.18em] text-primary uppercase lg:block">
                {COMPANY_NAME}
              </p>
              <h2 className="text-2xl font-semibold tracking-tight text-foreground lg:mt-2">
                Sign in
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
                  className="h-11 w-full rounded-md"
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

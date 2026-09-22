"use client";

import { Check, Monitor, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useColorThemeStore } from "@/lib/stores/color-theme-store";
import { COLOR_THEMES } from "@/lib/theme/color-themes";
import { cn } from "@/lib/utils";

const APPEARANCE = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Monitor },
] as const;

export function AppearanceThemePanel({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const colorTheme = useColorThemeStore((state) => state.colorTheme);
  const setColorTheme = useColorThemeStore((state) => state.setColorTheme);

  return (
    <div className={cn("space-y-5", className)}>
      <div>
        <p className="mb-2 text-sm font-medium">Mode</p>
        <div className="grid grid-cols-3 gap-2">
          {APPEARANCE.map((item) => {
            const Icon = item.icon;
            const active = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTheme(item.id)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm",
                  active ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <Icon className="size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Color theme</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {COLOR_THEMES.map((item) => {
            const active = colorTheme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setColorTheme(item.id)}
                className={cn(
                  "flex items-start gap-3 rounded-lg border px-3 py-3 text-left",
                  active ? "border-primary bg-accent text-foreground" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                <span
                  className="relative mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ring-2 ring-background"
                  style={{ backgroundColor: item.swatch }}
                >
                  {active ? <Check className="size-3.5 text-white" /> : null}
                </span>
                <span>
                  <span className="block text-sm font-medium text-foreground">{item.label}</span>
                  <span className="mt-0.5 block text-xs leading-4 text-muted-foreground">{item.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const colorTheme = useColorThemeStore((state) => state.colorTheme);
  const setColorTheme = useColorThemeStore((state) => state.setColorTheme);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Theme and colors" />}>
        <Palette className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Appearance</DropdownMenuLabel>
          <div className="grid grid-cols-3 gap-1 p-1">
            {APPEARANCE.map((item) => {
              const Icon = item.icon;
              const active = theme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTheme(item.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg border px-2 py-2 text-xs",
                    active ? "border-primary bg-accent text-foreground" : "border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>Color theme</DropdownMenuLabel>
          <div className="grid grid-cols-2 gap-1.5 p-2">
            {COLOR_THEMES.map((item) => {
              const active = colorTheme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setColorTheme(item.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border px-2 py-2 text-left text-xs",
                    active ? "border-primary bg-accent text-foreground" : "border-transparent text-muted-foreground hover:bg-muted",
                  )}
                >
                  <span
                    className="relative flex size-5 shrink-0 items-center justify-center rounded-full ring-2 ring-background"
                    style={{ backgroundColor: item.swatch }}
                  >
                    {active ? <Check className="size-2.5 text-white" /> : null}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

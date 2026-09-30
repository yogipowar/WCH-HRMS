"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useColorThemeStore } from "@/lib/stores/color-theme-store";
import { DEFAULT_COLOR_THEME, resolveColorTheme } from "@/lib/theme/color-themes";

export function ColorThemeSync() {
  const colorTheme = useColorThemeStore((state) => state.colorTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveColorTheme(colorTheme);
  }, [colorTheme]);

  return null;
}

/** Apply the signed-in account's saved color and light/dark mode on this device. */
export function AccountThemeSync() {
  const status = useAuthStore((state) => state.status);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const colorTheme = useAuthStore((state) => state.user?.colorTheme);
  const appearance = useAuthStore((state) => state.user?.appearance);
  const setColorTheme = useColorThemeStore((state) => state.setColorTheme);
  const { setTheme } = useTheme();
  const applied = useRef("");

  useEffect(() => {
    if (status !== "ready") return;
    const mode = appearance === "dark" || appearance === "system" ? appearance : "light";
    const palette = resolveColorTheme(colorTheme);
    const key = !isAuthenticated || !userId ? "guest" : `${userId}:${palette}:${mode}`;
    if (applied.current === key) return;
    applied.current = key;
    if (key === "guest") {
      setColorTheme(DEFAULT_COLOR_THEME);
      setTheme("light");
      return;
    }
    setColorTheme(palette);
    setTheme(mode);
  }, [status, isAuthenticated, userId, colorTheme, appearance, setColorTheme, setTheme]);

  return null;
}

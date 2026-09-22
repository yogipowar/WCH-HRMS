"use client";

import { useEffect } from "react";
import { useColorThemeStore } from "@/lib/stores/color-theme-store";
import { resolveColorTheme } from "@/lib/theme/color-themes";

export function ColorThemeSync() {
  const colorTheme = useColorThemeStore((state) => state.colorTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = resolveColorTheme(colorTheme);
  }, [colorTheme]);

  return null;
}

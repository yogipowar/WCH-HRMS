"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { STORAGE_KEYS } from "@/lib/constants";
import { DEFAULT_COLOR_THEME, resolveColorTheme, type ColorThemeId } from "@/lib/theme/color-themes";

interface ColorThemeStore {
  colorTheme: ColorThemeId;
  setColorTheme: (colorTheme: ColorThemeId) => void;
}

export const useColorThemeStore = create<ColorThemeStore>()(
  persist(
    (set) => ({
      colorTheme: DEFAULT_COLOR_THEME,
      setColorTheme: (colorTheme) => set({ colorTheme }),
    }),
    {
      name: STORAGE_KEYS.colorTheme,
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<ColorThemeStore>;
        return {
          ...currentState,
          ...persisted,
          colorTheme: resolveColorTheme(persisted.colorTheme),
        };
      },
    },
  ),
);

export const COLOR_THEMES = [
  {
    id: "navy",
    label: "Navy",
    description: "Deep enterprise navy for leadership and admin work.",
    swatch: "#0a3260",
  },
  {
    id: "atlantic",
    label: "Atlantic",
    description: "Clean white workspace with bright corporate blue.",
    swatch: "#2563eb",
  },
  {
    id: "teal",
    label: "Teal",
    description: "Calm operations teal for attendance and people ops.",
    swatch: "#0f766e",
  },
  {
    id: "olive",
    label: "Olive",
    description: "Warm people-ops green with a human, approachable feel.",
    swatch: "#4f7a38",
  },
  {
    id: "graphite",
    label: "Graphite",
    description: "Restrained graphite with amber actions.",
    swatch: "#c5841a",
  },
  {
    id: "indigo",
    label: "Indigo",
    description: "Modern indigo for a focused SaaS workspace.",
    swatch: "#4f46e5",
  },
] as const;

export type ColorThemeId = (typeof COLOR_THEMES)[number]["id"];
export const DEFAULT_COLOR_THEME: ColorThemeId = "atlantic";

const LEGACY_THEME_MAP: Record<string, ColorThemeId> = {
  sky: "atlantic",
  ocean: "teal",
  forest: "olive",
  sunset: "graphite",
  violet: "indigo",
};

export function isColorThemeId(value: string): value is ColorThemeId {
  return COLOR_THEMES.some((theme) => theme.id === value);
}

export function resolveColorTheme(value: string | null | undefined): ColorThemeId {
  if (!value) {
    return DEFAULT_COLOR_THEME;
  }
  if (isColorThemeId(value)) {
    return value;
  }
  return LEGACY_THEME_MAP[value] ?? DEFAULT_COLOR_THEME;
}

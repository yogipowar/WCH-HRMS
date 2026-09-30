"use client";

import { ThemeProvider } from "next-themes";
import { AppUpdatePrompt } from "@/components/app-update-prompt";
import { AccountThemeSync, ColorThemeSync } from "@/components/theme/color-theme-sync";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <ColorThemeSync />
      <AccountThemeSync />
      <TooltipProvider delay={200}>
        {children}
        <AppUpdatePrompt />
        <Toaster richColors position="top-right" />
      </TooltipProvider>
    </ThemeProvider>
  );
}

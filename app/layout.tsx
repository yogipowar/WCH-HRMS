import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME, APP_SUBTITLE, COMPANY_NAME, FAVICON_PATH } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: `${COMPANY_NAME} ${APP_NAME}`,
    template: `%s · ${COMPANY_NAME} ${APP_NAME}`,
  },
  description: APP_SUBTITLE,
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: FAVICON_PATH, type: "image/png", sizes: "any" },
    ],
    apple: FAVICON_PATH,
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="atlantic" suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased" suppressHydrationWarning>
        <Script id="color-theme-boot" strategy="beforeInteractive">
          {`try{var raw=localStorage.getItem("wch-hrms.color-theme.v2")||localStorage.getItem("wch-hrms.color-theme")||"{}";var t=JSON.parse(raw).state?.colorTheme;var m={sky:"atlantic",ocean:"teal",forest:"olive",sunset:"graphite",violet:"indigo"};var id=m[t]||t||"atlantic";document.documentElement.dataset.theme=id;}catch(e){}`}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

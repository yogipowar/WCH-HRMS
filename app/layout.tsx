import type { Metadata } from "next";
import Script from "next/script";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { APP_NAME, APP_SUBTITLE, COMPANY_NAME } from "@/lib/constants";
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
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} data-theme="navy" suppressHydrationWarning>
      <body className="min-h-full font-sans antialiased" suppressHydrationWarning>
        <Script id="color-theme-boot" strategy="beforeInteractive">
          {`try{var t=JSON.parse(localStorage.getItem("wch-hrms.color-theme")||"{}").state?.colorTheme;var m={sky:"atlantic",ocean:"teal",forest:"olive",sunset:"graphite",violet:"indigo"};var id=m[t]||t;if(id)document.documentElement.dataset.theme=id;}catch(e){}`}
        </Script>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { routing } from "@/i18n/routing";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme/ThemeProvider";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: "XLSX World | Excel files made easy",
  description:
    "Easily manipulate and edit Excel files with XLSX World. Our intuitive platform allows you to import, export, and transform spreadsheets with powerful tools designed for both beginners and professionals. Streamline your workflow, automate repetitive tasks, and unlock advanced features to make working with Excel files faster and more efficient.",
  applicationName: "XLSX World",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://xlsx.world",
  ),
  keywords: [
    "excel",
    "xlsx",
    "spreadsheet tools",
    "convert excel",
    "edit excel online",
    "excel automation",
    "csv to xlsx",
    "xlsx utilities",
  ],
  openGraph: {
    title: "XLSX World | Excel files made easy",
    description:
      "Manipulate, convert, inspect and process Excel (XLSX) files easily online with powerful, fast tools.",
    url: "https://xlsx.world/",
    siteName: "XLSX World",
    locale: "en_US",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      {
        url: "/assets/img/favicon/favicon-32x32.png",
        type: "image/png",
        sizes: "32x32",
      },
      {
        url: "/assets/img/favicon/favicon-16x16.png",
        type: "image/png",
        sizes: "16x16",
      },
    ],
    apple: [
      { url: "/assets/img/favicon/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/assets/img/favicon/site.webmanifest",
};

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("xlsxworld-theme");var d=t==="dark"||(!t||t==="system")&&matchMedia("(prefers-color-scheme:dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <Header />
              <main className="pt-[60px] min-h-screen">{children}</main>
              <Footer />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

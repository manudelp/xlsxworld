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
import UpgradeModal from "@/components/upgrade/UpgradeModal";
import DotTrail from "@/components/common/DotTrail";
import { BASE_URL, buildAlternates } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  title: {
    default: "XLSX World | Excel files made easy",
    template: "%s | XLSX World",
  },
  description:
    "Free online Excel tools — convert, merge, split, clean, and inspect XLSX files instantly. No signup, no installation required.",
  applicationName: "XLSX World",
  metadataBase: new URL(BASE_URL),
  alternates: buildAlternates(""),
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
      "Free online tools to convert, merge, split, clean, and inspect Excel files. No signup required.",
    url: `${BASE_URL}/`,
    siteName: "XLSX World",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XLSX World | Excel files made easy",
    description:
      "Free online tools to convert, merge, split, clean, and inspect Excel files.",
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

  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "XLSX World",
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/tools/{search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("xlsxworld-theme");var d=t==="dark"||(!t||t==="system")&&matchMedia("(prefers-color-scheme:dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <AuthProvider>
              <Header />
              <DotTrail />
              <main className="pt-[60px] min-h-screen">
                {children}
              </main>
              <Footer />
              <UpgradeModal />
            </AuthProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

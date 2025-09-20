import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";

export const metadata: Metadata = {
  title: "XLSX World | Excel files made easy",
  description:
    "Easily manipulate and edit Excel files with XLSX World. Our intuitive platform allows you to import, export, and transform spreadsheets with powerful tools designed for both beginners and professionals. Streamline your workflow, automate repetitive tasks, and unlock advanced features to make working with Excel files faster and more efficient.",
  applicationName: "XLSX World",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://xlsx.world"
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
    url: "https://xlsxworld.com/",
    siteName: "XLSX World",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "XLSX World | Excel files made easy",
    description:
      "Convert, inspect and manipulate XLSX files online with XLSX World tools.",
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
          body {
            font-family: 'Inter', sans-serif;
          }
        `}</style>
      </head>
      <body>
        <Header />
        <main className="pt-[60px] min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

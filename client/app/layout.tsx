import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";

export const metadata: Metadata = {
  title: "iLoveXLSX | Excel files made easy",
  description:
    "Easily manipulate and edit Excel files with iLoveXLSX. Our intuitive platform allows you to import, export, and transform spreadsheets with powerful tools designed for both beginners and professionals. Streamline your workflow, automate repetitive tasks, and unlock advanced features to make working with Excel files faster and more efficient.",
  applicationName: "iLoveXLSX",
  keywords: [
    "excel",
    "xlsx",
    "spreadsheet tools",
    "convert excel",
    "edit excel online",
    "excel automation",
    "csv to xlsx",
    "xlsx utilities"
  ],
  themeColor: "#ffffff",
  openGraph: {
    title: "iLoveXLSX | Excel files made easy",
    description:
      "Manipulate, convert, inspect and process Excel (XLSX) files easily online with powerful, fast tools.",
    url: "https://ilovexlsx.com/",
    siteName: "iLoveXLSX",
    images: [
      {
        url: "/ilovexlsx_full.png",
        width: 1200,
        height: 630,
        alt: "iLoveXLSX banner"
      }
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "iLoveXLSX | Excel files made easy",
    description: "Convert, inspect and manipulate XLSX files online with iLoveXLSX tools.",
    images: ["/ilovexlsx_full.png"],
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/assets/img/favicon/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/assets/img/favicon/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [
      { url: "/assets/img/favicon/apple-touch-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/assets/img/favicon/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="pt-[60px] min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

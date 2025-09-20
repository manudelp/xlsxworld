import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter } from "next/font/google";
import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  // ... your metadata as before
};

export const viewport: Viewport = {
  // ... your viewport as before
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Header />
        <main className="pt-[60px] min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

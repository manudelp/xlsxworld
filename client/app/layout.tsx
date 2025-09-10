import type { Metadata } from "next";
import "./globals.css";
import Header from "../components/ui/Header";
import Footer from "../components/ui/Footer";

export const metadata: Metadata = {
  title: "iLoveXLSX | Excel files made easy",
  description:
    "Easily manipulate and edit Excel files with iLoveXLSX. Our intuitive platform allows you to import, export, and transform spreadsheets with powerful tools designed for both beginners and professionals. Streamline your workflow, automate repetitive tasks, and unlock advanced features to make working with Excel files faster and more efficient.",
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

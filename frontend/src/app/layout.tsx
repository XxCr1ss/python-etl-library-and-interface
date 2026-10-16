import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/components/layout/themeStorage";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ETL Flow - Data Engineering Platform",
  description: "Modern ETL prototype for data integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Only the html class is changed before hydration by the theme bootstrap.
    <html lang="es" className="antialiased" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}

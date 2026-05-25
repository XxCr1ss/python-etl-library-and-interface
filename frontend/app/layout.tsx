import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";

export const metadata: Metadata = { title: "ETL Tool" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-gray-50 min-h-screen">
        <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
          <span className="font-semibold text-gray-800">ETL Tool</span>
          <Link href="/extractors/csv"  className="text-sm text-gray-500 hover:text-gray-900">CSV</Link>
          <Link href="/extractors/xlsx" className="text-sm text-gray-500 hover:text-gray-900">Excel</Link>
          <Link href="/extractors/db"   className="text-sm text-gray-500 hover:text-gray-900">Base de datos</Link>
        </nav>
        <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
"use client";

import { FileDown, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoadPage() {
  return (
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <FileDown className="w-10 h-10 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Módulo de Carga</h1>
      <p className="text-slate-500 max-w-lg mb-8">
        Aquí configurarás la ingesta en el Data Warehouse. Las validaciones de llaves foráneas se ejecutarán automáticamente.
      </p>
      <Link 
        href="/transform"
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Ir a Transformación <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

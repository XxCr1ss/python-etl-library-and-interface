"use client";

import { Workflow, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function TransformPage() {
  return (
    <div className="max-w-4xl mx-auto h-[80vh] flex flex-col items-center justify-center text-center">
      <div className="w-20 h-20 bg-blue-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
        <Workflow className="w-10 h-10 text-blue-500" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Módulo de Transformación</h1>
      <p className="text-slate-500 max-w-lg mb-8">
        Este módulo está diseñado para aplicar limpieza, uniones y casteo de tipos. Requiere que primero extraigas datos.
      </p>
      <Link 
        href="/extract"
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Ir a Extracción <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}

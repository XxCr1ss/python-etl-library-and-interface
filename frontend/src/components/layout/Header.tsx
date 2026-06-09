"use client";

import { Bell, Search } from "lucide-react";

export function Header() {
  return (
    <header className="h-16 bg-[var(--sidebar-bg)] border-b border-[var(--sidebar-border)] flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      <div className="flex items-center w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar procesos, tablas..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-800"></span>
        </button>
      </div>
    </header>
  );
}

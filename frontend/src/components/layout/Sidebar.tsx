"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Database, 
  Settings, 
  Activity, 
  Workflow, 
  LayoutDashboard,
  UploadCloud,
  FileDown
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Extracción", href: "/extract", icon: UploadCloud },
  { name: "Transformación", href: "/transform", icon: Workflow },
  { name: "Carga", href: "/load", icon: FileDown },
  { name: "Bodega de Datos", href: "#", icon: Database }, // Placeholder
];

const BOTTOM_ITEMS = [
  { name: "Monitoreo", href: "#", icon: Activity },
  { name: "Configuración", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar-bg)] border-r border-[var(--sidebar-border)] flex flex-col fixed left-0 top-0">
      <div className="h-16 flex items-center px-6 border-b border-[var(--sidebar-border)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">ETL Flow</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 flex flex-col gap-1">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          Core
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}

        <div className="mt-8 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-3">
          Sistema
        </div>
        {BOTTOM_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link 
              key={item.name} 
              href={item.href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-400" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-50"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[var(--sidebar-border)]">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 font-semibold text-sm">
            AD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-900 dark:text-slate-50">Admin User</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">admin@etlflow.local</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

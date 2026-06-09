import { Activity, Database, ServerCrash, Clock } from "lucide-react";

export default function Dashboard() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Dashboard ETL</h1>
          <p className="text-slate-500">Resumen del estado del sistema y últimas ejecuciones.</p>
        </div>
        <button className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-sm font-medium rounded-lg shadow hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors">
          Nuevo Proceso
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[
          { label: "Ejecuciones Hoy", value: "12", icon: Activity, color: "text-blue-500", bg: "bg-blue-50 dark:bg-blue-500/10" },
          { label: "Registros Cargados", value: "1.2M", icon: Database, color: "text-emerald-500", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
          { label: "Errores", value: "0", icon: ServerCrash, color: "text-rose-500", bg: "bg-rose-50 dark:bg-rose-500/10" },
          { label: "Tiempo Promedio", value: "45s", icon: Clock, color: "text-indigo-500", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white">Últimas Ejecuciones</h3>
        </div>
        <div className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900/50 uppercase border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-3 font-medium">Proceso</th>
                <th className="px-6 py-3 font-medium">Estado</th>
                <th className="px-6 py-3 font-medium">Origen</th>
                <th className="px-6 py-3 font-medium">Registros</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {[
                { name: "Carga Cotizantes", status: "Éxito", source: "PostgreSQL (colombia_saludable)", rows: "45,210", date: "Hace 5 min" },
                { name: "Dimensión Médico", status: "Éxito", source: "CSV Upload", rows: "1,200", date: "Hace 1 hora" },
                { name: "Hechos Pagos", status: "Fallido", source: "Oracle (ventas)", rows: "-", date: "Ayer" },
              ].map((row, i) => (
                <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-300">{row.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      row.status === "Éxito" 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                    }`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.source}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.rows}</td>
                  <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Configuración</h1>
        <p className="text-content-muted">Preferencias de este espacio de trabajo local.</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center text-content-muted">
        Puedes elegir el tema claro, oscuro o del sistema desde el control Tema de la cabecera. Las demás opciones de configuración están en construcción.
      </div>
    </div>
  );
}

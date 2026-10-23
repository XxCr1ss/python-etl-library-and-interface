export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Configuración</h1>
        <p className="text-content-muted">Preferencias de este espacio de trabajo local.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-content-muted">
        La herramienta utiliza tema claro. Puedes ocultar o mostrar la navegación desde la cabecera para ampliar el espacio de trabajo. Las demás opciones de configuración están en construcción.
      </div>
    </div>
  );
}

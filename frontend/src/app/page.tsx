"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Workflow, 
  Terminal as TerminalIcon, 
  Copy, 
  Check, 
  ArrowRight, 
  Database, 
  Cpu, 
  Cloud, 
  Play, 
  CheckCircle2, 
  Server, 
  BookOpen, 
  Code
} from "lucide-react";

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState<"install" | "agent">("install");
  const [copied, setCopied] = useState(false);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  const installCode = `# 1. Clonar el repositorio
git clone https://github.com/XxCr1ss/python-etl-library-and-interface.git

# 2. Entrar al directorio
cd python-etl-library-and-interface

# 3. Instalar dependencias requeridas
pip install -r requirements.txt`;

  const agentCode = `# Ejecutar el agente para conectar tu DB local a la consola web
python etl_agent.py

# El agente solicitará:
# 1. La URL de la API del Backend (ej. http://localhost:8000)
# 2. Tu identificador único de agente (ej. local-agent-default)`;

  const handleCopy = async () => {
    const textToCopy = activeTab === "install" ? installCode : agentCode;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      id: 1,
      title: "Bases de Datos Locales",
      desc: "PostgreSQL, MySQL, Oracle, SQL Server u hojas de cálculo Excel/CSV ubicadas en tu red local.",
      icon: Database,
      badge: "Origen"
    },
    {
      id: 2,
      title: "Agente Local Python",
      desc: "Script liviano (etl_agent.py) que se ejecuta localmente y conecta tus DBs mediante WebSockets seguros.",
      icon: Cpu,
      badge: "Túnel"
    },
    {
      id: 3,
      title: "API Gateway (Backend)",
      desc: "Servidor central en FastAPI que recibe comandos de metadatos y coordina la ejecución de tareas.",
      icon: Server,
      badge: "Orquestador"
    },
    {
      id: 4,
      title: "Consola Web (Frontend)",
      desc: "Interfaz gráfica reactiva en Next.js para gestionar, previsualizar y ejecutar pipelines en tiempo real.",
      icon: Cloud,
      badge: "Control"
    }
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200 overflow-x-hidden relative font-sans">
      
      {/* Luces de Fondo (Efectos de resplandor espacial) */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar Minimalista */}
      <header className="border-b border-slate-900 bg-slate-950/40 backdrop-blur-xl sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Workflow className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
              ETL Flow
            </span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              API Status: Online
            </div>
            <Link 
              href="/dashboard"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-semibold rounded-lg shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2 group"
            >
              Entrar a la Consola
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-6 text-center">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-400 mb-6 animate-fade-in">
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 font-bold text-[10px] uppercase tracking-wider">
              NUEVO
            </span>
            Arquitectura Híbrida y Descentralizada
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-8">
            <span className="block text-slate-100">Pipelines de Datos</span>
            <span className="block bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-300 to-purple-400">
              Locales y Cloud en Armonía
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base md:text-xl text-slate-400 mb-12 leading-relaxed">
            Una solución ligera y potente. Ejecuta procesos ETL directamente en tu infraestructura 
            local de forma privada, y contrólalos remotamente desde nuestra moderna consola web.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-xl shadow-blue-500/20 transition-all duration-300 flex items-center justify-center gap-3 text-base group"
            >
              <Play className="w-5 h-5 fill-current" />
              Comenzar a Trabajar
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#install-section"
              className="w-full sm:w-auto px-8 py-4 bg-slate-900 hover:bg-slate-800/80 text-slate-300 border border-slate-800 hover:border-slate-700 font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-base"
            >
              <BookOpen className="w-5 h-5" />
              Guía de Instalación
            </a>
          </div>

        </div>
      </section>

      {/* Terminal Section (Guía interactiva de instalación) */}
      <section id="install-section" className="py-16 border-t border-slate-900 bg-slate-950/20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              Instalación Rápida de la Librería
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              Configura tu agente local en menos de 2 minutos para conectar tus bases de datos de forma segura.
            </p>
          </div>

          {/* Terminal Mockup */}
          <div className="bg-[#0b1220] border border-slate-800/80 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Cabecera de la terminal */}
            <div className="bg-[#070b14] px-4 py-3 flex items-center justify-between border-b border-slate-900">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-slate-500 font-mono ml-2">bash - terminal</span>
              </div>
              <button 
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-800 transition-all font-mono"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>

            {/* Pestañas de la terminal */}
            <div className="flex border-b border-slate-900/50 bg-[#080e1a]">
              <button
                onClick={() => setActiveTab("install")}
                className={`px-4 py-3 text-xs md:text-sm font-mono flex items-center gap-2 border-r border-slate-900 transition-colors ${
                  activeTab === "install" 
                    ? "bg-[#0b1220] text-blue-400 border-t-2 border-t-blue-500 font-semibold" 
                    : "text-slate-500 hover:bg-[#0b1220]/50"
                }`}
              >
                <Code className="w-4 h-4" />
                1. Instalar Core (Local)
              </button>
              <button
                onClick={() => setActiveTab("agent")}
                className={`px-4 py-3 text-xs md:text-sm font-mono flex items-center gap-2 border-r border-slate-900 transition-colors ${
                  activeTab === "agent" 
                    ? "bg-[#0b1220] text-blue-400 border-t-2 border-t-blue-500 font-semibold" 
                    : "text-slate-500 hover:bg-[#0b1220]/50"
                }`}
              >
                <TerminalIcon className="w-4 h-4" />
                2. Iniciar Agente (WebSocket)
              </button>
            </div>

            {/* Contenido de la terminal */}
            <div className="p-6 font-mono text-xs md:text-sm leading-relaxed overflow-x-auto bg-[#070b13]/60">
              <pre className="text-slate-300">
                <code>
                  {activeTab === "install" ? installCode : agentCode}
                </code>
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Diagrama Interactivo de la Arquitectura */}
      <section className="py-20 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              ¿Cómo funciona el ETL Híbrido?
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              Mantén tus datos seguros dentro de tu red local. El agente procesa localmente y reporta el progreso al dashboard central.
            </p>
          </div>

          {/* Diagrama Visual */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 relative mb-12">
            {steps.map((step, idx) => {
              const Icon = step.icon;
              const isHovered = hoveredStep === idx;
              return (
                <div
                  key={step.id}
                  className={`bg-slate-950/40 border p-6 rounded-2xl transition-all duration-300 relative group cursor-pointer ${
                    isHovered 
                      ? "border-blue-500 shadow-lg shadow-blue-500/10 scale-[1.02]" 
                      : "border-slate-900 hover:border-slate-800"
                  }`}
                  onMouseEnter={() => setHoveredStep(idx)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {/* Flecha de conexión entre pasos (Solo en pantallas grandes) */}
                  {idx < 3 && (
                    <div className="hidden lg:block absolute right-[-15px] top-1/2 -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-slate-700 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                      isHovered ? "bg-blue-600 text-white" : "bg-slate-900 text-slate-400"
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-semibold text-blue-400 tracking-wider uppercase">
                      {step.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-white mb-2 group-hover:text-blue-400 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="bg-[#090f1c] border border-slate-900 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400 mt-0.5">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-semibold text-white">Privacidad del Core local</h4>
                <p className="text-slate-400 text-xs md:text-sm mt-1">
                  Tus datos **nunca** viajan al servidor en la nube sin tu permiso explícito. El procesamiento ETL se ejecuta localmente y solo se reportan vistas previas y estadísticas del estado.
                </p>
              </div>
            </div>
            <Link 
              href="/dashboard" 
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 hover:border-slate-700 text-sm font-semibold rounded-lg shrink-0 transition-all"
            >
              Probar Demo Local
            </Link>
          </div>
        </div>
      </section>

      {/* Características del Core ETL (E-T-L) */}
      <section className="py-20 border-t border-slate-900 bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4">
              El poder del Core ETL a tu disposición
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-sm md:text-base">
              La librería modular soporta múltiples fuentes de datos y transformaciones eficientes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Extracción */}
            <div className="bg-slate-900/25 border border-slate-900 hover:border-slate-800 p-8 rounded-2xl backdrop-blur-sm transition-all group">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-6 font-bold text-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                E
              </div>
              <h3 className="font-bold text-xl text-white mb-3">Extracción Adaptable</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Extrae datos desde múltiples orígenes locales de forma nativa: bases de datos relacionales, ficheros en formato Excel, planos o CSVs estructurados.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 font-mono">
                <li>✔ PostgreSQL, Oracle, MySQL</li>
                <li>✔ Archivos CSV & Excel (.xlsx)</li>
                <li>✔ Lector optimizado en chunk</li>
              </ul>
            </div>

            {/* Transformación */}
            <div className="bg-slate-900/25 border border-slate-900 hover:border-slate-800 p-8 rounded-2xl backdrop-blur-sm transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-6 font-bold text-xl group-hover:bg-indigo-600 group-hover:text-white transition-all">
                T
              </div>
              <h3 className="font-bold text-xl text-white mb-3">Transformación Rápida</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Limpia, filtra y formatea tipos de datos. Soporta transformaciones directas en memoria usando Pandas y PETL para garantizar integridad.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 font-mono">
                <li>✔ Limpieza y validación de tipos</li>
                <li>✔ Agrupación y mapeo de valores</li>
                <li>✔ Deduplicación de registros</li>
              </ul>
            </div>

            {/* Carga */}
            <div className="bg-slate-900/25 border border-slate-900 hover:border-slate-800 p-8 rounded-2xl backdrop-blur-sm transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mb-6 font-bold text-xl group-hover:bg-purple-600 group-hover:text-white transition-all">
                L
              </div>
              <h3 className="font-bold text-xl text-white mb-3">Carga Consistente</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Carga el resultado en tu base de datos de destino u almacén de datos (Data Warehouse) con control transaccional íntegro.
              </p>
              <ul className="text-xs text-slate-500 space-y-2 font-mono">
                <li>✔ Cargas incrementales e históricas</li>
                <li>✔ Manejo automático de transacciones</li>
                <li>✔ Monitoreo de tasa de error de escritura</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / Info del Proyecto */}
      <footer className="border-t border-slate-900 bg-[#05080f] py-12 text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-slate-600" />
            <span className="font-semibold text-slate-400">ETL Flow Core v0.1.0</span>
          </div>

          <div className="flex items-center gap-6">
            <a 
              href="https://github.com/XxCr1ss/python-etl-library-and-interface" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="hover:text-slate-300 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              GitHub Repository
            </a>
          </div>

          <div>
            <p>© {new Date().getFullYear()} Tesis - Plataforma ETL Híbrida. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

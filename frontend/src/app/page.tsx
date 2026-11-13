import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Cloud, Cpu, Database, SlidersHorizontal, Upload, Workflow } from "lucide-react";
import { PublicBrand } from "@/components/layout/PublicBrand";
import { InstallTerminal } from "@/features/landing/InstallTerminal";
import { cn } from "@/lib/cn";

const repository = "https://github.com/XxCr1ss/python-etl-library-and-interface";
const container = "mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-16 xl:px-24";
const primaryLink = "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-action px-5 text-sm font-semibold text-on-action transition-colors hover:bg-action-hover";

const architecture = [
  { Icon: Database, title: "Fuentes locales", description: "Bases de datos y archivos", environment: "Red local" },
  { Icon: Cpu, title: "Agente Python", description: "Ejecuta el pipeline en tu red", environment: "Procesamiento" },
  { Icon: Cloud, title: "Consola web", description: "Configura y supervisa ejecuciones", environment: "Control web" },
];

const stages = [
  { Icon: Database, title: "Extrae", description: "Conecta PostgreSQL, MySQL, Oracle, SQL Server o archivos CSV y Excel." },
  { Icon: SlidersHorizontal, title: "Transforma", description: "Filtra filas, convierte tipos y elimina duplicados antes de cargar." },
  { Icon: Upload, title: "Carga", description: "Envía los resultados a tu base de datos de destino y revisa la ejecución." },
];

function ArchitecturePanel() {
  return (
    <figure className="rounded-2xl border border-public-navy-line bg-public-panel p-4 sm:p-6">
      <figcaption className="mb-4 flex min-h-11 items-center justify-between gap-3 border-b border-public-navy-line pb-3 sm:mb-5">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Workflow size={18} className="text-public-ice" aria-hidden="true" /> Flujo híbrido
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-public-on-navy">Arquitectura</span>
      </figcaption>
      <ol>
        {architecture.map(({ Icon, title, description, environment }, index) => (
          <li key={title} className={cn(index > 0 && "mt-3 sm:mt-4")}>
            {index > 0 && <ArrowDown size={15} className="mb-3 ml-5 text-public-ice sm:mb-4" aria-hidden="true" />}
            <div className="flex min-h-[61px] items-center gap-2.5 rounded-lg border border-public-navy-line bg-public-navy px-2.5 py-2 sm:min-h-[66px]">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-public-panel text-public-ice sm:size-9">
                <Icon size={18} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs leading-4 text-public-on-navy">{description}</p>
              </div>
              <span className={cn("hidden font-mono text-[10px] uppercase xl:block", index === 1 ? "text-public-mint" : "text-public-ice")}>
                {environment}
              </span>
            </div>
          </li>
        ))}
      </ol>
    </figure>
  );
}

export default function LandingPage() {
  return (
    <div className="bg-white text-content">
      <header className={cn(container, "relative flex min-h-[68px] items-center justify-between gap-3 lg:min-h-[76px]")}>
        <PublicBrand />
        <nav aria-label="Secciones del Home" className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-9 text-sm font-semibold text-content-muted lg:flex">
          <a href="#how-it-works" className="hover:text-action">Cómo funciona</a>
          <a href="#install-section" className="hover:text-action">Instalación</a>
        </nav>
        <nav aria-label="Acceso" className="flex items-center gap-3 sm:gap-5">
          <Link href="/login" className="inline-flex min-h-11 items-center text-sm font-semibold hover:text-action">Iniciar sesión</Link>
          <Link href="/register" className={cn(primaryLink, "hidden min-h-[42px] lg:inline-flex")}>Crear cuenta</Link>
        </nav>
      </header>

      <main>
        <section className="bg-public-navy text-white">
          <div className={cn(container, "grid items-center gap-8 py-10 lg:grid-cols-[1fr_1.03fr] lg:gap-12 lg:py-[68px] xl:gap-[76px]")}>
            <div>
              <p className="mb-4 font-mono text-[11px] font-medium uppercase tracking-[.12em] text-public-mint">Plataforma ETL híbrida</p>
              <h1 className="max-w-[390px] text-balance text-[clamp(2rem,9.5vw,2.45rem)] font-bold leading-[1.13] tracking-[-.043em] sm:max-w-none sm:text-5xl xl:text-[clamp(2.8rem,3.75vw,3.375rem)] xl:leading-[1.11]">
                Ejecuta tus pipelines donde están tus datos.
              </h1>
              <p className="mt-5 max-w-[492px] text-base leading-[25px] text-public-on-navy sm:text-lg sm:leading-[29px]">
                Conecta tus fuentes locales, transforma los datos con el agente Python y supervisa las ejecuciones desde la consola web.
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
                <Link href="/register" className={cn(primaryLink, "focus-visible:outline-public-ice")}>
                  Crear cuenta <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-lg border border-public-navy-line bg-public-panel px-5 text-sm font-semibold text-public-light transition-colors hover:bg-public-navy-line focus-visible:outline-public-ice">
                  Explorar como invitado
                </Link>
              </div>
              <a href="#install-section" className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-public-ice hover:text-white focus-visible:outline-public-ice">
                Ver guía de instalación <ArrowDown size={16} aria-hidden="true" />
              </a>
            </div>
            <ArchitecturePanel />
          </div>
        </section>

        <section id="how-it-works" className={cn(container, "py-10 lg:py-[54px]")} aria-labelledby="how-title">
          <h2 id="how-title" className="text-[28px] font-bold leading-tight tracking-tight lg:text-[38px]">De la fuente al destino</h2>
          <p className="mt-2 text-[15px] leading-[23px] text-content-muted">Configura cada etapa desde la consola y ejecuta el pipeline con tu agente local.</p>
          <ul className="mt-6 grid gap-3 md:grid-cols-3 lg:gap-4">
            {stages.map(({ Icon, title, description }) => (
              <li key={title} className="rounded-xl border border-public-line bg-public-canvas p-4 lg:min-h-[169px] lg:p-[22px]">
                <span className="grid size-[34px] place-items-center rounded-[10px] bg-public-blue-soft text-action">
                  <Icon size={17} aria-hidden="true" />
                </span>
                <h3 className="mt-2 text-[19px] font-bold tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-[21px] text-content-muted">{description}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="install-section" className="bg-public-canvas" aria-labelledby="install-title">
          <div className={cn(container, "grid items-center gap-5 py-10 lg:grid-cols-[minmax(0,396px)_minmax(0,1fr)] lg:gap-11 lg:py-[54px]")}>
            <div>
              <h2 id="install-title" className="text-[28px] font-bold leading-tight tracking-tight lg:text-4xl">Instala el agente local</h2>
              <p className="mt-2 text-[15px] leading-[23px] text-content-muted">
                Clona el repositorio, instala las dependencias y ejecuta el agente. Al iniciar, indica la URL de la API y el identificador del agente.
              </p>
              <a href={repository} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-action hover:underline">
                Ver repositorio en GitHub <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            </div>
            <InstallTerminal />
          </div>
        </section>
      </main>

      <footer className={cn(container, "flex flex-col gap-3 py-5 text-[13px] text-content-muted sm:flex-row sm:items-center sm:justify-between lg:py-6")}>
        <PublicBrand />
        <p>Proyecto de tesis · Plataforma ETL híbrida</p>
        <a href={repository} className="inline-flex w-fit items-center gap-2 font-semibold hover:text-action">
          GitHub <ArrowUpRight size={16} aria-hidden="true" />
        </a>
      </footer>
    </div>
  );
}

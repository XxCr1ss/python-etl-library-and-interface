import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Database, Layers3 } from "lucide-react";
import { PublicBrand } from "@/components/layout/PublicBrand";

const benefits = [
  { Icon: Database, label: "Conexiones guardadas" },
  { Icon: Layers3, label: "Historial de cargas" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-public-canvas text-content">
      <header className="border-b border-public-line bg-white">
        <div className="mx-auto flex min-h-[68px] max-w-[1440px] items-center justify-between gap-3 px-5 sm:px-8 lg:min-h-[78px] lg:px-[76px]">
          <PublicBrand />
          <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-content-muted hover:text-action">
            <ArrowLeft size={16} aria-hidden="true" />
            <span className="sm:hidden">Inicio</span>
            <span className="hidden sm:inline">Volver al inicio</span>
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] flex-1 sm:p-8 lg:px-16 lg:py-10 xl:px-24">
        <div className="grid bg-white sm:overflow-hidden sm:rounded-2xl sm:border sm:border-public-line lg:min-h-[678px] lg:grid-cols-[15fr_11fr]">
          <div className="flex items-center justify-center px-5 py-9 sm:px-10 lg:px-12 lg:py-11">
            <div className="w-full max-w-[418px]">{children}</div>
          </div>
          <aside aria-labelledby="account-benefits" className="hidden flex-col justify-center gap-[18px] bg-public-navy p-8 text-white lg:flex xl:p-[54px]">
            <h2 id="account-benefits" className="text-balance text-4xl font-bold leading-[1.12] tracking-[-.045em] xl:text-[44px]">
              Gestiona tus pipelines desde un solo lugar.
            </h2>
            <p className="text-[17px] leading-[27px] text-public-on-navy">
              Con tu cuenta puedes guardar conexiones y consultar el historial de tus cargas.
            </p>
            <ul className="space-y-2">
              {benefits.map(({ Icon, label }) => (
                <li key={label} className="flex min-h-[53px] items-center gap-3 rounded-lg border border-public-navy-line bg-public-panel px-2.5 text-sm font-semibold">
                  <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-public-navy text-public-ice">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </main>
      <footer className="flex min-h-[58px] items-center px-5 text-xs text-public-muted sm:justify-center lg:min-h-[50px]">
        ETL Flow · Plataforma ETL híbrida
      </footer>
    </div>
  );
}

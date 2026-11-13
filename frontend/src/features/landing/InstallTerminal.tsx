"use client";

import { useState } from "react";
import { Copy, Terminal } from "lucide-react";
import { Button } from "@/components/ui";

const commands = [
  "git clone https://github.com/XxCr1ss/python-etl-library-and-interface.git",
  "cd python-etl-library-and-interface",
  "pip install -r requirements.txt",
  "python etl_agent.py",
].join("\n");

export function InstallTerminal() {
  const [status, setStatus] = useState("");

  async function copyCommands() {
    try {
      await navigator.clipboard.writeText(commands);
      setStatus("Comandos copiados.");
    } catch {
      setStatus("No se pudieron copiar. Selecciona los comandos para copiarlos manualmente.");
    }
  }

  return (
    <div className="min-w-0 rounded-xl bg-public-navy p-4 text-public-light sm:p-5">
      <div className="flex items-center justify-between gap-3 border-b border-public-navy-line pb-2">
        <div className="flex items-center gap-2 font-mono text-xs">
          <Terminal size={17} className="text-public-ice" aria-hidden="true" />
          Terminal
        </div>
        <Button variant="ghost" size="sm" onClick={copyCommands} className="min-h-8 text-public-ice hover:bg-public-panel focus-visible:outline-public-ice">
          <Copy size={14} aria-hidden="true" /> Copiar
        </Button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap break-all font-mono text-[11px] leading-7 sm:text-[13px]">
        <code>{commands}</code>
      </pre>
      <p role="status" className="empty:hidden mt-2 text-xs text-public-ice">{status}</p>
    </div>
  );
}

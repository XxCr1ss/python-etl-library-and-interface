"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useDatabaseExtract } from "./hooks/useDatabaseExtract";
import { usePipelineSession } from "@/hooks/usePipelineSession";

type ExtractTab = "file" | "database" | "date_dimension";
const Context = createContext<{ database: ReturnType<typeof useDatabaseExtract>; activeTab: ExtractTab; setActiveTab: (tab: ExtractTab) => void } | null>(null);
export const useDatabaseExtractContext = () => useContext(Context);

function MemorySession({ children }: { children: ReactNode }) {
  const { agentId } = usePipelineSession();
  const database = useDatabaseExtract(true, agentId);
  const [activeTab, setActiveTab] = useState<ExtractTab>("file");
  return <Context.Provider value={{ database, activeTab, setActiveTab }}>{children}</Context.Provider>;
}

// This context stays mounted across ETL routes. Nothing is serialized to storage.
export function DatabaseExtractProvider({ children }: { children: ReactNode }) {
  const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    const reset = () => setEpoch(value => value + 1);
    window.addEventListener("etl:session-reset", reset);
    return () => window.removeEventListener("etl:session-reset", reset);
  }, []);
  return <MemorySession key={epoch}>{children}</MemorySession>;
}

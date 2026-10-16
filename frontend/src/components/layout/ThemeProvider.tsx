"use client";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { readTheme, writeTheme, type ThemePreference } from "./themeStorage";

const ThemeContext = createContext<{
  preference: ThemePreference; ready: boolean; storageWarning: boolean; setPreference: (value: ThemePreference) => void;
} | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setTheme] = useState<ThemePreference>("system");
  const [ready, setReady] = useState(false);
  const [storageWarning, setStorageWarning] = useState(false);
  useEffect(() => { setTheme(readTheme()); setReady(true); }, []);
  useEffect(() => {
    if (!ready) return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => document.documentElement.classList.toggle("dark", preference === "dark" || (preference === "system" && media.matches));
    apply(); media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [preference, ready]);
  return <ThemeContext.Provider value={{ preference, ready, storageWarning, setPreference: value => {
    setTheme(value); setStorageWarning(!writeTheme(value));
  } }}>{children}</ThemeContext.Provider>;
}
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("ThemeToggle requiere ThemeProvider.");
  return context;
}

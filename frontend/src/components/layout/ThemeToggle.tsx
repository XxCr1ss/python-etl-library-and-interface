"use client";
import { useId } from "react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { preference, ready, setPreference, storageWarning } = useTheme();
  const id = useId();
  return <div className="text-xs text-content">
    <label htmlFor={id} className="mr-2 font-medium">Tema</label>
    <select id={id} value={preference} disabled={!ready} onChange={event => {
      const value = event.target.value;
      if (value === "system" || value === "light" || value === "dark") setPreference(value);
    }} className="rounded-lg border border-line bg-surface px-2 py-2 text-sm text-content">
      <option value="system">Sistema</option><option value="light">Claro</option><option value="dark">Oscuro</option>
    </select>
    {storageWarning && <p role="status" className="mt-1 max-w-52">La preferencia se aplica en memoria; no pudo guardarse.</p>}
  </div>;
}

export type ThemePreference = "system" | "light" | "dark";
export const THEME_KEY = "etl_theme_preference";
export function readTheme(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch { return "system"; }
}
export function writeTheme(value: ThemePreference): boolean {
  try { window.localStorage.setItem(THEME_KEY, value); return true; } catch { return false; }
}
// Runs in <head> before body paint; the provider uses the same fallback.
export const themeInitScript = `(function(){var t='system';try{var v=localStorage.getItem('${THEME_KEY}');if(v==='light'||v==='dark')t=v;}catch(e){}var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);})();`;

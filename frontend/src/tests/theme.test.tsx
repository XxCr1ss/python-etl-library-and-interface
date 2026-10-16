import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { readTheme, THEME_KEY, themeInitScript } from "@/components/layout/themeStorage";
import { mockMedia } from "./media";

const ui = <ThemeProvider><ThemeToggle /></ThemeProvider>;
const darkQuery = "(prefers-color-scheme: dark)";
afterEach(() => document.documentElement.classList.remove("dark"));
describe("theme selection and pre-paint initialization", () => {
  it("system follows matchMedia changes, explicit light/dark overrides the system and listeners clean up", async () => {
    const media = mockMedia({ [darkQuery]: true }); const view = render(ui); const user = userEvent.setup();
    expect(screen.getByRole("combobox", { name: "Tema" })).toHaveValue("system"); expect(document.documentElement).toHaveClass("dark");
    act(() => media.change(darkQuery, false)); expect(document.documentElement).not.toHaveClass("dark");
    await user.selectOptions(screen.getByLabelText("Tema"), "dark"); expect(document.documentElement).toHaveClass("dark");
    act(() => media.change(darkQuery, false)); expect(document.documentElement).toHaveClass("dark");
    await user.selectOptions(screen.getByLabelText("Tema"), "light"); act(() => media.change(darkQuery, true)); expect(document.documentElement).not.toHaveClass("dark");
    await user.selectOptions(screen.getByLabelText("Tema"), "system"); expect(document.documentElement).toHaveClass("dark"); expect(localStorage.getItem(THEME_KEY)).toBe("system");
    view.unmount(); expect(media.listeners.get(darkQuery)?.size).toBe(0);
  });
  it.each(["light", "dark", "system"] as const)("%s preference survives remount and is applied by the head script before mount", async preference => {
    mockMedia({ [darkQuery]: true }); const view = render(ui); await userEvent.selectOptions(screen.getByLabelText("Tema"), preference);
    expect(readTheme()).toBe(preference); // The exact saved value is the only persisted preference.
    document.documentElement.classList.remove("dark"); new Function(themeInitScript)();
    expect(document.documentElement.classList.contains("dark")).toBe(preference !== "light");
    view.unmount(); render(ui); expect(screen.getByLabelText("Tema")).toHaveValue(preference);
  });
  it("blocked storage uses system initially and selected preference still works in memory", async () => {
    mockMedia({ [darkQuery]: false }); vi.spyOn(window, "localStorage", "get").mockImplementation(() => { throw new Error("blocked"); });
    expect(readTheme()).toBe("system"); expect(() => new Function(themeInitScript)()).not.toThrow();
    render(ui); await userEvent.selectOptions(screen.getByLabelText("Tema"), "dark");
    expect(document.documentElement).toHaveClass("dark"); expect(screen.getByRole("status")).toHaveTextContent(/en memoria/);
  });
  it("invalid storage preference falls back to system without rewriting it during hydration", () => {
    mockMedia({ [darkQuery]: true }); localStorage.setItem(THEME_KEY, "invalid"); render(ui);
    expect(screen.getByLabelText("Tema")).toHaveValue("system"); expect(localStorage.getItem(THEME_KEY)).toBe("invalid"); expect(document.documentElement).toHaveClass("dark");
  });
  it("server markup hydrates with a stored dark preference without recoverable mismatches", async () => {
    mockMedia(); localStorage.setItem(THEME_KEY, "dark"); const errors: unknown[] = [];
    const container = document.createElement("div"); container.innerHTML = renderToString(ui); document.body.appendChild(container);
    new Function(themeInitScript)(); expect(document.documentElement).toHaveClass("dark");
    let root!: ReturnType<typeof hydrateRoot>;
    await act(async () => { root = hydrateRoot(container, ui, { onRecoverableError: error => errors.push(error) }); });
    expect(withinTheme(container)).toBe("dark"); expect(errors).toEqual([]);
    act(() => root.unmount()); container.remove();
  });
});
function withinTheme(container: HTMLElement) { return container.querySelector("select")?.value; }

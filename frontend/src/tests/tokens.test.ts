import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const css = readFileSync(path.resolve(process.cwd(), "src/app/globals.css"), "utf8");

function luminance(hex: string) {
  const channels = hex.match(/[a-f\d]{2}/gi)!.map((channel) => {
    const s = parseInt(channel, 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
describe("contraste de tokens claros", () => {
  const colors = Object.fromEntries(Array.from(css.matchAll(/--ui-([\w-]+):\s*(#[\da-f]{6})/gi), (match) => [match[1], match[2]]));
  function contrast(foreground: string, background: string) {
    const a = luminance(colors[foreground]);
    const b = luminance(colors[background]);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }
  it("texto normal y estados alcanzan WCAG AA 4.5:1", () => {
    const onSurfaces = ["content", "content-muted", "action", "pipeline-pending", "pipeline-active", "pipeline-complete", "pipeline-blocked",
      "dtype-numeric", "dtype-text", "dtype-date", "dtype-boolean", "dtype-unknown"];
    for (const foreground of onSurfaces) {
      for (const background of ["surface", "surface-muted"]) expect(contrast(foreground, background), `${foreground}/${background}`).toBeGreaterThanOrEqual(4.5);
    }
    for (const state of ["success", "warning", "danger"]) expect(contrast(state, `${state}-surface`), state).toBeGreaterThanOrEqual(4.5);
    for (const background of ["action", "action-hover"]) expect(contrast("on-action", background), background).toBeGreaterThanOrEqual(4.5);
    expect(contrast("on-danger", "danger-solid")).toBeGreaterThanOrEqual(4.5);
  });
  it("foco y bordes de controles alcanzan 3:1 contra sus superficies", () => {
    for (const foreground of ["focus", "line"]) {
      for (const background of ["surface", "surface-muted"]) expect(contrast(foreground, background), `${foreground}/${background}`).toBeGreaterThanOrEqual(3);
    }
  });
});

import { vi } from "vitest";

// Only the native API is adapted. jsdom cannot prove top-layer inertness,
// geometry or the browser's focus containment; verify those in a browser.
export function mockDialogMethods() {
  const prototype = HTMLDialogElement.prototype;
  const previousShow = Object.getOwnPropertyDescriptor(prototype, "showModal");
  const previousClose = Object.getOwnPropertyDescriptor(prototype, "close");
  Object.defineProperty(prototype, "showModal", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  }) });
  Object.defineProperty(prototype, "close", { configurable: true, value: vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
  }) });
  return () => {
    if (previousShow) Object.defineProperty(prototype, "showModal", previousShow);
    else Reflect.deleteProperty(prototype, "showModal");
    if (previousClose) Object.defineProperty(prototype, "close", previousClose);
    else Reflect.deleteProperty(prototype, "close");
  };
}

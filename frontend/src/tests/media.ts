import { vi } from "vitest";

// jsdom has no matchMedia. Changes are explicit so listeners and cleanup are tested.
export function mockMedia(initial: Record<string, boolean> = {}) {
  const lists = new Map<string, MediaQueryList>();
  const listeners = new Map<string, Set<EventListener>>();
  vi.stubGlobal("matchMedia", (query: string) => {
    if (!lists.has(query)) {
      const handlers = new Set<EventListener>(); listeners.set(query, handlers);
      lists.set(query, {
        media: query, matches: initial[query] || false, onchange: null,
        addEventListener: (_: string, listener: EventListener) => handlers.add(listener),
        removeEventListener: (_: string, listener: EventListener) => handlers.delete(listener),
        addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList);
    }
    return lists.get(query)!;
  });
  return { change(query: string, matches: boolean) {
    const list = window.matchMedia(query);
    Object.defineProperty(list, "matches", { configurable: true, value: matches });
    listeners.get(query)?.forEach(listener => listener({ matches } as unknown as Event));
  }, listeners };
}

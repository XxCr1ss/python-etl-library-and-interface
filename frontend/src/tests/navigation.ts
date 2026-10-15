import { vi } from "vitest";

// Opt in with vi.mock("next/navigation", () => navigation) in each routing test.
export const router = {
  push: vi.fn(), replace: vi.fn(), prefetch: vi.fn(),
  back: vi.fn(), forward: vi.fn(), refresh: vi.fn(),
};
let pathname = "/dashboard";
let searchParams = new URLSearchParams();
export const navigation = {
  useRouter: () => router,
  usePathname: () => pathname,
  useSearchParams: () => searchParams,
};
export function resetNavigation(path = "/dashboard", query = "") {
  pathname = path;
  searchParams = new URLSearchParams(query);
  Object.values(router).forEach((mock) => mock.mockReset());
}

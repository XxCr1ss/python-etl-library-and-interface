import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "./src/tests/environment.ts",
    setupFiles: ["./src/tests/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["**/e2e/**", "**/.next/**", "**/node_modules/**"],
    env: { NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1" },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/tests/**", "src/**/*.test.{ts,tsx}", "src/**/*.d.ts", "src/**/e2e/**"],
    },
  },
});

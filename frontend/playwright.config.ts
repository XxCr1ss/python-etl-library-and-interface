import { defineConfig, devices } from "@playwright/test";
import { E2E_UPLOAD_DIR, requireRealTestDbConfig } from "./e2e/support/env";

const isCI = Boolean(process.env.CI);
const isRealMode =
  process.env.ETL_E2E_MODE === "real" ||
  process.argv.some((arg) => arg === "real" || arg.includes("project=real"));

// Workers load the configuration without the CLI --project argument.
process.env.ETL_E2E_MODE = isRealMode ? "real" : "mock";

if (isRealMode) {
  requireRealTestDbConfig();
}

const frontendPort = process.env.ETL_E2E_FRONTEND_PORT || "3100";
const baseURL = process.env.ETL_E2E_BASE_URL || `http://localhost:${frontendPort}`;

export default defineConfig({
  testDir: "./e2e",
  globalTeardown: "./e2e/support/teardown.ts",
  outputDir: `./test-results/${isRealMode ? "real" : "mock"}/artifacts`,
  preserveOutput: isRealMode ? "never" : "always",
  fullyParallel: !isRealMode,
  forbidOnly: isCI,
  updateSnapshots: "none",
  snapshotPathTemplate: "{testDir}/../visual-baselines/{platform}/{arg}{ext}",
  retries: isCI ? 1 : 0,
  workers: isRealMode ? 1 : (isCI ? 2 : 3),
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  reporter: isRealMode ? [["./e2e/support/safe-reporter.ts"]] : [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/mock" }],
    ["junit", { outputFile: "test-results/mock/junit.xml" }],
  ],
  use: {
    baseURL,
    // Real credentials must never enter traces, screenshots, videos or step reports.
    trace: isRealMode ? "off" : "retain-on-failure",
    video: "off",
    screenshot: isRealMode ? "off" : "only-on-failure",
    viewport: { width: 1440, height: 900 },
    actionTimeout: 10_000,
  },
  projects: [
    {
      name: "mock",
      testDir: "./e2e/mock",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: "real",
      testDir: "./e2e/real",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ].filter(project => project.name === (isRealMode ? "real" : "mock")),
  webServer: isRealMode
    ? [
        {
          command: "node ./e2e/support/start-backend.mjs",
          url: "http://127.0.0.1:8000/api/v1/health",
          timeout: 60_000,
          reuseExistingServer: false,
          env: {
            ...process.env,
            ETL_UPLOAD_DIR: E2E_UPLOAD_DIR,
            ETL_E2E_RUN_UPLOAD_DIR: E2E_UPLOAD_DIR,
            ETL_E2E_FRONTEND_PORT: frontendPort,
          },
        },
        {
          command: "node ./e2e/support/start-frontend.mjs",
          url: baseURL,
          timeout: 240_000,
          reuseExistingServer: false,
          env: {
            ...process.env,
            ETL_E2E_FRONTEND_PORT: frontendPort,
            NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
            ETL_E2E_PROFILE: "0",
          },
        },
      ]
    : [
        {
          command: "node ./e2e/support/start-frontend.mjs",
          url: baseURL,
          timeout: 240_000,
          reuseExistingServer: false,
          env: {
            ...process.env,
            ETL_E2E_FRONTEND_PORT: frontendPort,
            NEXT_PUBLIC_API_URL: "http://localhost:8000/api/v1",
            ETL_E2E_PROFILE: "1",
          },
        },
      ],
});

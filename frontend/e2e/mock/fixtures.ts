import path from "node:path";
import { test as base, expect, type Page, type Route } from "@playwright/test";
import contracts from "../../src/tests/fixtures/backend-contracts.json";

export { expect };

export const FIXTURES_DIR = path.resolve(__dirname, "../../src/tests/fixtures");
export const SAMPLE_SALES_CSV_PATH = path.join(FIXTURES_DIR, "sample_sales.csv");

export const salesRows = contracts.sales;
export const uploadContractResponse = contracts.uploadResponse;
export const previewContractResponse = contracts.previewResponse;

export interface MockStep {
  type: string;
  params: Record<string, unknown>;
}

export function buildTransformPreviewResponse(
  baseRows: Record<string, unknown>[],
  steps: MockStep[] = [],
  limit = 10,
) {
  let rows = baseRows.map((r) => ({ ...r }));
  let columns = rows.length > 0 ? Object.keys(rows[0]) : ["id", "cliente_id", "col_monto", "fecha", "activo", "etiquetas"];

  for (const step of steps) {
    if (step.type === "rename_columns") {
      const map = (step.params.columns || {}) as Record<string, string>;
      columns = columns.map((c) => map[c] ?? c);
      rows = rows.map((row) => {
        const next: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          next[map[k] ?? k] = v;
        }
        return next;
      });
    } else if (step.type === "prefix_header") {
      const prefix = String(step.params.prefix ?? "");
      columns = columns.map((c) => `${prefix}${c}`);
      rows = rows.map((row) => {
        const next: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(row)) {
          next[`${prefix}${k}`] = v;
        }
        return next;
      });
    } else if (step.type === "filter_value") {
      const col = String(step.params.column ?? "");
      if (!columns.includes(col)) {
        return {
          status: 400,
          body: { detail: `La columna ${col} no existe antes del filtro` },
        };
      }
      const val = step.params.value;
      const op = String(step.params.operator ?? "eq");
      rows = rows.filter((r) => {
        const cell = r[col];
        if (op === "gt") return Number(cell) > Number(val);
        if (op === "eq") return String(cell) === String(val);
        return true;
      });
    } else {
      throw new Error(`Operación sin contrato simulado declarado: ${step.type}`);
    }
  }

  const dtypes: Record<string, string> = {};
  for (const col of columns) {
    if (col === "id" || col === "cliente_id" || col === "col_monto" || col === "ingreso_total") {
      dtypes[col] = "int64";
    } else if (col === "activo") {
      dtypes[col] = "bool";
    } else {
      dtypes[col] = "str";
    }
  }

  return {
    status: 200,
    body: {
      status: "success",
      total_rows: rows.length,
      columns,
      dtypes,
      preview_data: rows.slice(0, limit),
    },
  };
}

export interface ApiMockController {
  onJson: (
    method: "GET" | "POST",
    endpointPath: string,
    responder: (request: {
      url: URL;
      method: string;
      json: () => unknown;
      rawText: () => string | null;
      route: Route;
    }) => Promise<{ status?: number; body: unknown } | unknown> | { status?: number; body: unknown } | unknown,
  ) => Promise<void>;
  onRoute: (
    method: "GET" | "POST",
    endpointPath: string,
    handler: (route: Route) => Promise<void> | void,
  ) => Promise<void>;
  unhandledRequests: string[];
  pageErrors: string[];
}

export const test = base.extend<{ mockApi: ApiMockController }>({
  mockApi: async ({ page }: { page: Page }, use) => {
    await page.clock.setFixedTime(new Date("2026-10-16T12:00:00Z"));
    const unhandledRequests: string[] = [];
    const pageErrors: string[] = [];

    page.on("pageerror", (err) => {
      pageErrors.push(err.message);
    });

    // Catch-all for any undeclared /api/v1/* call (registered first -> lowest priority in Playwright LIFO)
    await page.route("**/api/v1/**", async (route) => {
      const req = route.request();
      unhandledRequests.push(`${req.method()} ${req.url()}`);
      await route.fulfill({
        status: 599,
        contentType: "application/json",
        body: JSON.stringify({ detail: `Unhandled mock API request: ${req.method()} ${req.url()}` }),
      });
    });

    const controller: ApiMockController = {
      unhandledRequests,
      pageErrors,
      onRoute: async (method, endpointPath, handler) => {
        const pattern = `**/api/v1${endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`}`;
        await page.route(pattern, async (route) => {
          if (route.request().method().toUpperCase() !== method) {
            await route.fallback();
            return;
          }
          await handler(route);
        });
      },
      onJson: async (method, endpointPath, responder) => {
        await controller.onRoute(method, endpointPath, async (route) => {
          const req = route.request();
          const result = await responder({
            url: new URL(req.url()),
            method: req.method(),
            json: () => req.postDataJSON(),
            rawText: () => req.postData(),
            route,
          });
          if (
            result &&
            typeof result === "object" &&
            "body" in result &&
            ("status" in result || Object.keys(result).length <= 2)
          ) {
            const wrapped = result as { status?: number; body: unknown };
            await route.fulfill({
              status: wrapped.status ?? 200,
              contentType: "application/json",
              body: JSON.stringify(wrapped.body),
            });
          } else {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify(result),
            });
          }
        });
      },
    };

    await use(controller);

    expect(
      unhandledRequests,
      `Undeclared API requests detected: ${unhandledRequests.join(", ")}`,
    ).toEqual([]);
    expect(pageErrors, `Uncaught page errors detected: ${pageErrors.join(", ")}`).toEqual([]);
  },
});

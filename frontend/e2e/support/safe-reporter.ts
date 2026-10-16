import fs from "node:fs";
import path from "node:path";
import type { FullResult, Reporter, Suite, TestCase, TestResult } from "@playwright/test/reporter";

const escape = (text: string) => text.replace(/[<>&"']/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Real-profile reports use an allowlist, never raw errors, stdout, steps,
 * attachments, source, environment or browser network payloads. Synthetic mock
 * runs keep Playwright's full diagnostics. This boundary also covers failures. */
export default class SafeReporter implements Reporter {
  private suite?: Suite;
  constructor(private options: { outputDir?: string; quiet?: boolean } = {}) {}
  onBegin(_config: unknown, suite: Suite) { this.suite = suite; }
  onTestEnd(test: TestCase, result: TestResult) {
    if (!this.options.quiet) console.log(`[real] ${result.status}: ${path.basename(test.location.file)}:${test.location.line}`);
    if (!this.options.quiet && result.errors.length) {
      const location = result.errors[0].location;
      const stackLine = result.errors[0].stack?.match(/real-pipeline\.spec\.ts:(\d+)/)?.[1];
      console.log(`[real] Assertion line: ${location?.line ?? stackLine ?? "setup"}`);
      // Error categories are fixed strings; never include captured values.
      const message = result.errors[0].message ?? "";
      const category = /beforeAll|before all/i.test(message) ? "beforeAll" : /fixture/i.test(message) ? "fixture" : /JSON|Unexpected token/i.test(message) ? "JSON" : /Command failed/i.test(message) ? "SQL subprocess" : /timeout/i.test(message) ? "timeout" : /ReferenceError/i.test(message) ? "ReferenceError" : "assertion";
      console.log(`[real] Failure category: ${category}`);
    }
  }
  onStdOut() {}
  onStdErr() {}
  onError() { if (!this.options.quiet) console.error("[real] Error del runner. Consulte el resumen público."); }
  onEnd(result: FullResult) {
    const outputDir = this.options.outputDir ?? "test-results/real";
    fs.mkdirSync(outputDir, { recursive: true });
    const tests = this.suite?.allTests() ?? [];
    const rows = tests.flatMap(test => test.results.map(run => ({
      file: path.basename(test.location.file), line: test.location.line,
      status: run.status, durationMs: run.duration, retry: run.retry,
    })));
    const summary = { status: result.status, tests: tests.length, attempts: rows };
    fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
    const runnerFailure = result.status !== "passed" && rows.every(row => ["passed", "skipped"].includes(row.status));
    const cases = rows.map(row => `<testcase classname="${escape(row.file)}" name="line ${row.line}, attempt ${row.retry + 1}" time="${row.durationMs / 1000}">${row.status === "passed" ? "" : row.status === "skipped" ? "<skipped/>" : '<failure message="Falló la comprobación. Diagnóstico sensible omitido."/>'}</testcase>`).join("\n");
    const failures = rows.filter(row => !["passed", "skipped"].includes(row.status)).length + Number(runnerFailure);
    fs.writeFileSync(path.join(outputDir, "junit.xml"), `<?xml version="1.0" encoding="UTF-8"?><testsuites tests="${rows.length + Number(runnerFailure)}" failures="${failures}"><testsuite name="real" tests="${rows.length + Number(runnerFailure)}" failures="${failures}">${cases}${runnerFailure ? '<testcase name="runner"><failure message="Runner failed"/></testcase>' : ""}</testsuite></testsuites>`);
    fs.writeFileSync(path.join(outputDir, "index.html"), `<!doctype html><html lang="es"><meta charset="utf-8"><title>E2E Real</title><body><h1>E2E Real: ${escape(result.status)}</h1><p>Sin credenciales, payloads, pasos ni errores crudos.</p><pre>${escape(JSON.stringify(summary, null, 2))}</pre></body></html>`);
  }
}

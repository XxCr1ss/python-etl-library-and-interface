import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, expect, it } from "vitest";
import type { FullResult, Suite } from "@playwright/test/reporter";
import SafeReporter from "../../e2e/support/safe-reporter";
import { removeOwnedUpload } from "../../e2e/support/uploads";

const directories: string[] = [];
function temporary() { const dir = fs.mkdtempSync(path.join(os.tmpdir(), "etl-harness-test-")); directories.push(dir); return dir; }
afterEach(() => { for (const dir of directories.splice(0)) { for (const file of fs.readdirSync(dir)) fs.unlinkSync(path.join(dir, file)); fs.rmdirSync(dir); } });

it("expires only the registered upload and rejects neighbouring and outside files", () => {
  const root = temporary();
  const own = path.join(root, `${"a".repeat(32)}_source.csv`);
  const other = path.join(root, "neighbour.csv");
  fs.writeFileSync(own, "owned"); fs.writeFileSync(other, "keep");
  expect(() => removeOwnedUpload(root, other)).toThrow("ajeno");
  expect(() => removeOwnedUpload(root, path.join(root, "..", path.basename(own)))).toThrow("ajeno");
  removeOwnedUpload(root, own);
  expect(fs.existsSync(own)).toBe(false);
  expect(fs.readFileSync(other, "utf8")).toBe("keep");
});

it("failure reports exclude credentials in errors, step arguments, stdout and attachments", () => {
  const secret = "sentinel-never-publish-42";
  const root = temporary();
  const reporter = new SafeReporter({ outputDir: root, quiet: true });
  reporter.onBegin({}, { allTests: () => [{
    title: secret, location: { file: "/tests/real-pipeline.spec.ts", line: 10 },
    results: [{ status: "failed", duration: 42, retry: 0,
      errors: [{ message: secret }], stdout: [secret],
      steps: [{ title: `fill ${secret}` }], attachments: [{ body: Buffer.from(secret) }],
    }],
  }] } as unknown as Suite);
  reporter.onEnd({ status: "failed" } as FullResult);
  for (const filename of fs.readdirSync(root)) expect(fs.readFileSync(path.join(root, filename), "utf8")).not.toContain(secret);
  expect(fs.readFileSync(path.join(root, "junit.xml"), "utf8")).toContain("<failure");
  expect(JSON.parse(fs.readFileSync(path.join(root, "summary.json"), "utf8")).status).toBe("failed");
});

it("a runner failure before collection still produces a failing JUnit testcase", () => {
  const root = temporary();
  new SafeReporter({ outputDir: root, quiet: true }).onEnd({ status: "failed" } as FullResult);
  const xml = fs.readFileSync(path.join(root, "junit.xml"), "utf8");
  expect(xml).toContain('tests="1" failures="1"');
  expect(xml).toContain('testcase name="runner"');
});

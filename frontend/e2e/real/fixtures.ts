import fs from "node:fs";
import { test as base, expect } from "@playwright/test";
import { E2E_UPLOAD_DIR } from "../support/env";
import { removeOwnedUpload } from "../support/uploads";

export { expect };
export const test = base.extend<{ ownedUploads: Set<string> }>({
  ownedUploads: [async ({ page }, use) => {
    const files = new Set<string>();
    const pending: Promise<void>[] = [];
    page.on("response", response => {
      if (new URL(response.url()).pathname === "/api/v1/extract/upload" && response.ok()) {
        pending.push(response.json().then(body => { files.add(body.filepath); }));
      }
    });
    try { await use(files); }
    finally {
      await Promise.all(pending);
      for (const filename of Array.from(files)) removeOwnedUpload(E2E_UPLOAD_DIR, filename);
    }
  }, { auto: true }],
});

test.afterAll(() => {
  // Non-recursive: an untracked file must never be removed by cleanup.
  if (fs.existsSync(E2E_UPLOAD_DIR) && fs.readdirSync(E2E_UPLOAD_DIR).length === 0) fs.rmdirSync(E2E_UPLOAD_DIR);
});

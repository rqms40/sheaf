import { defineConfig, devices } from "@playwright/test";
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const e2eWorkspace = path.join(os.tmpdir(), `sheaf-e2e-${process.pid}`);
fs.mkdirSync(e2eWorkspace, { recursive: true });

const port = Number(process.env.SHEAF_E2E_PORT || 7421);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    headless: true,
    trace: "on-first-retry",
  },
  webServer: {
    command: `SHEAF_HOST=127.0.0.1 SHEAF_PORT=${port} SHEAF_WORKSPACE=${e2eWorkspace} pnpm --filter @sheaf/api start`,
    url: `${baseURL}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    cwd: process.cwd(),
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

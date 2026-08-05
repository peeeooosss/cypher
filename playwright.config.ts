import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (!e2eDatabaseUrl) {
  throw new Error("E2E_DATABASE_URL must point to an isolated test database before running Playwright");
}

export default defineConfig({
  testDir: "./tests",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      DIRECT_URL: e2eDatabaseUrl,
      NEXTAUTH_URL: baseURL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "e2e-only-secret",
    },
  },
});

import { defineConfig, devices } from "@playwright/test";

/**
 * E2E scaffold for critical admin flows.
 * Install deps: npm init playwright@latest (or add @playwright/test to angular-v22).
 * Run against local API + ng serve.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:4200",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});

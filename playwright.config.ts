import { defineConfig } from "@playwright/test";
const port = process.env.PLAYWRIGHT_PORT || "3000";
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({ testDir: "./tests/e2e", use: { baseURL }, webServer: { command: process.env.PLAYWRIGHT_PRODUCTION ? `npm run start -- --hostname 127.0.0.1 --port ${port}` : `npm run dev -- --hostname 127.0.0.1 --port ${port}`, url: `${baseURL}/login`, reuseExistingServer: !process.env.CI }, projects: [{ name: "chromium", use: { browserName: "chromium" } }] });

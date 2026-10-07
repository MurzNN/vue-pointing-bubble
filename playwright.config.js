import { defineConfig, devices } from '@playwright/test'

const PORT = 4180

export default defineConfig({
  testDir: 'tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    viewport: { width: 1000, height: 900 },
    trace: 'retain-on-failure'
  },
  // The installed Google Chrome, which GitHub's Ubuntu runners already have, so there is no browser to download.
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1000, height: 900 } } }
  ],
  // The tests run against the built demo page, the same one that is deployed to GitHub Pages.
  webServer: {
    command: `npm run build:demo && vite preview --config vite.demo.config.js --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
})

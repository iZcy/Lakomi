// @ts-check
const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  timeout: 300_000,
  retries: 0,
  fullyParallel: false,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    headless: false,
    actionTimeout: 30_000,
    navigationTimeout: 30_000,
    channel: 'chromium',
  },
  projects: [
    {
      name: 'e2e-connected',
      testMatch: /e2e-connected\.spec\.ts$/,
      use: {
        launchOptions: {
          executablePath: '/usr/bin/brave-browser',
          args: ['--remote-debugging-port=0'],
        },
      },
    },
  ],
})

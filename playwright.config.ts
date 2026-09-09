import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/console',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:4300',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 870 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'pnpm --filter @guide/console exec vite --host 127.0.0.1 --port 4300',
    env: {
      VITE_API_BASE_URL: '/api/v1',
    },
    url: 'http://127.0.0.1:4300',
    reuseExistingServer: false,
  },
})

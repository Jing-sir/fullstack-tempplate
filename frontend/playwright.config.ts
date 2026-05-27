import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
    testDir: './tests/e2e',
    // E2E runs against the production preview so dynamic imports match deploy output.
    // Keep the smoke suite serial because these tests share one preview webServer.
    fullyParallel: false,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 2 : 0,
    workers: 1,
    reporter: [['html', { open: 'never' }], ['list']],
    use: {
        baseURL: 'http://127.0.0.1:60001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
    },
    webServer: {
        command: 'pnpm run build && pnpm run preview -- --host 127.0.0.1 --port 60001',
        url: 'http://127.0.0.1:60001/login',
        reuseExistingServer: false,
        timeout: 120000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
})

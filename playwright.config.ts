// playwright.config.ts
// Chrome fake-media flags are the only reliable way to drive getUserMedia
// without a human at the mic. Source: maddevs.io 2024 writeup + Microsoft
// Playwright issue #27436.
//
// Per-test audio swap is done by spawning a fresh browser context in each
// spec with --use-file-for-fake-audio-capture=<abs_path>. Doing it globally
// breaks playback (per issue #27436), so do NOT set the file flag here.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,           // fake-audio playback doesn't survive parallel launches
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: process.env.PW_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    permissions: ['microphone'],
    launchOptions: {
      // These two are safe to set globally.
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
        '--autoplay-policy=no-user-gesture-required',
      ],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: process.env.PW_BASE_URL
    ? undefined
    : {
        command: 'node server.js',
        url: 'http://localhost:3000/healthz',
        timeout: 30_000,
        reuseExistingServer: !process.env.CI,
        env: {
          NODE_ENV: 'development',
          PORT: '3000',
          // Mock backends for the test run — the orb falls back to
          // Web Speech API for the verdict path, which is what these
          // tests exercise.
          WHISPER_URL: 'http://localhost:9999',
          ECAPA_URL: 'http://localhost:9999',
          ADMIN_TOKEN: 'test-token',
        },
      },
});

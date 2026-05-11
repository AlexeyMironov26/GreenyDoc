import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  webServer: [
    {
      command: 'npm run dev --prefix react',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'python backend/main.py',
      port: 8000,
      reuseExistingServer: !process.env.CI,
    }
  ],
});

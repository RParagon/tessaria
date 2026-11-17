import { defineConfig } from '@playwright/test';

// WebGL2 sem GPU: SwiftShader. Em ambientes com Chromium já instalado num
// caminho próprio, defina PW_CHROMIUM_PATH.
const launchOptions = {
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
};

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 240_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  grepInvert: process.env.SLOW ? undefined : /@slow/,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1000, height: 640 },
    trace: 'off',
    actionTimeout: 15_000,
    launchOptions,
  },
  webServer: {
    command: 'npx vite preview --outDir dist-test --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});

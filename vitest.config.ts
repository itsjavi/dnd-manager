import { defineConfig } from 'vitest/config'
import { playwright } from '@vitest/browser-playwright'

export default defineConfig({
  test: {
    coverage: {
      exclude: ['src/index.ts', 'tests/**/*.ts'],
    },
    projects: [
      {
        test: {
          name: 'unit',
          include: ['tests/unit/**/*.test.ts'],
          root: './',
          // setupFiles: ['dotenv/config'],
          environment: 'jsdom', // 'node' | 'jsdom' | 'happy-dom' | 'edge-runtime' | string
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.test.ts'],
          root: './',
          // setupFiles: ['dotenv/config'],
          browser: {
            enabled: true,
            provider: playwright() as any,
            // https://vitest.dev/config/browser/playwright
            instances: [{ browser: 'chromium' }],
          },
        },
      },
    ],
  },
})

import { mergeConfig } from 'vite';
import { defineConfig } from 'vitest/config';

import viteConfig from './vite.config';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      coverage: {
        exclude: [
          'src/**/*.test.{ts,tsx}',
          'src/app/main.tsx',
          'src/**/*.d.ts',
        ],
        include: ['src/**/*.{ts,tsx}'],
        provider: 'v8',
        reporter: ['text', 'html', 'json'],
        thresholds: {
          branches: 75,
          statements: 75,
        },
      },
      css: true,
      environment: 'jsdom',
      exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
      maxWorkers: 4,
      setupFiles: ['./tests/setup.ts'],
    },
  }),
);

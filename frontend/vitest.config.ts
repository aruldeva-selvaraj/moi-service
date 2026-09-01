import { defineConfig } from 'vitest/config';
import angular from '@analogjs/vitest-angular/plugin';

export default defineConfig({
  plugins: [angular()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/test-setup.ts'],
    include: ['src/**/*.spec.ts'],
    reporters: ['verbose'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      reportsDirectory: './coverage',
      include: [
        'src/app/core/models/**/*.ts',
        'src/app/core/services/**/*.ts',
        'src/app/shared/components/**/*.ts',
        'src/app/features/**/*.ts',
        'src/app/app.component.ts',
      ],
      exclude: [
        'src/app/**/*.spec.ts',
        'src/app/**/*.module.ts',
        'src/environments/**',
        'src/main.ts',
      ],
      thresholds: {
        lines: 100,
        functions: 100,
        branches: 100,
        statements: 100,
      },
    },
  },
});

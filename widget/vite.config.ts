import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: { jsx: { runtime: 'automatic', importSource: 'preact' } },
  build: {
    target: 'es2020',
    lib: {
      entry: 'src/main.ts',
      name: 'OpenGOV',
      formats: ['iife'],
      fileName: () => 'opengov.js',
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['test/unit/**/*.test.ts'],
  },
});

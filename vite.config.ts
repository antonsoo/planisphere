import { defineConfig } from 'vite';

export default defineConfig({
  base: '/planisphere/',
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

import { defineConfig } from 'vite';
import { contentSecurityPolicy } from './vite.csp.ts';

export default defineConfig({
  base: '/planisphere/',
  plugins: [contentSecurityPolicy()],
  build: {
    outDir: 'dist',
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

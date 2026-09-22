/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this project repo from a subpath matching the repo
// name: https://tdrowberry.github.io/Mahery/. The deploy workflow sets
// GH_PAGES_BASE; local dev/build/preview default to "/" so they're unaffected.
const base = process.env.GH_PAGES_BASE || '/';

export default defineConfig({
  base,
  plugins: [react()],
  server: { port: 5173, strictPort: true },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

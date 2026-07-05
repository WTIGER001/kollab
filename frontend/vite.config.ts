/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

try {
  process.env.VITE_COMMIT_HASH = execSync('git rev-parse --short HEAD').toString().trim();
} catch (e) {
  process.env.VITE_COMMIT_HASH = 'unknown';
}
try {
  const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
  process.env.VITE_APP_VERSION = pkg.version;
} catch (e) {
  process.env.VITE_APP_VERSION = '0.0.0';
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      'react-transition-group/TransitionGroupContext': 'react-transition-group/cjs/TransitionGroupContext.js',
    }
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    exclude: ['tests/**', 'node_modules/**'],
    server: {
      deps: {
        inline: ['@mui/material', '@mui/icons-material', '@mui/system', 'react-transition-group']
      }
    }
  },
})

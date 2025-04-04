import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Disable Fast Refresh to prevent React duplicate rendering in development
      fastRefresh: false
    })
  ],
  server: {
    port: 3001, // Standard port from the project specs
    hmr: {
      // Configure HMR for more stable updates
      overlay: false
    },
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Avoid potential rendering issues
  esbuild: {
    jsxInject: `import React from 'react'`
  },
  build: {
    // Improve the build process
    sourcemap: false,
    minify: 'terser',
    // Prevent duplicate bundling
    commonjsOptions: {
      include: [/node_modules/],
    }
  }
})
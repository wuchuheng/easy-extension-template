import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

import manifest from './src/manifest'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 5173,
      strictPort: true,
      hmr: {
        host: 'localhost',
        port: 5173,
        protocol: 'ws',
      },
    },
    build: {
      emptyOutDir: true,
      outDir: 'build',
      modulePreload: {
        polyfill: false,
      },
      rollupOptions: {
        input: {
          offscreen: path.resolve(__dirname, 'offscreen.html'),
        },
        output: {
          chunkFileNames: 'assets/chunk-[hash].js',
        },
      },
    },
    plugins: [tailwindcss(), crx({ manifest }), react()],
  }
})

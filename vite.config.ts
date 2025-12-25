import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './src/manifest'

export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development'

  return {
    plugins: [
      react(),
      crx({ manifest }),
    ],
    build: {
      sourcemap: isDevelopment,
      minify: isDevelopment ? false : 'esbuild',
      emptyOutDir: true
    },
    server: {
      hmr: isDevelopment
    }
  }
})

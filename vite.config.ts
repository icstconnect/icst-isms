import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { reticle } from '@reticlehq/vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), reticle()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

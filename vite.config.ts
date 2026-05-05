import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  base: '/wandering-archives/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

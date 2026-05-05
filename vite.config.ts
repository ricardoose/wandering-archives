import { defineConfig } from 'vite';

export default defineConfig({
  base: '/wandering-archives/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

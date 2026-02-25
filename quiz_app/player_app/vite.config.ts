import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'shared_types': path.resolve(__dirname, '../packages/shared_types/src/index.ts')
    }
  },
  server: {
    port: 5174
  }
})

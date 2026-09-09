import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  server: {
    middlewareMode: false,
  },
  resolve: {
    alias: {
      '/@admin-os/': path.resolve(__dirname, '../admin-os/'),
    },
  },
})

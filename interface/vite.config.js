import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const WEB_PORT = Number(process.env.VITE_WEB_PORT || 3000)

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: WEB_PORT,
    open: true,
    fs: {
      allow: ['..']
    }
  }
})

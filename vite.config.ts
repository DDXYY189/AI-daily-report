import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // GitHub Pages project sites are served under /<repository>/; other hosts
  // (Vercel, Netlify, custom domains) serve from the root.
  base:
    (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } })
      .process?.env?.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  server: {
    host: '127.0.0.1',
    port: 5273,
  },
})

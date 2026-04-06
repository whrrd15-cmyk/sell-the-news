import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/sell-the-news/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three') || id.includes('@react-three')) return 'vendor-three'
          if (id.includes('lightweight-charts')) return 'vendor-charts'
          if (id.includes('node_modules/motion') || id.includes('node_modules/framer-motion')) return 'vendor-motion'
          if (id.includes('node_modules/howler')) return 'vendor-howler'
          if (id.includes('node_modules/firebase')) return 'vendor-firebase'
          if (id.includes('node_modules/ogl')) return 'vendor-ogl'
          if (id.includes('src/data/events') || id.includes('src/data/specialEvents') || id.includes('src/data/breakingNews')) return 'game-data'
        },
      },
    },
  },
})

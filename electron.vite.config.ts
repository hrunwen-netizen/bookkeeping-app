import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ include: ['sql.js'] })],
    build: {
      outDir: 'out/main',
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: '[name].mjs',
        },
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        output: {
          format: 'es',
          entryFileNames: '[name].mjs',
        },
      },
    },
  },
  renderer: {
    root: 'src/renderer',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    build: {
      outDir: 'out/renderer',
    },
  },
})

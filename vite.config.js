import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediapipe_workaround } from './src/Utils/mediapipe-workaround';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [mediapipe_workaround()],
    }
  },
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
  },
});
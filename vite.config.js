import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { mediapipe_workaround } from './src/Utils/mediapipe-workaround';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [mediapipe_workaround()],
    },
  },
  // ... any other existing configuration
});



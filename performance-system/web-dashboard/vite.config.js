import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.API_URL || 'http://localhost:5000',
        changeOrigin: true,
        rewrite: path => path,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          utils: ['axios', 'date-fns'],
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
  },
});

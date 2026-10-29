import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3001,
  },
  build: {
    outDir: 'build',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 3001,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

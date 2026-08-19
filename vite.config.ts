import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@content': path.resolve(__dirname, './content'),
      '@data': path.resolve(__dirname, './data')
    }
  },
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/ollama': {
        target: 'https://ollama.com/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ''),
        headers: {
          'Origin': 'https://ollama.com'
        }
      },
      '/api/mistral': {
        target: 'https://api.mistral.ai/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mistral/, ''),
        headers: {
          'Origin': 'https://api.mistral.ai'
        }
      }
    }
  }
});

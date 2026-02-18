import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // <--- ¡ESTO ES LA CLAVE! (Punto y barra)
  build: {
    outDir: 'dist-web', // Aseguramos que la salida se llame dist-web
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
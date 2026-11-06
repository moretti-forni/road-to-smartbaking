import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [reactRouter()],
  server: { watch: { ignored: ['**/ios/**', '**/android/**'] } },
  resolve: { dedupe: ['react', 'react-dom'] },
  optimizeDeps: {
    noDiscovery: true,
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router',
      'react-i18next',
      'i18next',
      '@tanstack/react-query',
      'leaflet',
      'react-leaflet',
      'lucide-react',
      'zod',
      'axios',
    ],
  },
});

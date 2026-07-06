import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      allowedHosts: [
        'api.nexusdevhub.com',
        'ais-dev-6vrrtwlo4d3b7k6qh6nilv-202429707615.us-west2.run.app',
        'ais-pre-6vrrtwlo4d3b7k6qh6nilv-202429707615.us-west2.run.app',
        ...(process.env.ALLOWED_HOSTS ? process.env.ALLOWED_HOSTS.split(',') : [])
      ],
      // HMR is disabled in the environment via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5180 is the same one the prototype used, so existing links/scripts keep working.
export default defineConfig({
  plugins: [react()],
  // "@/…" = src/… (e.g. import { Globe } from "@/components/ui/globe")
  resolve: { alias: [{ find: /^@\//, replacement: '/src/' }] },
  // the app, and the onboarding / landing story pages (/landing-preview/, /onboarding-preview/) built with it
  build: { rollupOptions: { input: { main: 'index.html', landing: 'landing-preview/index.html', onboarding: 'onboarding-preview/index.html' } } },
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});

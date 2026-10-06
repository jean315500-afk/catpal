import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Port 5180 is the same one the prototype used, so existing links/scripts keep working.
export default defineConfig({
  plugins: [react()],
  server: { port: 5180, strictPort: true },
  preview: { port: 5180, strictPort: true },
});

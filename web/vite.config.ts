import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const seamsWebPort = Number.parseInt(process.env.SEAMS_WEB_PORT ?? '5173', 10);
const webPort = Number.isInteger(seamsWebPort) && seamsWebPort > 0 ? seamsWebPort : 5173;
const seamsServerPort = Number.parseInt(process.env.SEAMS_SERVER_PORT ?? '4444', 10);
const backendPort = Number.isInteger(seamsServerPort) && seamsServerPort > 0 ? seamsServerPort : 4444;
const backendHttpOrigin = `http://127.0.0.1:${backendPort}`;
const backendWsOrigin = `ws://127.0.0.1:${backendPort}`;
const rootAssetDirProxyPattern = '^/(images|img|media|static|fonts|videos?|audio)(?:/.*)?$';
const rootAssetFileProxyPattern = '^/(?!api(?:/|$)|ws(?:/|$)|assets(?:/|$)|@(?:vite|react-refresh)(?:/|$)|src(?:/|$)|node_modules(?:/|$)).+\\.(?:png|jpe?g|gif|svg|webp|avif|ico|bmp|pdf|mp4|webm|mov|mp3|wav|ogg|woff2?|ttf|otf|eot|json|txt|xml)$';

export default defineConfig({
  root: './web',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../web-dist',
    emptyOutDir: true,
  },
  server: {
    host: '127.0.0.1',
    port: webPort,
    strictPort: true,
    proxy: {
      '/api': backendHttpOrigin,
      '/ws': {
        target: backendWsOrigin,
        ws: true,
      },
      '/assets': backendHttpOrigin,
      [rootAssetDirProxyPattern]: backendHttpOrigin,
      [rootAssetFileProxyPattern]: backendHttpOrigin,
    },
  },
});

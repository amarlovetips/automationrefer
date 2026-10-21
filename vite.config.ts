import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy RRF Village API to prevent CORS blocks in browser
      '/proxy-rrf-api': {
        target: 'https://api.rrfvillage.xyz',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-rrf-api/, ''),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://quests.rrfvillage.xyz');
            proxyReq.setHeader('Referer', 'https://quests.rrfvillage.xyz/');
          });
        },
      },
      // Proxy Ronin Explorer API (balance fetch) — avoids CORS from browser
      '/proxy-ronin-explorer': {
        target: 'https://explorer.roninchain.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-ronin-explorer/, ''),
      },
      // Proxy Ronin Saigon Explorer API
      '/proxy-saigon-explorer': {
        target: 'https://saigon-explorer.roninchain.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-saigon-explorer/, ''),
      },
      // Proxy Ronin Mainnet RPC — for send/transfer transactions
      '/proxy-ronin-rpc': {
        target: 'https://api.roninchain.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-ronin-rpc/, '/rpc'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://app.roninchain.com');
            proxyReq.setHeader('Referer', 'https://app.roninchain.com/');
          });
        },
      },
      // Proxy Ronin Saigon Testnet RPC
      '/proxy-saigon-rpc': {
        target: 'https://saigon-testnet.roninchain.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy-saigon-rpc/, '/rpc'),
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            proxyReq.setHeader('Origin', 'https://saigon-app.roninchain.com');
            proxyReq.setHeader('Referer', 'https://saigon-app.roninchain.com/');
          });
        },
      },
    },
  },
})

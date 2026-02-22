import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      '/proxy/users': {
        target: 'http://localhost:8082',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/users/, ''),
      },
      '/proxy/accounts': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/accounts/, ''),
      },
      '/proxy/fund-transfers': {
        target: 'http://localhost:8085',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/fund-transfers/, ''),
      },
      '/proxy/transactions': {
        target: 'http://localhost:8084',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/transactions/, ''),
      },
      '/proxy/sequence': {
        target: 'http://localhost:8083',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/sequence/, ''),
      },
      '/proxy/gateway': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/gateway/, ''),
      },
      '/proxy/keycloak': {
        target: 'http://localhost:8571',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy\/keycloak/, ''),
      },
    },
  },
})


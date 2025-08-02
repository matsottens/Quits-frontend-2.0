import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      sourcemap: true,
      assetsDir: 'assets',
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envPrefix: 'VITE_',
    server: {
      port: 5173,
      strictPort: true, // Fail if port is already in use
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
          // The rewrite was removed to ensure the /api prefix is preserved
        },
        '/auth/google/callback/direct2': {
          target: 'https://api.quits.cc',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/auth\/google\/callback\/direct2/, '/api/auth/google/callback/direct2'),
        },
      },
      fs: {
        allow: ['..']
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Origin, Content-Type, Accept, Authorization',
      }
    },
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'https://api.quits.cc',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/auth/google/callback/direct2': {
          target: 'https://api.quits.cc',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/auth\/google\/callback\/direct2/, '/api/auth/google/callback/direct2'),
        },
      },
    },
    base: '/',
    publicDir: 'public',
    assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif', '**/*.ico'],
  }
})

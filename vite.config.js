import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { spawn } from 'child_process';
import http from 'http';

function backendServerPlugin() {
  return {
    name: 'taxpro-backend-server',
    configureServer() {
      const req = http.get('http://localhost:5000/api/health', (res) => {
        if (res.statusCode === 200) {
          console.log('[Vite Plugin] ✓ TaxPro backend server already online on port 5000');
        }
      });
      req.on('error', () => {
        console.log('[Vite Plugin] 🚀 Starting TaxPro backend server on port 5000...');
        const child = spawn('node', ['server/server.js'], { stdio: 'inherit', shell: true });
        process.on('exit', () => {
          try { child.kill(); } catch (e) {}
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), backendServerPlugin()],
  server: {
    port: 3000,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  preview: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  }
});

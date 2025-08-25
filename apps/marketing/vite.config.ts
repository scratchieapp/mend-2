import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from "path"
import { setupEnvFallback, createViteDefine } from "@mend/shared-utils"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Setup environment variable fallback
  const env = setupEnvFallback(__dirname, mode);
  
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5174,
      host: "::"
    },
    build: {
      outDir: '../../dist/marketing',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['lucide-react', '@radix-ui/react-slot'],
            utils: ['clsx', 'tailwind-merge']
          }
        }
      },
      chunkSizeWarningLimit: 600,
      target: 'esnext',
      reportCompressedSize: false
    },
    base: '/',
    // Define environment variables for the client
    define: {
      ...createViteDefine(env),
      // Ensure DEV and PROD are always available
      __DEV__: JSON.stringify(mode === 'development')
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'lucide-react']
    },
    // Make environment variables available to Vite
    envDir: __dirname,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_']
  };
})
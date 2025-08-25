import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { setupEnvFallback, createViteDefine } from "@mend/shared-utils";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Setup environment variable fallback
  const env = setupEnvFallback(__dirname, mode);
  
  return {
    server: {
      host: "::",
      port: 5173,
    },
    plugins: [
      react(),
      mode === 'development' &&
      componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ['mapbox-gl']
    },
    build: {
      outDir: '../../dist/operations',
      emptyOutDir: true
    },
    // Use different base path for dev vs production
    base: mode === 'development' ? '/' : '/operations/',
    // Define environment variables for the client
    define: {
      ...createViteDefine(env),
      // Ensure DEV and PROD are always available
      __DEV__: JSON.stringify(mode === 'development'),
    },
    // Make environment variables available to Vite
    envDir: __dirname,
    envPrefix: ['VITE_', 'NEXT_PUBLIC_', 'PUBLIC_']
  };
});

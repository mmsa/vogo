import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/popup/index.html"),
        options: resolve(__dirname, "src/options/index.html"),
        bg: resolve(__dirname, "src/bg/serviceWorker.ts"),
        detector: resolve(__dirname, "src/content/detector.ts")
      },
      output: {
        entryFileNames: (c) =>
          c.name === "bg" 
            ? "bg/serviceWorker.js" 
            : c.name === "detector" 
            ? "content/detector.js" 
            : "[name]/index.js",
        assetFileNames: (assetInfo) => {
          // Keep CSS in assets
          if (assetInfo.name?.endsWith('.css')) {
            return 'assets/[name]-[hash][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    },
    outDir: "dist",
    emptyOutDir: true
  },
  // Ensure HTML files are in the right place
  publicDir: "public",
  copyPublicDir: true
});


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { localDbPlugin } from "./vite-plugin-local-db.mjs";

export default defineConfig({
  server: {
    host: "::",
    port: 8001,
    headers: {
      "Cache-Control": "no-store",
    },
    watch: {
      ignored: ["**/implementação/**", "**/node_modules/**", "**/.git/**"],
    },
  },
  plugins: [localDbPlugin(), react()],
  optimizeDeps: {
    include: ["react", "react-dom/client", "react/jsx-runtime", "react/jsx-dev-runtime"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

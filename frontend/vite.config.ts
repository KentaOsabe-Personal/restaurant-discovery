import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: true,
    allowedHosts: ["macbook-air.tail6c3261.ts.net"],
    port: 5173,
    proxy: {
      "/api": {
        target: "http://backend:3000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
  },
});

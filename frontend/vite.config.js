import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    clearMocks: true,
  },
  server: {
    host: "127.0.0.1",
    proxy: {
      "/api": "http://localhost:5000",
    },
  },
});

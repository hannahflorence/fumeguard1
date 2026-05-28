import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Web workspace lives in /web, but shared .env is at repo root.
  envDir: "..",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
  },
});

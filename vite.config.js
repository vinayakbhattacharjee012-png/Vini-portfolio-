import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// base "./" keeps every asset path relative, so the same build works on any static host or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  build: {
    target: "es2020",
    rollupOptions: { input: { main: "index.html", "command-center": "command-center.html", features: "features.html" } },
  },
});

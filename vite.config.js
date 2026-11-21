import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// base "./" keeps every asset path relative, so the same build works on any static host or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  build: {
    target: "es2020",
    rollupOptions: { input: Object.fromEntries(["index", "command-center", "features", "work", "services", "galaxy", "contact"].map((n) => [n === "index" ? "main" : n, `${n}.html`])) },
  },
});

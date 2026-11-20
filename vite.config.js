import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";

// base "./" keeps every asset path relative, so the same build works on Netlify,
// Vercel or a GitHub Pages sub-path (/<repo>/) without changes.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind()],
  build: { target: "es2020" },
});

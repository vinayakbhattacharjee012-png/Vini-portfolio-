import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite";
import { transform } from "esbuild";

const PAGES = ["index", "command-center", "features", "work", "services", "galaxy", "contact", "brand"];

// Build only: inline the small shared theme CSS (one less request blocking first paint) and minify the
// inline <style> and classic <script> blocks the homepage is written in (esbuild keeps top-level names).
const inlineAndMinify = {
  name: "inline-and-minify",
  apply: "build",
  transformIndexHtml: {
    order: "post",
    async handler(html, { bundle }) {
      html = html.replace(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/g, (tag, file) => (bundle?.[file] ? `<style>${bundle[file].source}</style>` : tag));
      const jobs = [];
      html.replace(/<(style|script)((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/g, (all, tag, attrs, code) => {
        if (tag === "script" && /\b(src|type)=/.test(attrs)) return all; // modules, JSON-LD
        jobs.push(transform(code, { loader: tag === "style" ? "css" : "js", minify: true }).then((r) => [all, `<${tag}${attrs}>${r.code.trim()}</${tag}>`]));
        return all;
      });
      for (const [from, to] of await Promise.all(jobs)) html = html.replace(from, () => to);
      return html;
    },
  },
};

// base "./" keeps every asset path relative, so the same build works on any static host or sub-path.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwind(), inlineAndMinify],
  build: {
    target: "es2020",
    rollupOptions: {
      input: Object.fromEntries(PAGES.map((n) => [n === "index" ? "main" : n, `${n}.html`])),
      // React in its own file: it stays cached when only the site's content changes.
      output: { manualChunks: (id) => (/node_modules\/(react|react-dom|scheduler)\//.test(id) ? "react" : undefined) },
    },
  },
});

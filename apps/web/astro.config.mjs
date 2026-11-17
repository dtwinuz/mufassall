import { dirname } from "node:path";
import { createRequire } from "node:module";
import preact from "@astrojs/preact";
import { defineConfig } from "astro/config";

// The workspace packages import "react"; pnpm keeps preact out of their reach, so the
// compat aliases resolve from this app to absolute paths (one copy, no duplicates).
const require = createRequire(import.meta.url);
const preactRoot = dirname(require.resolve("preact/package.json"));
const compat = `${preactRoot}/compat`;

export default defineConfig({
  site: "https://mufassall.dtwin.uz",
  output: "static",
  trailingSlash: "always",
  // Preact with the React compat layer: same components, ~55 KB less JS per page
  integrations: [preact({ compat: true })],
  i18n: {
    defaultLocale: "uz",
    locales: ["uz", "ru", "en"],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  build: { inlineStylesheets: "never" },
  vite: {
    // keep fonts as files: inlined data: URIs bloat the CSS and defeat unicode-range subsetting
    build: { assetsInlineLimit: 0 },
    resolve: {
      alias: [
        { find: /^react\/jsx-(dev-)?runtime$/, replacement: `${preactRoot}/jsx-runtime/dist/jsxRuntime.mjs` },
        { find: /^react-dom\/(client|server)$/, replacement: `${compat}/$1.mjs` },
        { find: /^react(-dom)?$/, replacement: `${compat}/dist/compat.mjs` },
      ],
      dedupe: ["preact"],
    },
  },
});

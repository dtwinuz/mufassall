import react from "@astrojs/react";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://mufassall.dtwin.uz",
  output: "static",
  trailingSlash: "always",
  integrations: [react()],
  i18n: {
    defaultLocale: "uz",
    locales: ["uz", "ru", "en"],
    routing: { prefixDefaultLocale: true, redirectToDefaultLocale: false },
  },
  build: { inlineStylesheets: "never" },
  // keep fonts as files: inlined data: URIs bloat the CSS and defeat unicode-range subsetting
  vite: { build: { assetsInlineLimit: 0 } },
});

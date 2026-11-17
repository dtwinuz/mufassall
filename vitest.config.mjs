// The API (apps/api) has no dependencies and uses node:test; CI runs it with `node --test`.
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "apps/api/**"] },
});

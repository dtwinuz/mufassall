// Lets plain `node` run the repo's TypeScript sources: they use bundler-style imports
// (`./lab`, not `./lab.ts`), which Node's resolver rejects. Type stripping itself is native.
import { registerHooks } from "node:module";

const TRY = [".ts", ".tsx", "/index.ts"];

registerHooks({
  resolve(specifier, context, next) {
    try {
      return next(specifier, context);
    } catch (err) {
      const relative = specifier.startsWith("./") || specifier.startsWith("../");
      if (!relative || err?.code !== "ERR_MODULE_NOT_FOUND" || /\.[cm]?[jt]sx?$/.test(specifier)) throw err;
      for (const ext of TRY) {
        try {
          return next(specifier + ext, context);
        } catch {
          // try the next candidate
        }
      }
      throw err;
    }
  },
});

import { fileURLToPath } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { beastOctane } from "beast-tsrx/rsbuild";
import { beastDevtools } from "@beastjs/devtools/rsbuild";
import { beastPageBuilder } from "@beastjs/page-builder/rsbuild";
import { handleMeldApiRequest } from "./src/server/meld-api";

export default defineConfig({
  source: { entry: { index: "./src/main.ts" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  html: { template: "./index.html" },
  plugins: [pluginTailwindcss(), ...beastOctane({ octane: { profile: process.env.NODE_ENV !== "production" } }), beastDevtools(), beastPageBuilder()],
  server: {
    setup({ server }) {
      server.middlewares.use((req, res, next) => {
        handleMeldApiRequest(req, res).then((handled) => {
          if (!handled) next();
        }).catch(next);
      });
    },
  },
});

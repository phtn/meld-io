import { fileURLToPath } from "node:url";
import { defineConfig } from "@rsbuild/core";
import { pluginTailwindcss } from "@rsbuild/plugin-tailwindcss";
import { beastOctane } from "beast-tsrx/rsbuild";
import { beastDevtools } from "@beastjs/devtools/rsbuild";
import { beastPageBuilder } from "@beastjs/page-builder/rsbuild";

export default defineConfig({
  source: { entry: { index: "./src/main.ts" } },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  html: { template: "./index.html" },
  plugins: [pluginTailwindcss(), ...beastOctane({ octane: { profile: process.env.NODE_ENV !== "production" } }), beastDevtools(), beastPageBuilder()],
});

declare module "./vite-plugin-local-db.mjs" {
  import type { Plugin } from "vite";
  export function localDbPlugin(): Plugin;
}
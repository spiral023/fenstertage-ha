import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

const dev = !!process.env.ROLLUP_WATCH;

const banner =
  "// Fenstertage Card — bundled by Rollup. Edit sources in src/, then `npm run build`.";

const onwarn = (warning, warn) => {
  if (
    warning.code === "THIS_IS_UNDEFINED" &&
    warning.id?.includes("/node_modules/")
  ) {
    return;
  }
  warn(warning);
};

export default {
  input: "src/fenstertage-card.ts",
  output: {
    file: "custom_components/fenstertage/www/fenstertage-card.js",
    format: "es",
    sourcemap: dev,
    banner,
    inlineDynamicImports: true,
  },
  plugins: [
    nodeResolve(),
    commonjs(),
    typescript(),
    json(),
    !dev && terser({ format: { comments: /Fenstertage Card/ } }),
  ].filter(Boolean),
  onwarn,
};

import typescript from "rollup-plugin-typescript2"
import { nodeResolve } from "@rollup/plugin-node-resolve"
import commonjs from "@rollup/plugin-commonjs"

export default [
  {
    input: "src/index.ts",
    output: {
      file: "lib/esm/index.mjs",
      format: "esm",
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.esm.json",
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: [],
  },
  {
    input: "src/index.ts",
    output: {
      file: "lib/cjs/index.js",
      format: "cjs",
      sourcemap: true,
    },
    plugins: [
      nodeResolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.cjs.json",
        useTsconfigDeclarationDir: true,
      }),
    ],
    external: [],
  },
]

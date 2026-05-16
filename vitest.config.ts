import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Use the TS path aliases (`@/*`) defined in tsconfig.json
    tsconfigPaths: true,
  },
  test: {
    environment: "node",
    include: ["lib/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
    exclude: ["node_modules", ".next", "e2e"],
  },
});

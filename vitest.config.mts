import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Unit tests never load developer credentials. Database integration tests
    // must have a separate configuration with an explicit disposable database.
    setupFiles: ["./tests/setup.ts"],
  },
});
